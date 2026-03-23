import { useState, useEffect, useCallback } from 'react'
import { db } from '@/src/firebase'
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore'

export interface HealthMetricData {
  timestamp: Date
  value: number
  [key: string]: any
}

export interface HealthMetrics {
  blood_oxygen: HealthMetricData[]
  sleep: HealthMetricData[]
  stress: HealthMetricData[]
  hrv: HealthMetricData[]
  heart_rate: HealthMetricData[]
  steps: HealthMetricData[]
}

export interface MergedHealthData {
  date: string
  timestamp: Date
  blood_oxygen?: number
  sleep?: number
  stress?: number
  hrv?: number
  heart_rate?: number
  steps?: number
}

// Cache for storing fetched data
const dataCache = new Map<string, { data: HealthMetrics; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useHealthMetrics(userId: string | null) {
  const [metrics, setMetrics] = useState<HealthMetrics>({
    blood_oxygen: [],
    sleep: [],
    stress: [],
    hrv: [],
    heart_rate: [],
    steps: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const normalizeTimestamp = (timestamp: any): Date => {
    if (!timestamp) {
      // Default to today at midnight if no timestamp
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return today
    }
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate()
    }
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate()
    }
    if (timestamp instanceof Date) {
      return timestamp
    }
    if (typeof timestamp === 'string') {
      // Handle date strings like "2026-01-15"
      if (timestamp.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(timestamp + 'T00:00:00')
        if (!isNaN(date.getTime())) {
          return date
        }
      }
      // Try parsing as regular date string
      const date = new Date(timestamp)
      if (!isNaN(date.getTime())) {
        return date
      }
    }
    if (typeof timestamp === 'number') {
      // If it's a Unix timestamp in seconds, convert to milliseconds
      if (timestamp < 10000000000) {
        return new Date(timestamp * 1000)
      }
      return new Date(timestamp)
    }
    // Default to today at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }

  const extractValue = (doc: any, collectionName?: string): number => {
    // Try common value field names first
    if (doc.value !== undefined && doc.value !== null) {
      const num = Number(doc.value)
      if (!isNaN(num)) return num
    }
    
    // Collection-specific field names
    if (collectionName === 'blood_oxygen') {
      if (doc.bloodOxygen !== undefined && doc.bloodOxygen !== null) return Number(doc.bloodOxygen)
      if (doc.spo2 !== undefined && doc.spo2 !== null) return Number(doc.spo2)
      if (doc.oxygen !== undefined && doc.oxygen !== null) return Number(doc.oxygen)
    }
    if (collectionName === 'sleep') {
      if (doc.sleepHours !== undefined && doc.sleepHours !== null) return Number(doc.sleepHours)
      if (doc.hours !== undefined && doc.hours !== null) return Number(doc.hours)
      if (doc.duration !== undefined && doc.duration !== null) return Number(doc.duration)
    }
    if (collectionName === 'stress') {
      if (doc.stressLevel !== undefined && doc.stressLevel !== null) return Number(doc.stressLevel)
      if (doc.level !== undefined && doc.level !== null) return Number(doc.level)
    }
    if (collectionName === 'hrv') {
      if (doc.hrvValue !== undefined && doc.hrvValue !== null) return Number(doc.hrvValue)
      if (doc.hrv !== undefined && doc.hrv !== null) return Number(doc.hrv)
    }
    if (collectionName === 'heart_rate') {
      if (doc.heartRate !== undefined && doc.heartRate !== null) return Number(doc.heartRate)
      if (doc.bpm !== undefined && doc.bpm !== null) return Number(doc.bpm)
      if (doc.rate !== undefined && doc.rate !== null) return Number(doc.rate)
    }
    if (collectionName === 'steps') {
      if (doc.totalSteps !== undefined && doc.totalSteps !== null) return Number(doc.totalSteps)
      if (doc.steps !== undefined && doc.steps !== null) return Number(doc.steps)
      if (doc.count !== undefined && doc.count !== null) return Number(doc.count)
    }
    
    // Try to find any numeric field (excluding metadata fields)
    const excludeFields = ['id', 'timestamp', 'date', 'createdAt', 'updatedAt', 'created_at', 'updated_at']
    for (const key in doc) {
      if (excludeFields.includes(key)) continue
      if (typeof doc[key] === 'number' && !isNaN(doc[key])) {
        return doc[key]
      }
      if (typeof doc[key] === 'string') {
        const parsed = parseFloat(doc[key])
        if (!isNaN(parsed)) return parsed
      }
    }
    
    return 0
  }

  // Parse BleStepDetails string
  const parseBleStepDetails = (stepString: string): Array<{
    timeIndex: number
    hour: number
    minute: number
    calorie: number
    walkSteps: number
    distance: number
    runSteps: number
    totalSteps: number
  }> => {
    if (!stepString) return []
    
    // Convert to string if it's not already
    const str = String(stepString)
    if (!str || str.trim() === '') return []
    
    // Handle array format: "[BleStepDetails{...}, BleStepDetails{...}]"
    // Remove brackets if present
    const cleanedStr = str.trim().startsWith('[') && str.trim().endsWith(']')
      ? str.trim().slice(1, -1)
      : str.trim()
    
    const regex = /BleStepDetails\{year=(\d+), month=(\d+), day=(\d+), timeIndex=(\d+), calorie=(\d+), walkSteps=(\d+), distance=(\d+), runSteps=(\d+)\}/g
    const matches = []
    let match
    
    while ((match = regex.exec(cleanedStr)) !== null) {
      const timeIndex = parseInt(match[4])
      // Divide timeIndex by 4 to get hour in 24-hour format
      // Each timeIndex represents a 15-minute interval (4 per hour)
      const hour = Math.floor(timeIndex / 4)
      const minute = (timeIndex % 4) * 15
      
      const walkSteps = parseInt(match[6])
      const runSteps = parseInt(match[8])
      
      matches.push({
        timeIndex,
        hour,
        minute,
        calorie: parseInt(match[5]),
        walkSteps,
        distance: parseInt(match[7]),
        runSteps,
        totalSteps: walkSteps + runSteps,
      })
    }
    
    return matches
  }

  // Parse comma-separated values string
  const parseCommaSeparatedValues = (valueString: string): number[] => {
    if (!valueString || typeof valueString !== 'string') return []
    return valueString
      .split(',')
      .map(v => {
        // Handle pairs like "97-97" by taking first value
        if (v.includes('-')) {
          return parseFloat(v.split('-')[0])
        }
        return parseFloat(v.trim())
      })
      .filter(v => !isNaN(v) && v > 0) // Filter out NaN and zeros
  }

  // Parse sleep JSON string
  const parseSleepData = (sleepString: string): any => {
    if (!sleepString || typeof sleepString !== 'string') return null
    try {
      return JSON.parse(sleepString)
    } catch {
      return null
    }
  }

  const fetchCollection = useCallback(async (
    userId: string,
    collectionName: string
  ): Promise<HealthMetricData[]> => {
    try {
      const collectionRef = collection(db, 'users', userId, collectionName)
      
      // Try to order by timestamp if it exists
      let q
      try {
        q = query(collectionRef, orderBy('timestamp', 'desc'))
      } catch {
        // If timestamp doesn't exist or isn't indexed, fetch all
        q = collectionRef
      }
      
      const snapshot = await getDocs(q)
      
      const results: HealthMetricData[] = []
      
      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        
        // For Step_24 collection, document ID is often the date (e.g., "2026-01-15")
        // Get the base date from timestamp field or document ID
        let baseTimestamp = data.timestamp || data.date || data.createdAt || doc.id
        
        // If document ID is a date string (like "2026-01-15"), use it
        if (typeof doc.id === 'string' && doc.id.match(/^\d{4}-\d{2}-\d{2}$/)) {
          baseTimestamp = doc.id
        }
        
        // If it's a string like "2026-01-15", ensure it's parsed as a date at midnight
        if (typeof baseTimestamp === 'string' && baseTimestamp.match(/^\d{4}-\d{2}-\d{2}$/)) {
          baseTimestamp = new Date(baseTimestamp + 'T00:00:00')
        }
        const timestamp = normalizeTimestamp(baseTimestamp)
        
        // Ensure timestamp is set to start of day
        timestamp.setHours(0, 0, 0, 0)
        
        // Handle different data formats based on collection type
        if (collectionName === 'steps' || collectionName === 'Step_24') {
          // Try multiple field names for steps data
          // Look for any field that contains 'step' (case insensitive) or matches common patterns
          let stepDataField = ''
          
          // Check all possible field names (including document ID which might be the date)
          const possibleFields = [
            'steps_24',
            'Step_24',
            'steps',
            'Steps',
            'stepData',
            'step_data',
            'bleStepDetails',
            'BleStepDetails',
            doc.id, // Sometimes the data is stored with the document ID as the field name
          ]
          
          for (const fieldName of possibleFields) {
            if (data[fieldName] !== undefined && data[fieldName] !== null) {
              stepDataField = String(data[fieldName])
              break
            }
          }
          
          // If not found in common fields, search for any field containing 'step' or any string field
          if (!stepDataField) {
            for (const key in data) {
              // Skip metadata fields
              if (['id', 'timestamp', 'date', 'createdAt', 'updatedAt'].includes(key)) continue
              
              const value = data[key]
              // Check if it's a string that looks like BleStepDetails
              if (typeof value === 'string' && value.includes('BleStepDetails')) {
                stepDataField = value
                break
              }
              // Also check if key contains 'step'
              if (key.toLowerCase().includes('step') && typeof value === 'string') {
                stepDataField = value
                break
              }
            }
          }
          
          // If still not found, check if any field value is a string containing BleStepDetails
          if (!stepDataField) {
            for (const key in data) {
              const value = data[key]
              if (typeof value === 'string' && value.includes('BleStepDetails')) {
                stepDataField = value
                break
              }
            }
          }
          
          // Last resort: check if the document ID itself might be a field name
          // Sometimes the data structure has the date as a field containing the BleStepDetails
          if (!stepDataField && typeof doc.id === 'string') {
            // Try using document ID as field name (for cases where data is structured as { "2026-01-15": "BleStepDetails..." })
            const dateFieldValue = data[doc.id]
            if (dateFieldValue && typeof dateFieldValue === 'string' && dateFieldValue.includes('BleStepDetails')) {
              stepDataField = dateFieldValue
            }
          }
          
          // Parse the step data
          const stepDetails = parseBleStepDetails(stepDataField)
          
          if (stepDetails.length > 0) {
            // Create individual entries for each timeIndex
            stepDetails.forEach((step) => {
              // Create a new date object from the base timestamp to avoid mutation
              const stepTimestamp = new Date(timestamp.getTime())
              stepTimestamp.setHours(step.hour, step.minute, 0, 0)
              stepTimestamp.setSeconds(0, 0)
              
              results.push({
                timestamp: stepTimestamp,
                value: step.totalSteps,
                id: `${doc.id}_${step.timeIndex}`,
                timeIndex: step.timeIndex,
                hour: step.hour,
                minute: step.minute,
                calorie: step.calorie,
                walkSteps: step.walkSteps,
                runSteps: step.runSteps,
                distance: step.distance,
                ...data,
              })
            })
          } else {
            // Fallback: try to extract numeric step value
            const value = extractValue(data, collectionName)
            if (value > 0) {
              results.push({
                timestamp,
                value,
                id: doc.id,
                ...data,
              })
            } else {
              // Debug: log if we have data but couldn't parse it
              if (stepDataField) {
                console.warn(`Could not parse steps data. Field value preview:`, stepDataField.substring(0, 200))
              } else {
                // Log all field names to help debug
                console.warn(`No steps data found in document ${doc.id}. Available fields:`, Object.keys(data))
              }
            }
          }
        } else if (collectionName === 'blood_oxygen') {
          // Parse comma-separated blood oxygen values
          // Format: "97-97,99-99,99-99..." (24 values, one per hour)
          const bloodOxygenField = data.blood_oxygen || data.bloodOxygen || data.spo2 || ''
          const values = parseCommaSeparatedValues(bloodOxygenField)
          
          if (values.length > 0) {
            // Map to 24 hours (one value per hour, starting at hour 0)
            values.forEach((value, index) => {
              if (index >= 24) return // Safety check
              
              // Create a new date object to avoid mutation
              const hourTimestamp = new Date(timestamp.getTime())
              hourTimestamp.setHours(index, 0, 0, 0)
              hourTimestamp.setMinutes(0, 0, 0)
              hourTimestamp.setSeconds(0, 0)
              
              results.push({
                timestamp: hourTimestamp,
                value,
                id: `${doc.id}_${index}`,
                hour: index,
                minute: 0,
                ...data,
              })
            })
          } else {
            // Fallback
            const value = extractValue(data, collectionName)
            if (value > 0) {
              results.push({
                timestamp,
                value,
                id: doc.id,
                ...data,
              })
            }
          }
        } else if (collectionName === 'heart_rate') {
          // Parse comma-separated heart rate values (288 values = 24 hours × 12 five-minute intervals)
          const heartRateField = data.heart_rate || data.heartRate || data.bpm || ''
          const values = parseCommaSeparatedValues(heartRateField)
          
          if (values.length > 0) {
            // Map to 5-minute intervals (12 per hour, starting at :00, :05, :10, etc.)
            values.forEach((value, index) => {
              const hour = Math.floor(index / 12)
              const minute = (index % 12) * 5
              
              if (hour >= 24) return // Safety check
              
              // Create a new date object to avoid mutation
              const intervalTimestamp = new Date(timestamp.getTime())
              intervalTimestamp.setHours(hour, minute, 0, 0)
              intervalTimestamp.setSeconds(0, 0)
              
              results.push({
                timestamp: intervalTimestamp,
                value,
                id: `${doc.id}_${index}`,
                hour,
                minute,
                intervalIndex: index,
                ...data,
              })
            })
          } else {
            // Fallback
            const value = extractValue(data, collectionName)
            if (value > 0) {
              results.push({
                timestamp,
                value,
                id: doc.id,
                ...data,
              })
            }
          }
        } else if (collectionName === 'hrv') {
          // Parse comma-separated HRV values (48 values = 24 hours × 2 thirty-minute intervals)
          const hrvField = data.hrv || data.hrvValue || ''
          const values = parseCommaSeparatedValues(hrvField)
          
          if (values.length > 0) {
            // Map to 30-minute intervals (2 per hour: :00 and :30)
            values.forEach((value, index) => {
              const hour = Math.floor(index / 2)
              const minute = (index % 2) * 30
              
              if (hour >= 24) return // Safety check
              
              // Create a new date object to avoid mutation
              const intervalTimestamp = new Date(timestamp.getTime())
              intervalTimestamp.setHours(hour, minute, 0, 0)
              intervalTimestamp.setSeconds(0, 0)
              
              results.push({
                timestamp: intervalTimestamp,
                value,
                id: `${doc.id}_${index}`,
                hour,
                minute,
                intervalIndex: index,
                ...data,
              })
            })
          } else {
            // Fallback
            const value = extractValue(data, collectionName)
            if (value > 0) {
              results.push({
                timestamp,
                value,
                id: doc.id,
                ...data,
              })
            }
          }
        } else if (collectionName === 'stress') {
          // Parse comma-separated stress values (48 values = 24 hours × 2 thirty-minute intervals)
          const stressField = data.stress || data.stressLevel || ''
          const values = parseCommaSeparatedValues(stressField)
          
          if (values.length > 0) {
            // Map to 30-minute intervals (2 per hour: :00 and :30)
            values.forEach((value, index) => {
              const hour = Math.floor(index / 2)
              const minute = (index % 2) * 30
              
              if (hour >= 24) return // Safety check
              
              // Create a new date object to avoid mutation
              const intervalTimestamp = new Date(timestamp.getTime())
              intervalTimestamp.setHours(hour, minute, 0, 0)
              intervalTimestamp.setSeconds(0, 0)
              
              results.push({
                timestamp: intervalTimestamp,
                value,
                id: `${doc.id}_${index}`,
                hour,
                minute,
                intervalIndex: index,
                ...data,
              })
            })
          } else {
            // Fallback
            const value = extractValue(data, collectionName)
            if (value > 0) {
              results.push({
                timestamp,
                value,
                id: doc.id,
                ...data,
              })
            }
          }
        } else if (collectionName === 'sleep') {
          // Parse sleep JSON
          const sleepField = data.sleep || data.sleepData || ''
          const sleepData = typeof sleepField === 'string' ? parseSleepData(sleepField) : sleepField
          
          if (sleepData && sleepData.totalSleepDuration) {
            // Convert totalSleepDuration (seconds) to hours
            const sleepHours = sleepData.totalSleepDuration / 3600
            
            // Create entry for the sleep period
            if (sleepData.sleepTime && sleepData.wakeTime) {
              const sleepStart = new Date(sleepData.sleepTime * 1000)
              const sleepEnd = new Date(sleepData.wakeTime * 1000)
              
              // Create hourly entries during sleep period
              const startHour = sleepStart.getHours()
              const endHour = sleepEnd.getHours()
              
              for (let hour = startHour; hour <= endHour; hour++) {
                const hourTimestamp = new Date(timestamp)
                hourTimestamp.setHours(hour, 0, 0, 0)
                
                // Distribute sleep hours across the sleep period
                const hoursInPeriod = endHour - startHour + 1
                const sleepPerHour = sleepHours / hoursInPeriod
                
                results.push({
                  timestamp: hourTimestamp,
                  value: sleepPerHour,
                  id: `${doc.id}_${hour}`,
                  hour,
                  totalSleepDuration: sleepData.totalSleepDuration,
                  shallowDuration: sleepData.shallowDuration,
                  deepDuration: sleepData.deepDuration,
                  awakeDuration: sleepData.awakeDuration,
                  rapidDuration: sleepData.rapidDuration,
                  sleepStart: sleepStart.toISOString(),
                  sleepEnd: sleepEnd.toISOString(),
                  ...data,
                })
              }
            } else {
              // Fallback: use total sleep duration
              results.push({
                timestamp,
                value: sleepHours,
                id: doc.id,
                totalSleepDuration: sleepData.totalSleepDuration,
                ...data,
              })
            }
          } else {
            // Fallback
            const value = extractValue(data, collectionName)
            if (value > 0) {
              results.push({
                timestamp,
                value,
                id: doc.id,
                ...data,
              })
            }
          }
        } else {
          // Default handling for other collections
          const value = extractValue(data, collectionName)
          if (value > 0) {
            results.push({
              timestamp,
              value,
              id: doc.id,
              ...data,
            })
          }
        }
      })
      
      return results
    } catch (err: any) {
      console.warn(`Error fetching ${collectionName}:`, err.message)
      return []
    }
  }, [])

  useEffect(() => {
    const fetchAllMetrics = async () => {
      if (!userId) {
        setLoading(false)
        return
      }

      // Check cache first
      const cacheKey = `health_metrics_${userId}`
      const cached = dataCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setMetrics(cached.data)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const decodedUserId = decodeURIComponent(userId)
        
        // Fetch all collections in parallel
        // Try both 'steps' and 'Step_24' collection names for steps
        const [bloodOxygen, sleep, stress, hrv, heartRate, stepsFromSteps, stepsFromStep24] = await Promise.all([
          fetchCollection(decodedUserId, 'blood_oxygen'),
          fetchCollection(decodedUserId, 'sleep'),
          fetchCollection(decodedUserId, 'stress'),
          fetchCollection(decodedUserId, 'hrv'),
          fetchCollection(decodedUserId, 'heart_rate'),
          fetchCollection(decodedUserId, 'steps'),
          fetchCollection(decodedUserId, 'Step_24'),
        ])
        
        // Combine steps from both collections (one will likely be empty)
        const steps = [...stepsFromSteps, ...stepsFromStep24]

        const metricsData: HealthMetrics = {
          blood_oxygen: bloodOxygen,
          sleep: sleep,
          stress: stress,
          hrv: hrv,
          heart_rate: heartRate,
          steps: steps,
        }

        // Cache the data
        dataCache.set(cacheKey, {
          data: metricsData,
          timestamp: Date.now(),
        })

        setMetrics(metricsData)
      } catch (err: any) {
        console.error('Error fetching health metrics:', err)
        setError(err.message || 'Failed to fetch health metrics')
      } finally {
        setLoading(false)
      }
    }

    fetchAllMetrics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]) // Removed fetchCollection from deps as it's stable

  // Function to merge all metrics by date
  const mergeMetricsByDate = useCallback((
    startDate?: Date,
    endDate?: Date
  ): MergedHealthData[] => {
    // Use a Map to track all values per metric per day for proper averaging
    const dailyValues = new Map<string, {
      timestamp: Date
      values: {
        blood_oxygen: number[]
        sleep: number[]
        stress: number[]
        hrv: number[]
        heart_rate: number[]
        steps: number[]
      }
    }>()

    // Helper to normalize date and get date key
    const normalizeToDate = (date: any): Date => {
      if (!date) return new Date()
      if (date instanceof Date) return date
      if (date.toDate && typeof date.toDate === 'function') {
        return date.toDate()
      }
      if (typeof date === 'string' || typeof date === 'number') {
        return new Date(date)
      }
      return new Date()
    }

    // Helper to get date key
    const getDateKey = (date: any): string => {
      const normalizedDate = normalizeToDate(date)
      return normalizedDate.toISOString().split('T')[0] // YYYY-MM-DD
    }

    // Process each metric type and collect all values
    Object.entries(metrics).forEach(([metricType, data]) => {
      data.forEach((item: HealthMetricData) => {
        const normalizedTimestamp = normalizeToDate(item.timestamp)
        const dateKey = getDateKey(normalizedTimestamp)
        
        // Apply date filter if provided
        if (startDate && normalizedTimestamp < startDate) return
        if (endDate && normalizedTimestamp > endDate) return

        if (!dailyValues.has(dateKey)) {
          dailyValues.set(dateKey, {
            timestamp: normalizedTimestamp,
            values: {
              blood_oxygen: [],
              sleep: [],
              stress: [],
              hrv: [],
              heart_rate: [],
              steps: [],
            },
          })
        }

        const dayData = dailyValues.get(dateKey)!
        const metricKey = metricType as keyof typeof dayData.values
        if (dayData.values[metricKey]) {
          dayData.values[metricKey].push(item.value)
        }
      })
    })

    // Convert to MergedHealthData array with proper averaging
    return Array.from(dailyValues.entries())
      .map(([dateKey, dayData]) => {
        const merged: MergedHealthData = {
          date: dateKey,
          timestamp: dayData.timestamp,
        }

        // Calculate averages (or sum for steps)
        Object.entries(dayData.values).forEach(([metricType, values]) => {
          if (values.length === 0) return
          
          if (metricType === 'steps') {
            merged.steps = values.reduce((a: number, b: number) => a + b, 0)
          } else {
            const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length
            const key = metricType as keyof MergedHealthData
            if (key !== 'date' && key !== 'timestamp') {
              (merged as any)[key] = avg
            }
          }
        })

        return merged
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }, [metrics])

  // Function to get data for a specific day
  const getDayData = useCallback((date: Date): MergedHealthData | null => {
    if (!date || !(date instanceof Date)) return null
    const dateKey = date.toISOString().split('T')[0]
    const merged = mergeMetricsByDate()
    return merged.find((d) => d.date === dateKey) || null
  }, [mergeMetricsByDate])

  // Function to get daily stats for a specific day
  const getDailyStats = useCallback((date: Date) => {
    if (!date || !(date instanceof Date)) return null
    
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const stats: any = {
      blood_oxygen: { values: [], min: null, max: null, avg: null },
      sleep: { values: [], total: null, stages: null },
      stress: { values: [], avg: null, peaks: [] },
      hrv: { values: [], trend: null },
      heart_rate: { values: [], resting: null, avg: null, peak: null },
      steps: { values: [], total: null },
    }

    // Helper to normalize timestamp
    const normalizeToDate = (timestamp: any): Date => {
      if (!timestamp) return new Date()
      if (timestamp instanceof Date) return timestamp
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate()
      }
      if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        return new Date(timestamp)
      }
      return new Date()
    }

    Object.entries(metrics).forEach(([metricType, data]) => {
      const dayData = data.filter((item: HealthMetricData) => {
        const itemDate = normalizeToDate(item.timestamp)
        return itemDate >= startOfDay && itemDate <= endOfDay
      })

      if (dayData.length === 0) return

      const values = dayData.map((d: HealthMetricData) => d.value).filter((v: number) => !isNaN(v))

      switch (metricType) {
        case 'blood_oxygen':
          stats.blood_oxygen.values = values
          stats.blood_oxygen.min = Math.min(...values)
          stats.blood_oxygen.max = Math.max(...values)
          stats.blood_oxygen.avg = values.reduce((a: number, b: number) => a + b, 0) / values.length
          break
        case 'sleep':
          stats.sleep.values = values
          stats.sleep.total = values.reduce((a: number, b: number) => a + b, 0)
          break
        case 'stress':
          stats.stress.values = values
          stats.stress.avg = values.reduce((a: number, b: number) => a + b, 0) / values.length
          stats.stress.peaks = values.filter((v: number) => v > stats.stress.avg * 1.5)
          break
        case 'hrv':
          stats.hrv.values = values
          if (values.length > 1) {
            stats.hrv.trend = values[values.length - 1] > values[0] ? 'up' : 'down'
          }
          break
        case 'heart_rate':
          stats.heart_rate.values = values
          stats.heart_rate.resting = Math.min(...values)
          stats.heart_rate.avg = values.reduce((a: number, b: number) => a + b, 0) / values.length
          stats.heart_rate.peak = Math.max(...values)
          break
        case 'steps':
          stats.steps.values = values
          stats.steps.total = values.reduce((a: number, b: number) => a + b, 0)
          break
      }
    })

    return stats
  }, [metrics])

  return {
    metrics,
    loading,
    error,
    mergeMetricsByDate,
    getDayData,
    getDailyStats,
  }
}

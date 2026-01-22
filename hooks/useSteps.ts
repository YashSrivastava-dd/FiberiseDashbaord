import { useState, useEffect } from 'react'
import { db } from '@/src/firebase'
import { collection, getDocs } from 'firebase/firestore'

// Parse BleStepDetails string
function parseBleStepDetails(stepString: string) {
  if (!stepString || typeof stepString !== 'string') return []
  
  const regex = /BleStepDetails\{year=(\d+), month=(\d+), day=(\d+), timeIndex=(\d+), calorie=(\d+), walkSteps=(\d+), distance=(\d+), runSteps=(\d+)\}/g
  const matches = []
  let match
  
  while ((match = regex.exec(stepString)) !== null) {
    matches.push({
      year: parseInt(match[1]),
      month: parseInt(match[2]),
      day: parseInt(match[3]),
      timeIndex: parseInt(match[4]),
      calorie: parseInt(match[5]),
      walkSteps: parseInt(match[6]),
      distance: parseInt(match[7]),
      runSteps: parseInt(match[8]),
    })
  }
  
  return matches
}

export function useSteps(userId: string | null) {
  const [steps, setSteps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchSteps = async () => {
      try {
        setLoading(true)
        setError(null)
        const stepsRef = collection(db, 'users', userId, 'Step_24')
        const snapshot = await getDocs(stepsRef)
        
        // Parse step data for each document
        const parsedSteps = snapshot.docs.map((doc) => {
          const data = doc.data()
          const stepData = parseBleStepDetails(data.Step_24 || data[Object.keys(data).find((k: string) => k.includes('Step'))] || '')
          return {
            id: doc.id,
            ...data,
            stepData,
            totalSteps: stepData.reduce((sum: number, s: any) => sum + s.walkSteps + s.runSteps, 0),
            totalCalories: stepData.reduce((sum: number, s: any) => sum + s.calorie, 0) / 1000,
            totalDistance: stepData.reduce((sum: number, s: any) => sum + s.distance, 0),
          }
        })
        
        setSteps(parsedSteps)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch steps')
      } finally {
        setLoading(false)
      }
    }
    fetchSteps()
  }, [userId])

  return { steps, loading, error }
}

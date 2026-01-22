'use client'

import { useMemo, memo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { HealthMetricData } from '@/hooks/useHealthMetrics'
import { X, Clock, Calendar } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface HourlyDataViewProps {
  date: Date
  allMetrics: {
    blood_oxygen: HealthMetricData[]
    sleep: HealthMetricData[]
    stress: HealthMetricData[]
    hrv: HealthMetricData[]
    heart_rate: HealthMetricData[]
    steps: HealthMetricData[]
  }
  onClose: () => void
}

function HourlyDataViewComponent({ date, allMetrics, onClose }: HourlyDataViewProps) {
  // Get start and end of the selected day
  const startOfDay = useMemo(() => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }, [date])

  const endOfDay = useMemo(() => {
    const d = new Date(date)
    d.setHours(23, 59, 59, 999)
    return d
  }, [date])

  // Filter data for the selected day
  const dayData = useMemo(() => {
    const normalizeDate = (timestamp: any): Date => {
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

    const filtered: typeof allMetrics = {
      blood_oxygen: [],
      sleep: [],
      stress: [],
      hrv: [],
      heart_rate: [],
      steps: [],
    }

    Object.entries(allMetrics).forEach(([metricType, data]) => {
      filtered[metricType as keyof typeof allMetrics] = data.filter((item) => {
        const itemDate = normalizeDate(item.timestamp)
        return itemDate >= startOfDay && itemDate <= endOfDay
      })
    })

    return filtered
  }, [allMetrics, startOfDay, endOfDay])

  // Group data by hour
  const hourlyData = useMemo(() => {
    type HourData = {
      hour: number
      blood_oxygen: number[]
      sleep: number[]
      stress: number[]
      hrv: number[]
      heart_rate: number[]
      steps: number[]
      timestamps: Date[]
    }

    const hours: Record<number, HourData> = {}

    // Initialize all 24 hours
    for (let i = 0; i < 24; i++) {
      hours[i] = {
        hour: i,
        blood_oxygen: [],
        sleep: [],
        stress: [],
        hrv: [],
        heart_rate: [],
        steps: [],
        timestamps: [],
      }
    }

    // Group data by hour
    Object.entries(dayData).forEach(([metricType, data]) => {
      data.forEach((item) => {
        const itemDate = item.timestamp instanceof Date 
          ? item.timestamp 
          : new Date(item.timestamp)
        const hour = itemDate.getHours()
        
        if (hour >= 0 && hour < 24 && hours[hour]) {
          // Type-safe access to the metric array
          const metricKey = metricType as keyof Omit<HourData, 'hour' | 'timestamps'>
          if (metricKey in hours[hour] && Array.isArray(hours[hour][metricKey])) {
            (hours[hour][metricKey] as number[]).push(item.value)
          }
          if (!hours[hour].timestamps.find(t => t.getTime() === itemDate.getTime())) {
            hours[hour].timestamps.push(itemDate)
          }
        }
      })
    })

    return hours
  }, [dayData])

  // Prepare chart data for hourly view
  const chartData = useMemo(() => {
    const labels = Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, '0')
      return `${hour}:00`
    })

    const datasets = []

    // Blood Oxygen
    if (dayData.blood_oxygen.length > 0) {
      datasets.push({
        label: 'Blood Oxygen (%)',
        data: Array.from({ length: 24 }, (_, i) => {
          const values = hourlyData[i]?.blood_oxygen || []
          return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null
        }),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      })
    }

    // Sleep
    if (dayData.sleep.length > 0) {
      datasets.push({
        label: 'Sleep (hours)',
        data: Array.from({ length: 24 }, (_, i) => {
          const values = hourlyData[i]?.sleep || []
          return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null
        }),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
      })
    }

    // Stress
    if (dayData.stress.length > 0) {
      datasets.push({
        label: 'Stress Level',
        data: Array.from({ length: 24 }, (_, i) => {
          const values = hourlyData[i]?.stress || []
          return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null
        }),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      })
    }

    // HRV
    if (dayData.hrv.length > 0) {
      datasets.push({
        label: 'HRV (ms)',
        data: Array.from({ length: 24 }, (_, i) => {
          const values = hourlyData[i]?.hrv || []
          return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null
        }),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      })
    }

    // Heart Rate
    if (dayData.heart_rate.length > 0) {
      datasets.push({
        label: 'Heart Rate (bpm)',
        data: Array.from({ length: 24 }, (_, i) => {
          const values = hourlyData[i]?.heart_rate || []
          return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null
        }),
        borderColor: 'rgb(236, 72, 153)',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        fill: true,
        tension: 0.4,
      })
    }

    // Steps
    if (dayData.steps.length > 0) {
      datasets.push({
        label: 'Steps',
        data: Array.from({ length: 24 }, (_, i) => {
          const values = hourlyData[i]?.steps || []
          return values.length > 0 ? values.reduce((a, b) => a + b, 0) : null
        }),
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.5)',
        fill: true,
        tension: 0.4,
      })
    }

    return { labels, datasets }
  }, [dayData, hourlyData])

  const totalRecords = Object.values(dayData).reduce((sum, arr) => sum + arr.length, 0)

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          usePointStyle: true,
          padding: 15,
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(18, 23, 42, 0.95)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: { size: 10 },
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: { size: 11 },
        },
        beginAtZero: false,
      },
    },
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-end mb-6">
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>



    </div>
  )
}

export const HourlyDataView = memo(HourlyDataViewComponent)
export default HourlyDataView

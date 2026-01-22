'use client'

import { useMemo, memo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { MergedHealthData } from '@/hooks/useHealthMetrics'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface HealthMetricsChartProps {
  data: MergedHealthData[]
  visibleMetrics: {
    blood_oxygen: boolean
    sleep: boolean
    stress: boolean
    hrv: boolean
    heart_rate: boolean
    steps: boolean
  }
  loading?: boolean
}

function HealthMetricsChartComponent({
  data,
  visibleMetrics,
  loading,
}: HealthMetricsChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: [],
      }
    }

    const labels = data.map((d) => {
      const date = new Date(d.timestamp)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })

    const datasets = []

    if (visibleMetrics.blood_oxygen) {
      datasets.push({
        label: 'Blood Oxygen (%)',
        data: data.map((d) => d.blood_oxygen ?? null),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      })
    }

    if (visibleMetrics.sleep) {
      datasets.push({
        label: 'Sleep (hours)',
        data: data.map((d) => d.sleep ?? null),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      })
    }

    if (visibleMetrics.stress) {
      datasets.push({
        label: 'Stress Level',
        data: data.map((d) => d.stress ?? null),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      })
    }

    if (visibleMetrics.hrv) {
      datasets.push({
        label: 'HRV (ms)',
        data: data.map((d) => d.hrv ?? null),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      })
    }

    if (visibleMetrics.heart_rate) {
      datasets.push({
        label: 'Heart Rate (bpm)',
        data: data.map((d) => d.heart_rate ?? null),
        borderColor: 'rgb(236, 72, 153)',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      })
    }

    if (visibleMetrics.steps) {
      datasets.push({
        label: 'Steps',
        data: data.map((d) => d.steps ?? null),
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        yAxisID: 'y1',
      })
    }

    return {
      labels,
      datasets,
    }
  }, [data, visibleMetrics])

  const options = useMemo(() => ({
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
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(18, 23, 42, 0.95)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        filter: function (tooltipItem: any) {
          // Filter out items with null values to prevent errors
          return tooltipItem && tooltipItem.parsed && tooltipItem.parsed.y !== null && tooltipItem.parsed.y !== undefined
        },
        callbacks: {
          label: function (context: any) {
            if (!context || !context.dataset) return ''
            let label = context.dataset.label || ''
            if (label) {
              label += ': '
            }
            if (context.parsed && context.parsed.y !== null && context.parsed.y !== undefined) {
              label += context.parsed.y.toLocaleString()
            } else {
              label += 'N/A'
            }
            return label
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: {
            size: 11,
          },
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: {
            size: 11,
          },
        },
        beginAtZero: false,
      },
      y1: {
        type: 'linear' as const,
        display: visibleMetrics.steps,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: {
            size: 11,
          },
        },
        beginAtZero: true,
      },
    },
    onHover: (event: any, activeElements: any[]) => {
      // Prevent errors when hovering over empty areas
      if (!activeElements || activeElements.length === 0) return
    },
  }), [visibleMetrics])

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-white/10 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-48 mb-4"></div>
        <div className="h-96 bg-white/10 rounded"></div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-white/10">
        <h3 className="text-white font-semibold mb-4">Health Metrics Chart</h3>
        <div className="flex items-center justify-center h-96">
          <p className="text-white/60 text-sm">No data available</p>
        </div>
      </div>
    )
  }

  // Don't render chart if no datasets
  if (!chartData.datasets || chartData.datasets.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-white/10">
        <h3 className="text-white font-semibold mb-4">Health Metrics Overview</h3>
        <div className="flex items-center justify-center h-96">
          <p className="text-white/60 text-sm">No data available for selected metrics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/10">
      <h3 className="text-white font-semibold mb-6">Health Metrics Overview</h3>
      <div className="h-96">
        <Line 
          data={chartData} 
          options={options}
          key={JSON.stringify(visibleMetrics)} // Force re-render when metrics change
        />
      </div>
    </div>
  )
}

export const HealthMetricsChart = memo(HealthMetricsChartComponent)
export default HealthMetricsChart

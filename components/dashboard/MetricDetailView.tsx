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
import { X, Calendar, TrendingUp } from 'lucide-react'

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

interface MetricDetailViewProps {
  metricName: string
  data: HealthMetricData[]
  onClose: () => void
}

const metricConfig: Record<string, { label: string; color: string; unit: string }> = {
  blood_oxygen: { label: 'Blood Oxygen', color: 'rgb(59, 130, 246)', unit: '%' },
  sleep: { label: 'Sleep', color: 'rgb(139, 92, 246)', unit: 'hours' },
  stress: { label: 'Stress Level', color: 'rgb(239, 68, 68)', unit: '' },
  hrv: { label: 'HRV', color: 'rgb(34, 197, 94)', unit: 'ms' },
  heart_rate: { label: 'Heart Rate', color: 'rgb(236, 72, 153)', unit: 'bpm' },
  steps: { label: 'Steps', color: 'rgb(251, 146, 60)', unit: '' },
}

function MetricDetailViewComponent({ metricName, data, onClose }: MetricDetailViewProps) {
  const config = metricConfig[metricName] || { label: metricName, color: 'rgb(100, 100, 100)', unit: '' }
  
  // Sort data by timestamp
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp)
      const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp)
      return dateA.getTime() - dateB.getTime()
    })
  }, [data])

  const chartData = useMemo(() => {
    if (sortedData.length === 0) return null

    // For steps, create 24-hour structure
    if (metricName === 'steps') {
      // Create labels for all 24 hours
      const labels = Array.from({ length: 24 }, (_, i) => {
        return `${String(i).padStart(2, '0')}:00`
      })

      // Create data array for 24 hours, initialize with null
      const hourlyData: (number | null)[] = new Array(24).fill(null)
      const hourlyCounts: number[] = new Array(24).fill(0)

      // Group data by hour and sum values for the same hour
      sortedData.forEach((item) => {
        const date = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp)
        
        let hour: number
        
        // Use stored hour if available (from timeIndex calculation)
        if (item.hour !== undefined) {
          hour = item.hour
        } else if (item.timeIndex !== undefined) {
          // Calculate from timeIndex if available
          hour = Math.floor(item.timeIndex / 4)
        } else {
          // Fallback to timestamp's hour
          hour = date.getHours()
        }

        // Ensure hour is within valid range (0-23)
        if (hour >= 0 && hour < 24) {
          if (hourlyData[hour] === null) {
            hourlyData[hour] = item.value
          } else {
            // Sum values if multiple entries for same hour
            hourlyData[hour] = (hourlyData[hour] as number) + item.value
          }
          hourlyCounts[hour]++
        }
      })

      return {
        labels,
        datasets: [
          {
            label: `${config.label} (${config.unit})`,
            data: hourlyData,
            borderColor: config.color,
            backgroundColor: (ctx: any) => {
              // Create gradient effect for bars
              if (!ctx.chart || !ctx.chart.ctx || !ctx.chart.chartArea) {
                return config.color.replace('rgb', 'rgba').replace(')', ', 0.7)')
              }
              
              const chartArea = ctx.chart.chartArea
              if (!chartArea || chartArea.top === undefined || chartArea.bottom === undefined) {
                return config.color.replace('rgb', 'rgba').replace(')', ', 0.7)')
              }
              
              const gradient = ctx.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
              gradient.addColorStop(0, config.color.replace('rgb', 'rgba').replace(')', ', 0.8)'))
              gradient.addColorStop(1, config.color.replace('rgb', 'rgba').replace(')', ', 0.4)'))
              return gradient
            },
            borderRadius: 4,
            borderSkipped: false,
            maxBarThickness: 35,
            categoryPercentage: 0.6,
            barPercentage: 0.7,
          } as any,
        ],
      }
    }

    // For other metrics, use original format
    const labels = sortedData.map((item) => {
      const date = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    })

    return {
      labels,
      datasets: [
        {
          label: `${config.label} (${config.unit})`,
          data: sortedData.map((item) => item.value),
          borderColor: config.color,
          backgroundColor: config.color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }
  }, [sortedData, config, metricName])

  const stats = useMemo(() => {
    if (sortedData.length === 0) return null

    const values = sortedData.map((item) => item.value).filter((v) => !isNaN(v))
    if (values.length === 0) return null

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      total: metricName === 'steps' ? values.reduce((a, b) => a + b, 0) : null,
      count: values.length,
    }
  }, [sortedData, metricName])

  const chartOptions: any = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: metricName === 'steps' ? { left: 0, right: 0, top: 0, bottom: 0 } : { left: 10, right: 10, top: 10, bottom: 10 },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(18, 23, 42, 0.95)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        filter: function (tooltipItem: any) {
          return tooltipItem && tooltipItem.parsed && tooltipItem.parsed.y !== null && tooltipItem.parsed.y !== undefined
        },
        callbacks: {
          title: function (context: any) {
            if (!context || !context.length || !context[0]) return ''
            const dataIndex = context[0].dataIndex
            const item = sortedData[dataIndex]
            if (!item) return ''
            
            const date = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp)
            
            // For steps, show 24-hour format
            if (metricName === 'steps') {
              let hour: number
              let minute: number
              
              if (item.hour !== undefined && item.minute !== undefined) {
                hour = item.hour
                minute = item.minute
              } else if (item.timeIndex !== undefined) {
                hour = Math.floor(item.timeIndex / 4)
                minute = (item.timeIndex % 4) * 15
              } else {
                hour = date.getHours()
                minute = date.getMinutes()
              }
              
              const hour24 = String(hour).padStart(2, '0')
              const minute24 = String(minute).padStart(2, '0')
              return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${hour24}:${minute24}`
            }
            
            return date.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
          },
          label: function (context: any) {
            if (!context || !context.parsed || context.parsed.y === null || context.parsed.y === undefined) {
              return `${config.label}: N/A ${config.unit}`
            }
            return `${config.label}: ${context.parsed.y.toLocaleString()} ${config.unit}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: metricName === 'steps' ? false : true,
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: { size: metricName === 'steps' ? 12 : 11, weight: '500' },
          maxRotation: metricName === 'steps' ? 0 : 45,
          minRotation: metricName === 'steps' ? 0 : 45,
          padding: metricName === 'steps' ? 10 : 10,
          maxTicksLimit: metricName === 'steps' ? 24 : undefined,
          stepSize: metricName === 'steps' ? 1 : undefined,
          callback: metricName === 'steps' 
            ? function(value: any, index: number) {
                // Show all 24 hours - value is the index (0-23)
                const hour = typeof value === 'number' ? value : index
                return `${String(hour).padStart(2, '0')}:00`
              }
            : undefined,
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: { size: 12, weight: '500' },
          padding: 10,
        },
        border: {
          display: false,
        },
        beginAtZero: true,
      },
    },
    onHover: (event: any, activeElements: any[]) => {
      if (!activeElements || activeElements.length === 0) return
    },
  }), [config, metricName, sortedData])

  if (sortedData.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-xl">{config.label} Details</h3>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-white/60 text-sm">No data available for this metric</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-semibold text-xl mb-1">{config.label} Details</h3>
          <p className="text-white/60 text-sm">{sortedData.length} data point{sortedData.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-white/60 text-xs mb-1">Minimum</p>
            <p className="text-white text-xl font-semibold">
              {stats.min.toFixed(metricName === 'steps' ? 0 : 1)} {config.unit}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-white/60 text-xs mb-1">Maximum</p>
            <p className="text-white text-xl font-semibold">
              {stats.max.toFixed(metricName === 'steps' ? 0 : 1)} {config.unit}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-white/60 text-xs mb-1">Average</p>
            <p className="text-white text-xl font-semibold">
              {stats.avg.toFixed(metricName === 'steps' ? 0 : 1)} {config.unit}
            </p>
          </div>
          {stats.total !== null && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-white/60 text-xs mb-1">Total</p>
              <p className="text-white text-xl font-semibold">
                {stats.total.toLocaleString()} {config.unit}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {chartData && (
        <div className="mb-6">
          <div className={metricName === 'steps' ? 'h-96' : 'h-80'}>
            {metricName === 'steps' ? (
              <Bar data={chartData} options={chartOptions} />
            ) : (
              <Line data={chartData} options={chartOptions} />
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export const MetricDetailView = memo(MetricDetailViewComponent)
export default MetricDetailView

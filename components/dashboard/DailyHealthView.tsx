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
import { TrendingUp, TrendingDown, Minus, Activity, Heart, Droplet, Moon, AlertTriangle, Footprints } from 'lucide-react'

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

interface DailyStats {
  blood_oxygen: { values: number[]; min: number | null; max: number | null; avg: number | null }
  sleep: { values: number[]; total: number | null; stages: any }
  stress: { values: number[]; avg: number | null; peaks: number[] }
  hrv: { values: number[]; trend: string | null }
  heart_rate: { values: number[]; resting: number | null; avg: number | null; peak: number | null }
  steps: { values: number[]; total: number | null }
}

interface DailyHealthViewProps {
  stats: DailyStats
  date: Date
}

function DailyHealthViewComponent({ stats, date }: DailyHealthViewProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const bloodOxygenChart = useMemo(() => {
    if (!stats.blood_oxygen.values.length) return null

    return {
      labels: stats.blood_oxygen.values.map((_, i) => `Reading ${i + 1}`),
      datasets: [
        {
          label: 'Blood Oxygen (%)',
          data: stats.blood_oxygen.values,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    }
  }, [stats.blood_oxygen])

  const heartRateChart = useMemo(() => {
    if (!stats.heart_rate.values.length) return null

    return {
      labels: stats.heart_rate.values.map((_, i) => `Reading ${i + 1}`),
      datasets: [
        {
          label: 'Heart Rate (bpm)',
          data: stats.heart_rate.values,
          borderColor: 'rgb(236, 72, 153)',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    }
  }, [stats.heart_rate])

  const stressChart = useMemo(() => {
    if (!stats.stress.values.length) return null

    return {
      labels: stats.stress.values.map((_, i) => `Reading ${i + 1}`),
      datasets: [
        {
          label: 'Stress Level',
          data: stats.stress.values,
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          borderColor: 'rgb(239, 68, 68)',
        },
      ],
    }
  }, [stats.stress])

  const hrvChart = useMemo(() => {
    if (!stats.hrv.values.length) return null

    return {
      labels: stats.hrv.values.map((_, i) => `Reading ${i + 1}`),
      datasets: [
        {
          label: 'HRV (ms)',
          data: stats.hrv.values,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    }
  }, [stats.hrv])

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
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
          font: { size: 10 },
        },
      },
    },
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/10">
      <h3 className="text-white font-semibold text-xl mb-2">{formatDate(date)}</h3>
      <p className="text-white/60 text-sm mb-6">Daily Health Metrics Breakdown</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Blood Oxygen */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Droplet className="w-5 h-5 text-blue-400" />
            <h4 className="text-white font-medium">Blood Oxygen</h4>
          </div>
          {stats.blood_oxygen.values.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                <div>
                  <p className="text-white/60">Min</p>
                  <p className="text-white font-semibold">{stats.blood_oxygen.min?.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-white/60">Max</p>
                  <p className="text-white font-semibold">{stats.blood_oxygen.max?.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-white/60">Avg</p>
                  <p className="text-white font-semibold">{stats.blood_oxygen.avg?.toFixed(1)}%</p>
                </div>
              </div>
              {bloodOxygenChart && (
                <div className="h-32">
                  <Line data={bloodOxygenChart} options={chartOptions} />
                </div>
              )}
            </>
          ) : (
            <p className="text-white/40 text-sm">No data</p>
          )}
        </div>

        {/* Sleep */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-5 h-5 text-purple-400" />
            <h4 className="text-white font-medium">Sleep</h4>
          </div>
          {stats.sleep.values.length > 0 ? (
            <div>
              <p className="text-3xl font-bold text-white mb-1">
                {stats.sleep.total?.toFixed(1)} <span className="text-lg text-white/60">hrs</span>
              </p>
              <p className="text-white/60 text-xs">Total Sleep Duration</p>
            </div>
          ) : (
            <p className="text-white/40 text-sm">No data</p>
          )}
        </div>

        {/* Stress */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h4 className="text-white font-medium">Stress</h4>
          </div>
          {stats.stress.values.length > 0 ? (
            <>
              <div className="mb-3">
                <p className="text-3xl font-bold text-white mb-1">
                  {stats.stress.avg?.toFixed(1)}
                </p>
                <p className="text-white/60 text-xs">Average Level</p>
                {stats.stress.peaks.length > 0 && (
                  <p className="text-red-400 text-xs mt-1">
                    {stats.stress.peaks.length} peak{stats.stress.peaks.length > 1 ? 's' : ''} detected
                  </p>
                )}
              </div>
              {stressChart && (
                <div className="h-32">
                  <Bar data={stressChart} options={chartOptions} />
                </div>
              )}
            </>
          ) : (
            <p className="text-white/40 text-sm">No data</p>
          )}
        </div>

        {/* HRV */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-green-400" />
            <h4 className="text-white font-medium">HRV</h4>
          </div>
          {stats.hrv.values.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                {stats.hrv.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
                {stats.hrv.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
                {stats.hrv.trend === null && <Minus className="w-4 h-4 text-white/40" />}
                <p className="text-white/60 text-xs">
                  Trend: {stats.hrv.trend ? stats.hrv.trend.toUpperCase() : 'Stable'}
                </p>
              </div>
              {hrvChart && (
                <div className="h-32">
                  <Line data={hrvChart} options={chartOptions} />
                </div>
              )}
            </>
          ) : (
            <p className="text-white/40 text-sm">No data</p>
          )}
        </div>

        {/* Heart Rate */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-pink-400" />
            <h4 className="text-white font-medium">Heart Rate</h4>
          </div>
          {stats.heart_rate.values.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                <div>
                  <p className="text-white/60">Resting</p>
                  <p className="text-white font-semibold">{stats.heart_rate.resting} bpm</p>
                </div>
                <div>
                  <p className="text-white/60">Avg</p>
                  <p className="text-white font-semibold">{stats.heart_rate.avg?.toFixed(0)} bpm</p>
                </div>
                <div>
                  <p className="text-white/60">Peak</p>
                  <p className="text-white font-semibold">{stats.heart_rate.peak} bpm</p>
                </div>
              </div>
              {heartRateChart && (
                <div className="h-32">
                  <Line data={heartRateChart} options={chartOptions} />
                </div>
              )}
            </>
          ) : (
            <p className="text-white/40 text-sm">No data</p>
          )}
        </div>

        {/* Steps */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Footprints className="w-5 h-5 text-orange-400" />
            <h4 className="text-white font-medium">Steps</h4>
          </div>
          {stats.steps.values.length > 0 ? (
            <div>
              <p className="text-3xl font-bold text-white mb-1">
                {stats.steps.total?.toLocaleString()}
              </p>
              <p className="text-white/60 text-xs">Total Steps</p>
            </div>
          ) : (
            <p className="text-white/40 text-sm">No data</p>
          )}
        </div>
      </div>
    </div>
  )
}

export const DailyHealthView = memo(DailyHealthViewComponent)
export default DailyHealthView

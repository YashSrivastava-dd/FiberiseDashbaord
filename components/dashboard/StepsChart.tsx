'use client'

import { useSteps } from '@/hooks/useSteps'
import { ChartSection } from './ChartSection'
import { useMemo } from 'react'

interface StepsChartProps {
  userId: string | null
}

export function StepsChart({ userId }: StepsChartProps) {
  const { steps, loading } = useSteps(userId)

  const chartData = useMemo(() => {
    if (!steps || steps.length === 0) return []

    // Group by date and aggregate
    const grouped = steps.reduce((acc: any, step: any) => {
      const date = step.timestamp || step.id
      if (!acc[date]) {
        acc[date] = {
          date,
          steps: 0,
          calories: 0,
          distance: 0,
        }
      }
      acc[date].steps += step.totalSteps || 0
      acc[date].calories += step.totalCalories || 0
      acc[date].distance += step.totalDistance || 0
      return acc
    }, {})

    return Object.values(grouped)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7) // Last 7 days
      .map((item: any, index: number) => ({
        name: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
        value: item.steps,
        calories: item.calories,
        distance: item.distance,
      }))
  }, [steps])

  return (
    <ChartSection
      title="Step Trends"
      data={chartData}
      type="area"
      loading={loading}
    />
  )
}

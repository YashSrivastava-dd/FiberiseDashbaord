'use client'

import { useMeals } from '@/hooks/useMeals'

interface ActivityTableProps {
  userId: string | null
}

export function ActivityTable({ userId }: ActivityTableProps) {
  const { meals, loading } = useMeals(userId)

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-white/10 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-white/10 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!meals || meals.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-white/10">
        <h3 className="text-white font-semibold mb-4">Recent Meals</h3>
        <p className="text-white/40 text-sm">No meals found</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/10">
      <h3 className="text-white font-semibold mb-4">Recent Meals</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Date</th>
              <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Meal</th>
              <th className="text-right py-3 px-4 text-white/60 text-sm font-medium">Calories</th>
            </tr>
          </thead>
          <tbody>
            {meals.slice(0, 5).map((meal: any, index: number) => (
              <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 text-white/80 text-sm">
                  {meal.timestamp || meal.id || 'N/A'}
                </td>
                <td className="py-3 px-4 text-white/80 text-sm">
                  {meal.name || meal.type || 'Meal'}
                </td>
                <td className="py-3 px-4 text-white/80 text-sm text-right">
                  {meal.calories ? `${(meal.calories / 1000).toFixed(2)} kcal` : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

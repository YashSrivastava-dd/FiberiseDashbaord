import { useState, useEffect } from 'react'
import { db } from '@/src/firebase'
import { collection, getDocs } from 'firebase/firestore'

export function useMeals(userId: string | null) {
  const [meals, setMeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchMeals = async () => {
      try {
        setLoading(true)
        setError(null)
        const mealsRef = collection(db, 'users', userId, 'meals')
        const snapshot = await getDocs(mealsRef)
        const mealsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setMeals(mealsData)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch meals')
      } finally {
        setLoading(false)
      }
    }
    fetchMeals()
  }, [userId])

  return { meals, loading, error }
}

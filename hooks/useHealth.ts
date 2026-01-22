import { useState, useEffect } from 'react'
import { db } from '@/src/firebase'
import { collection, getDocs } from 'firebase/firestore'

export function useHealth(userId: string | null) {
  const [healthData, setHealthData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchHealthData = async () => {
      try {
        setLoading(true)
        setError(null)
        const healthRef = collection(db, 'users', userId, 'healthData')
        const snapshot = await getDocs(healthRef)
        const healthDataArray = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setHealthData(healthDataArray)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch health data')
      } finally {
        setLoading(false)
      }
    }
    fetchHealthData()
  }, [userId])

  return { healthData, loading, error }
}

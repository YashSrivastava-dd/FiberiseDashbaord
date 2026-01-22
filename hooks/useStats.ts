import { useState, useEffect } from 'react'
import { db } from '@/src/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

export function useStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    maleUsers: 0,
    femaleUsers: 0,
    bmiRangeUsers: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)

        const usersRef = collection(db, 'users')
        
        // Get all users
        const allUsersSnapshot = await getDocs(usersRef)
        const allUsers = allUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

        // Get male users
        const maleQuery = query(usersRef, where('gender', '==', 'MALE'))
        const maleSnapshot = await getDocs(maleQuery)

        // Get female users
        const femaleQuery = query(usersRef, where('gender', '==', 'FEMALE'))
        const femaleSnapshot = await getDocs(femaleQuery)

        // Filter BMI range (25-30) from all users
        const bmiUsers = allUsers.filter((user: any) => {
          const bmi = parseFloat(user.bmi || '0')
          return bmi >= 25 && bmi <= 30
        })

        setStats({
          totalUsers: allUsers.length,
          maleUsers: maleSnapshot.size,
          femaleUsers: femaleSnapshot.size,
          bmiRangeUsers: bmiUsers.length,
        })
      } catch (err: any) {
        setError(err.message || 'Failed to fetch stats')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return { stats, loading, error }
}

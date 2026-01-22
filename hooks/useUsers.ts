import { useState, useEffect, useCallback } from 'react'
import { db } from '@/src/firebase'
import { collection, getDocs, doc, getDoc, query, where, onSnapshot } from 'firebase/firestore'

// Cache for users data
const usersCache = new Map<string, { data: any[]; timestamp: number }>()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

export function useUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cacheKey = 'users_list'
    const cached = usersCache.get(cacheKey)
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setUsers(cached.data)
      setLoading(false)
    }

    const fetchUsers = async () => {
      try {
        setLoading(true)
        setError(null)
        const usersRef = collection(db, 'users')
        const snapshot = await getDocs(usersRef)
        const usersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        // Update cache
        usersCache.set(cacheKey, {
          data: usersData,
          timestamp: Date.now(),
        })
        
        setUsers(usersData)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch users')
      } finally {
        setLoading(false)
      }
    }
    
    // Only fetch if cache is invalid
    if (!cached || Date.now() - cached.timestamp >= CACHE_DURATION) {
      fetchUsers()
    }
  }, [])

  return { users, loading, error }
}

// Enhanced hook with real-time updates and active user detection
export function useUsersWithFilters(activeMinutesThreshold: number = 10) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const usersRef = collection(db, 'users')
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        try {
          const usersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          setUsers(usersData)
          setLoading(false)
          setError(null)
        } catch (err: any) {
          setError(err.message || 'Failed to fetch users')
          setLoading(false)
        }
      },
      (err) => {
        setError(err.message || 'Failed to fetch users')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  // Helper function to check if user is active
  const isUserActive = (user: any): boolean => {
    // If isActive is explicitly set, respect it
    if (user.isActive === true) return true
    if (user.isActive === false) return false

    // If we have a lastActiveAt timestamp, use it
    if (user.lastActiveAt) {
      const lastActive =
        user.lastActiveAt.toDate && typeof user.lastActiveAt.toDate === 'function'
          ? user.lastActiveAt.toDate()
          : user.lastActiveAt instanceof Date
          ? user.lastActiveAt
          : new Date(user.lastActiveAt)

      const now = new Date()
      const diffMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60)
      return diffMinutes <= activeMinutesThreshold
    }

    // If there is no explicit isActive or lastActiveAt,
    // treat the user as active so they appear on the map / list.
    return true
  }

  // Get active users
  const activeUsers = users.filter(isUserActive)

  // Get unique states
  const states = Array.from(new Set(users.map(u => u.state).filter(Boolean))).sort()

  // Get cities for a specific state
  const getCitiesForState = (state: string | null): string[] => {
    if (!state) return []
    return Array.from(
      new Set(
        users
          .filter(u => u.state === state && u.city)
          .map(u => u.city)
      )
    ).sort()
  }

  return {
    users,
    activeUsers,
    loading,
    error,
    isUserActive,
    states,
    getCitiesForState,
  }
}

export function useUser(userId: string | null) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchUser = async () => {
      try {
        setLoading(true)
        setError(null)
        const userRef = doc(db, 'users', userId)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          setUser({ id: userSnap.id, ...userSnap.data() })
        } else {
          setError('User not found')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch user')
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [userId])

  return { user, loading, error }
}

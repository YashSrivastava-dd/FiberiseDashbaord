import { useState, useEffect } from 'react'
import { getUserFcmTokens } from '@/lib/firebaseEndpoints'

export interface FcmTokenInfo {
  userId: string
  token: string
  userName?: string
}

export function useFcmTokens() {
  const [tokens, setTokens] = useState<FcmTokenInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTokens = async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedTokens = await getUserFcmTokens()
      setTokens(fetchedTokens)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch FCM tokens')
      setTokens([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTokens()
  }, [])

  return {
    tokens,
    loading,
    error,
    refetch: fetchTokens,
  }
}

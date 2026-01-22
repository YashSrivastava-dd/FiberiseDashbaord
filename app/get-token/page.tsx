'use client'

import { useState, useEffect } from 'react'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/src/firebase'

export default function GetTokenPage() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        // Auto-get token if user is already signed in
        currentUser.getIdToken().then((idToken) => {
          setToken(idToken)
          localStorage.setItem('firebase_access_token', idToken)
        })
      }
    })

    return () => unsubscribe()
  }, [])

  const getToken = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let currentUser = auth.currentUser
      
      // Sign in anonymously if not already signed in
      if (!currentUser) {
        const userCredential = await signInAnonymously(auth)
        currentUser = userCredential.user
      }
      
      // Get ID token (force refresh)
      const idToken = await currentUser.getIdToken(true)
      setToken(idToken)
      
      // Save to localStorage
      localStorage.setItem('firebase_access_token', idToken)
      
      console.log('Token saved to localStorage!')
    } catch (err: any) {
      console.error('Error getting token:', err)
      setError(err.message || 'Failed to get token')
    } finally {
      setLoading(false)
    }
  }

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token)
      alert('Token copied to clipboard!')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-8 border border-white/10 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-white mb-2">Get Firebase Access Token</h1>
        <p className="text-white/60 text-sm mb-6">
          This will generate an access token for authenticating with Firebase Firestore REST API.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={getToken}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Getting Token...' : user ? 'Refresh Token' : 'Get Access Token'}
          </button>
          
          {token && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                <p className="text-green-400 text-sm font-medium mb-2">✓ Token Generated Successfully!</p>
                <p className="text-white/60 text-xs">
                  The token has been saved to localStorage and will be used automatically by the dashboard.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white/80 text-sm font-medium">Access Token:</label>
                  <button
                    onClick={copyToken}
                    className="text-purple-400 hover:text-purple-300 text-xs font-medium"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  value={token}
                  readOnly
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-mono resize-none"
                  rows={8}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>

              <div className="flex gap-3">
                <a
                  href="/"
                  className="flex-1 bg-white/5 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors text-center"
                >
                  Go to Dashboard
                </a>
                <button
                  onClick={() => {
                    localStorage.removeItem('firebase_access_token')
                    setToken(null)
                    setUser(null)
                    auth.signOut()
                  }}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                >
                  Clear Token
                </button>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-white/60 text-xs mb-2">ℹ️ Token Information:</p>
                <ul className="text-white/60 text-xs space-y-1 list-disc list-inside">
                  <li>Token expires in 1 hour</li>
                  <li>Stored in browser localStorage</li>
                  <li>Used automatically by API requests</li>
                  <li>Click "Refresh Token" to get a new one</li>
                </ul>
              </div>
            </div>
          )}

          {!token && !loading && (
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-white/60 text-xs mb-2">📝 Instructions:</p>
              <ol className="text-white/60 text-xs space-y-1 list-decimal list-inside">
                <li>Click "Get Access Token" button above</li>
                <li>Token will be generated using anonymous authentication</li>
                <li>Token will be saved to localStorage automatically</li>
                <li>Navigate to the dashboard to use it</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

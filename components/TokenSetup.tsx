'use client'

import { useState } from 'react'

export function TokenSetup() {
  const [token, setToken] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    if (token.trim()) {
      localStorage.setItem('firebase_access_token', token.trim())
      setSaved(true)
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }

  const currentToken = typeof window !== 'undefined' ? localStorage.getItem('firebase_access_token') : null

  if (currentToken && !saved) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-8 border border-white/10 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-4">Firebase Access Token Setup</h2>
        <p className="text-white/60 text-sm mb-6">
          Enter your Firebase access token to connect to Firestore REST API.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter Firebase access token"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            {saved ? 'Saved! Reloading...' : 'Save Token'}
          </button>
          <p className="text-white/40 text-xs text-center">
            Token is stored locally in your browser
          </p>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldAlert
} from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials or connection error.')
      }

      setSuccess('Access verified. Redirecting to dashboard...')
      
      // Short delay for high-fidelity success animation transition
      setTimeout(() => {
        router.push('/orders')
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'Failed to connect to authentication server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#07090e] text-white flex items-center justify-center p-4 relative overflow-hidden select-none">
      
      {/* Premium background glowing orb accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-600/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        
        {/* Top Header Panel */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-3 shadow-lg shadow-purple-500/5 relative animate-pulse">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-400 bg-clip-text text-transparent mb-1">
            Fiberise Dashboard
          </h1>
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">
            Secure Administrator Access
          </p>
        </div>

        {/* Glassmorphic Login Card */}
        <div className="bg-[#0e121a]/80 border border-white/10 rounded-3xl p-6 lg:p-8 backdrop-blur-xl shadow-2xl animate-scale-up">
          
          {/* Reactive Error Alert banner */}
          {error && (
            <div className="mb-5 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-semibold flex items-start gap-2.5 animate-slide-down">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Reactive Success Alert banner */}
          {success && (
            <div className="mb-5 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold flex items-start gap-2.5 animate-slide-down">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider ml-1">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fiberisefit.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all font-medium"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all font-medium"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 border border-purple-500/30 text-sm font-bold text-white shadow-lg shadow-purple-600/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                  Verifying Credentials...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

        </div>

        {/* Footer legalities */}
        <div className="text-center mt-8 text-[10px] text-white/30 font-semibold tracking-wider uppercase animate-fade-in flex items-center justify-center gap-1.5 select-none">
          <ShieldAlert className="w-3.5 h-3.5" />
          Authorized personnel only • Secured by firebase
        </div>

      </div>
    </div>
  )
}

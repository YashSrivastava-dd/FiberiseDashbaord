'use client'

import { useState, useEffect } from 'react'
import { useFcmTokens } from '@/hooks/useFcmTokens'
import { sendNotification, broadcastNotification, broadcastPersonalizedNotifications } from '@/lib/notificationApi'
import { Loader2, Send, Users, User, AlertCircle, CheckCircle2, XCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type NotificationMode = 'single' | 'broadcast'

export function NotificationPush() {
  const { tokens, loading: tokensLoading, error: tokensError, refetch } = useFcmTokens()
  const [mode, setMode] = useState<NotificationMode>('single')
  const [selectedToken, setSelectedToken] = useState<string>('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [dataFields, setDataFields] = useState<Array<{ key: string; value: string }>>([
    { key: '', value: '' },
  ])
  const [sending, setSending] = useState(false)
  const [sendingPersonalized, setSendingPersonalized] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message?: string
    sent?: number
    failed?: number
    skipped?: number
    totalUsers?: number
    errors?: Array<{ token: string; error: string } | { userId: string; error: string }>
    summary?: {
      totalProcessed: number
      successful: number
      failed: number
      skipped: number
      successRate: string
    }
  } | null>(null)

  // Set first token as default when tokens load
  useEffect(() => {
    if (tokens.length > 0 && !selectedToken && mode === 'single') {
      setSelectedToken(tokens[0].token)
    }
  }, [tokens, selectedToken, mode])

  const handleAddDataField = () => {
    setDataFields([...dataFields, { key: '', value: '' }])
  }

  const handleRemoveDataField = (index: number) => {
    setDataFields(dataFields.filter((_, i) => i !== index))
  }

  const handleDataFieldChange = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...dataFields]
    updated[index] = { ...updated[index], [field]: value }
    setDataFields(updated)
  }

  const buildDataPayload = (): Record<string, any> => {
    const data: Record<string, any> = {}
    dataFields.forEach((field) => {
      if (field.key.trim() && field.value.trim()) {
        data[field.key.trim()] = field.value.trim()
      }
    })
    return data
  }

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setResult({
        success: false,
        message: 'Title and body are required',
      })
      return
    }

    if (mode === 'single' && !selectedToken) {
      setResult({
        success: false,
        message: 'Please select a token',
      })
      return
    }

    setSending(true)
    setResult(null)

    try {
      const dataPayload = buildDataPayload()
      const hasData = Object.keys(dataPayload).length > 0

      if (mode === 'single') {
        const response = await sendNotification({
          token: selectedToken,
          title: title.trim(),
          body: body.trim(),
          data: hasData ? dataPayload : undefined,
        })

        setResult({
          success: response.success,
          message: response.success
            ? `Notification sent successfully! Message ID: ${response.messageId || 'N/A'}`
            : response.error || 'Failed to send notification',
        })
      } else {
        const response = await broadcastNotification({
          title: title.trim(),
          body: body.trim(),
          data: hasData ? dataPayload : undefined,
        })

        setResult({
          success: response.success,
          message: `Broadcast completed: ${response.sent} sent, ${response.failed} failed`,
          sent: response.sent,
          failed: response.failed,
          errors: response.errors,
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'An error occurred while sending notification',
      })
    } finally {
      setSending(false)
    }
  }

  const handleReset = () => {
    setTitle('')
    setBody('')
    setDataFields([{ key: '', value: '' }])
    setResult(null)
  }

  const handlePersonalizedBroadcast = async () => {
    setSendingPersonalized(true)
    setResult(null)

    try {
      const response = await broadcastPersonalizedNotifications({
        batchSize: 500,
        useRecommendedCategory: true,
      })

      setResult({
        success: response.success,
        message: `Personalized broadcast completed: ${response.sent} sent, ${response.failed} failed, ${response.skipped} skipped out of ${response.totalUsers} total users. Success rate: ${response.summary.successRate}`,
        sent: response.sent,
        failed: response.failed,
        skipped: response.skipped,
        totalUsers: response.totalUsers,
        errors: response.errors,
        summary: response.summary,
      })
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'An error occurred while sending personalized notifications',
      })
    } finally {
      setSendingPersonalized(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Push Notifications</h1>
        <p className="text-white/60 text-sm">Send push notifications to users via FCM</p>
      </div>

      {/* Mode Selection */}
      <div className="bg-card rounded-2xl p-6 border border-white/10">
        <label className="block text-white/60 text-xs mb-3">Notification Mode</label>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setMode('single')
              setResult(null)
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-lg transition-all',
              mode === 'single'
                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
            )}
          >
            <User className="w-4 h-4" />
            Single User
          </button>
          <button
            onClick={() => {
              setMode('broadcast')
              setResult(null)
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-lg transition-all',
              mode === 'broadcast'
                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
            )}
          >
            <Users className="w-4 h-4" />
            Broadcast (All Users)
          </button>
        </div>
      </div>

      {/* Token Selection (Single Mode) */}
      {mode === 'single' && (
        <div className="bg-card rounded-2xl p-6 border border-white/10">
          <label className="block text-white/60 text-xs mb-2">
            Select User Token {tokensLoading && '(Loading...)'}
          </label>
          {tokensError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {tokensError}
              </div>
            </div>
          )}
          {!tokensLoading && tokens.length === 0 && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No FCM tokens found in Firestore. Tokens should be stored in user documents with
                fields like: fcmToken, pushToken, notificationToken, fcm_token, or push_token
              </div>
            </div>
          )}
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            disabled={tokensLoading || tokens.length === 0}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {tokensLoading ? (
              <option>Loading tokens...</option>
            ) : tokens.length === 0 ? (
              <option>No tokens available</option>
            ) : (
              <>
                <option value="">Select a user token...</option>
                {tokens.map((tokenInfo, index) => (
                  <option key={`${tokenInfo.userId || 'user'}-${index}`} value={tokenInfo.token}>
                    {tokenInfo.userName} ({tokenInfo.userId})
                  </option>
                ))}
              </>
            )}
          </select>
          {tokens.length > 0 && (
            <p className="mt-2 text-white/40 text-xs">
              {tokens.length} token{tokens.length !== 1 ? 's' : ''} available
            </p>
          )}
        </div>
      )}

      {/* Broadcast Info */}
      {mode === 'broadcast' && (
        <div className="bg-card rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-white font-medium">
                Broadcasting to {tokensLoading ? '...' : tokens.length} user
                {tokens.length !== 1 ? 's' : ''}
              </p>
              <p className="text-white/60 text-xs mt-1">
                This will send the notification to all users with FCM tokens in Firestore
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notification Form */}
      <div className="bg-card rounded-2xl p-6 border border-white/10 space-y-4">
        <div>
          <label className="block text-white/60 text-xs mb-2">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:border-purple-500/50"
          />
        </div>

        <div>
          <label className="block text-white/60 text-xs mb-2">Body *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notification message"
            rows={4}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:border-purple-500/50 resize-none"
          />
        </div>

        {/* Data Fields */}
        <div>
          <label className="block text-white/60 text-xs mb-2">Additional Data (Optional)</label>
          <div className="space-y-2">
            {dataFields.map((field, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) => handleDataFieldChange(index, 'key', e.target.value)}
                  placeholder="Key (e.g., screen, userId)"
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:border-purple-500/50"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => handleDataFieldChange(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:border-purple-500/50"
                />
                {dataFields.length > 1 && (
                  <button
                    onClick={() => handleRemoveDataField(index)}
                    className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddDataField}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              + Add Data Field
            </button>
          </div>
        </div>
      </div>

      {/* Result Message */}
      {result && (
        <div
          className={cn(
            'bg-card rounded-2xl p-6 border',
            result.success
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-red-500/30 bg-red-500/10'
          )}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={cn(
                  'font-medium',
                  result.success ? 'text-green-400' : 'text-red-400'
                )}
              >
                {result.success ? 'Success' : 'Error'}
              </p>
              <p
                className={cn('text-sm mt-1', result.success ? 'text-green-300' : 'text-red-300')}
              >
                {result.message}
              </p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-white/60">Errors (showing first 5):</p>
                  {result.errors.slice(0, 5).map((err, idx) => (
                    <p key={idx} className="text-xs text-red-300">
                      {'token' in err ? `${err.token}: ${err.error}` : `${err.userId}: ${err.error}`}
                    </p>
                  ))}
                  {result.errors.length > 5 && (
                    <p className="text-xs text-white/40">... and {result.errors.length - 5} more errors</p>
                  )}
                </div>
              )}
              {result.summary && (
                <div className="mt-3 p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-white/60 mb-2">Summary:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-white/60">Total Users:</span>
                      <span className="text-white ml-2">{result.summary.totalProcessed}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Success Rate:</span>
                      <span className="text-green-400 ml-2">{result.summary.successRate}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Sent:</span>
                      <span className="text-green-400 ml-2">{result.summary.successful}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Failed:</span>
                      <span className="text-red-400 ml-2">{result.summary.failed}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Skipped:</span>
                      <span className="text-yellow-400 ml-2">{result.summary.skipped}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleSend}
          disabled={sending || sendingPersonalized || tokensLoading || (mode === 'single' && !selectedToken)}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all',
            sending || sendingPersonalized || tokensLoading || (mode === 'single' && !selectedToken)
              ? 'bg-white/5 text-white/40 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600'
          )}
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {mode === 'single' ? 'Send Notification' : 'Broadcast Notification'}
            </>
          )}
        </button>
        <button
          onClick={handlePersonalizedBroadcast}
          disabled={sending || sendingPersonalized}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all',
            sending || sendingPersonalized
              ? 'bg-white/5 text-white/40 cursor-not-allowed'
              : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600'
          )}
        >
          {sendingPersonalized ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Broadcasting...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Personalized Broadcast
            </>
          )}
        </button>
        <button
          onClick={handleReset}
          disabled={sending || sendingPersonalized}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
        <button
          onClick={refetch}
          disabled={tokensLoading || sending || sendingPersonalized}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {tokensLoading ? 'Refreshing...' : 'Refresh Tokens'}
        </button>
      </div>
    </div>
  )
}

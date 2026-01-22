import api from './api'

const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

export interface SendNotificationRequest {
  token: string
  title: string
  body: string
  data?: Record<string, any>
}

export interface SendNotificationResponse {
  success: boolean
  messageId?: string
  error?: string
}

export interface BroadcastNotificationRequest {
  title: string
  body: string
  data?: Record<string, any>
}

export interface BroadcastNotificationResponse {
  success: boolean
  sent: number
  failed: number
  errors: Array<{ token: string; error: string }>
}

// Send notification to a single token
export async function sendNotification(
  request: SendNotificationRequest
): Promise<SendNotificationResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    const data = await response.json()
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to send notification',
      }
    }

    return data
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    }
  }
}

// Broadcast notification to all tokens
export async function broadcastNotification(
  request: BroadcastNotificationRequest
): Promise<BroadcastNotificationResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/send-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    const data = await response.json()
    return data
  } catch (error: any) {
    return {
      success: false,
      sent: 0,
      failed: 0,
      errors: [{ token: 'all', error: error.message || 'Network error' }],
    }
  }
}

// Register a token
export async function registerToken(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to register token',
      }
    }

    return data
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    }
  }
}

export interface PersonalizedBroadcastRequest {
  batchSize?: number
  useRecommendedCategory?: boolean
}

export interface PersonalizedBroadcastResponse {
  success: boolean
  totalUsers: number
  sent: number
  failed: number
  skipped: number
  errors: Array<{ userId: string; error: string }>
  summary: {
    totalProcessed: number
    successful: number
    failed: number
    skipped: number
    successRate: string
  }
  sampleDetails: Array<{
    userId: string
    userName: string
    status: 'sent' | 'failed' | 'skipped'
    message?: string
    error?: string
  }>
}

// Broadcast personalized notifications to all users
export async function broadcastPersonalizedNotifications(
  request: PersonalizedBroadcastRequest = {}
): Promise<PersonalizedBroadcastResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/broadcast-personalized`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    const data = await response.json()
    
    if (!response.ok) {
      return {
        success: false,
        totalUsers: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [{ userId: 'system', error: data.error || 'Failed to broadcast personalized notifications' }],
        summary: {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          successRate: '0%',
        },
        sampleDetails: [],
      }
    }

    return data
  } catch (error: any) {
    return {
      success: false,
      totalUsers: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [{ userId: 'system', error: error.message || 'Network error' }],
      summary: {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        successRate: '0%',
      },
      sampleDetails: [],
    }
  }
}

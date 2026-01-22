/**
 * Personalized notification broadcast service
 * Fetches user data, metrics, personalizes messages, and sends via FCM
 */

import { getFirebaseAdmin } from '../firebase/firebase.config'
import { getMessaging } from '../firebase/firebase.config'
import admin from 'firebase-admin'
import {
  UserData,
  DailyMetrics,
  calculatePersonalizedData,
  getTemplateVariables,
} from './personalizationService'
import {
  NotificationTemplate,
  getRandomTemplate,
  personalizeTemplate,
} from './notificationTemplates'

export interface BroadcastResult {
  success: boolean
  totalUsers: number
  sent: number
  failed: number
  skipped: number
  errors: Array<{ userId: string; error: string }>
  details: Array<{
    userId: string
    userName: string
    status: 'sent' | 'failed' | 'skipped'
    message?: string
    error?: string
  }>
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

/**
 * Fetch all users from Firestore
 */
async function fetchAllUsers(): Promise<UserData[]> {
  try {
    const adminApp = getFirebaseAdmin()
    const db = admin.firestore(adminApp)

    const usersSnapshot = await db.collection('users').get()

    if (usersSnapshot.empty) {
      return []
    }

    const users: UserData[] = []
    usersSnapshot.forEach((doc) => {
      const data = doc.data()
      users.push({
        id: doc.id,
        name: data.name || 'User',
        fcmToken: data.fcmToken || data.pushToken || data.notificationToken || data.fcm_token || data.push_token || data.deviceToken,
        targetCalories: data.targetCalories || 0,
        targetSteps: data.targetSteps || 0,
        targetSleep: data.targetSleep || 8,
        targetWeight: data.targetWeight || 0,
        monthlyWeightLossTarget: data.monthlyWeightLossTarget || 0,
        ...data,
      })
    })

    return users
  } catch (error: any) {
    console.error('Error fetching users:', error)
    throw error
  }
}

/**
 * Fetch today's metrics for a user
 * Supports multiple Firestore structures:
 * - users/{userId}/Step_24/{date}
 * - users/{userId}/healthData/{docId}
 * - users/{userId}/meals/{docId}
 * - metrics/{userId}/daily/{date} (alternative structure)
 */
async function fetchUserMetrics(userId: string, date: string = getTodayDateString()): Promise<DailyMetrics | null> {
  try {
    const adminApp = getFirebaseAdmin()
    const db = admin.firestore(adminApp)

    const metrics: DailyMetrics = {
      steps: 0,
      caloriesBurned: 0,
      caloriesIntake: 0,
      sleepHours: 0,
      hrv: 0,
      stress: 0,
      spo2: 0,
      heartRate: 0,
      date,
    }

    // Fetch Steps from users/{userId}/Step_24/{date}
    try {
      const stepsDoc = await db.collection('users').doc(userId).collection('Step_24').doc(date).get()
      if (stepsDoc.exists) {
        const data = stepsDoc.data()
        if (data) {
          // Try various field names for steps
          metrics.steps =
            data.steps ||
            data.steps_24 ||
            data.step ||
            data.stepCount ||
            data.totalSteps ||
            data.value ||
            0
        }
      }
    } catch (error) {
      // Try fetching latest step document if date-specific doesn't exist
      try {
        const stepsSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('Step_24')
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get()

        if (!stepsSnapshot.empty) {
          const data = stepsSnapshot.docs[0].data()
          metrics.steps =
            data?.steps ||
            data?.steps_24 ||
            data?.step ||
            data?.stepCount ||
            data?.totalSteps ||
            data?.value ||
            0
        }
      } catch (err) {
        // Continue
      }
    }

    // Fetch Health Data from users/{userId}/healthData
    try {
      const healthDataSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('healthData')
        .where('timestamp', '>=', new Date(date + 'T00:00:00'))
        .where('timestamp', '<', new Date(date + 'T23:59:59'))
        .limit(1)
        .get()

      if (!healthDataSnapshot.empty) {
        const data = healthDataSnapshot.docs[0].data()
        if (data) {
          metrics.hrv = data.hrv || data.HRV || data.heartRateVariability || 0
          metrics.stress = data.stress || data.stressLevel || 0
          metrics.spo2 = data.spo2 || data.SpO2 || data.bloodOxygen || 0
          metrics.heartRate = data.heartRate || data.HeartRate || data.hr || 0
        }
      } else {
        // Try getting latest health data if date-specific doesn't exist
        const latestHealthData = await db
          .collection('users')
          .doc(userId)
          .collection('healthData')
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get()

        if (!latestHealthData.empty) {
          const data = latestHealthData.docs[0].data()
          if (data) {
            metrics.hrv = data.hrv || data.HRV || data.heartRateVariability || 0
            metrics.stress = data.stress || data.stressLevel || 0
            metrics.spo2 = data.spo2 || data.SpO2 || data.bloodOxygen || 0
            metrics.heartRate = data.heartRate || data.HeartRate || data.hr || 0
          }
        }
      }
    } catch (error) {
      // Continue if healthData doesn't exist or has errors
    }

    // Fetch Meals/Calories from users/{userId}/meals
    try {
      const mealsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('meals')
        .where('timestamp', '>=', new Date(date + 'T00:00:00'))
        .where('timestamp', '<', new Date(date + 'T23:59:59'))
        .get()

      if (!mealsSnapshot.empty) {
        let totalCaloriesIntake = 0
        mealsSnapshot.docs.forEach((doc) => {
          const data = doc.data()
          totalCaloriesIntake +=
            data.calories ||
            data.calorie ||
            data.caloriesIntake ||
            data.intake ||
            data.value ||
            0
        })
        metrics.caloriesIntake = totalCaloriesIntake
      }
    } catch (error) {
      // Continue if meals collection doesn't exist
    }

    // Calculate calories burned (often derived from steps or activity)
    // Rough estimate: 0.04 calories per step
    if (metrics.steps > 0 && metrics.caloriesBurned === 0) {
      metrics.caloriesBurned = Math.round(metrics.steps * 0.04)
    }

    // Try alternative metrics structure: metrics/{userId}/daily/{date}
    try {
      const metricsDoc = await db.collection('metrics').doc(userId).collection('daily').doc(date).get()
      if (metricsDoc.exists) {
        const data = metricsDoc.data()
        if (data) {
          // Override with metrics collection data if available
          if (data.steps) metrics.steps = data.steps
          if (data.caloriesBurned) metrics.caloriesBurned = data.caloriesBurned
          if (data.caloriesIntake) metrics.caloriesIntake = data.caloriesIntake
          if (data.sleepHours) metrics.sleepHours = data.sleepHours
          if (data.hrv) metrics.hrv = data.hrv
          if (data.stress) metrics.stress = data.stress
          if (data.spo2) metrics.spo2 = data.spo2
          if (data.heartRate) metrics.heartRate = data.heartRate
        }
      }
    } catch (error) {
      // Continue if metrics collection doesn't exist
    }

    return metrics
  } catch (error: any) {
    console.error(`Error fetching metrics for user ${userId}:`, error)
    // Return default metrics on error
    return {
      steps: 0,
      caloriesBurned: 0,
      caloriesIntake: 0,
      sleepHours: 0,
      hrv: 0,
      stress: 0,
      spo2: 0,
      heartRate: 0,
      date,
    }
  }
}

/**
 * Broadcast personalized notifications to all users
 * 
 * @param batchSize - Number of notifications to send per batch (default: 500, FCM limit is 500)
 * @param useRecommendedCategory - If true, uses recommended category based on user data
 */
export async function broadcastPersonalizedNotifications(
  batchSize: number = 500,
  useRecommendedCategory: boolean = true
): Promise<BroadcastResult> {
  const startTime = Date.now()
  console.log('🚀 Starting personalized notification broadcast...')

  const result: BroadcastResult = {
    success: false,
    totalUsers: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    details: [],
  }

  try {
    // Fetch all users
    console.log('📊 Fetching users from Firestore...')
    const users = await fetchAllUsers()
    result.totalUsers = users.length
    console.log(`✅ Found ${users.length} users`)

    if (users.length === 0) {
      result.success = true
      return result
    }

    // Fetch metrics and prepare personalized messages
    console.log('📈 Fetching metrics and personalizing messages...')
    const messages: admin.messaging.Message[] = []
    const messageDetails: Array<{
      userId: string
      userName: string
      message: string
    }> = []

    const today = getTodayDateString()

    // Process users in batches to avoid overwhelming Firestore
    const userBatches: UserData[][] = []
    for (let i = 0; i < users.length; i += 50) {
      userBatches.push(users.slice(i, i + 50))
    }

    for (const userBatch of userBatches) {
      await Promise.all(
        userBatch.map(async (user) => {
          // Skip users without FCM token
          if (!user.fcmToken || typeof user.fcmToken !== 'string' || user.fcmToken.trim() === '') {
            result.skipped++
            result.details.push({
              userId: user.id,
              userName: user.name,
              status: 'skipped',
              message: 'No FCM token',
            })
            return
          }

          try {
            // Fetch user metrics
            const metrics = await fetchUserMetrics(user.id, today)

            // Calculate personalized data
            const personalizedData = calculatePersonalizedData(user, metrics)

            // Debug logging
            console.log(`📊 User ${user.id} (${user.name}):`, {
              fcmToken: user.fcmToken ? 'Present' : 'Missing',
              steps: metrics.steps,
              caloriesBurned: metrics.caloriesBurned,
              caloriesIntake: metrics.caloriesIntake,
              sleepHours: metrics.sleepHours,
              stress: metrics.stress,
              hrv: metrics.hrv,
              hasValidData: personalizedData.hasValidData,
              hasMetrics: personalizedData.hasMetrics,
            })

            // Note: FCM token check already done above, so hasValidData should always be true here
            // But we keep this as a safety check in case the user object was modified
            if (!personalizedData.hasValidData || !user.fcmToken) {
              result.skipped++
              result.details.push({
                userId: user.id,
                userName: user.name,
                status: 'skipped',
                message: 'No FCM token found',
              })
              return
            }

            // If no metrics but has token, we'll send a motivation message
            if (!personalizedData.hasMetrics) {
              console.log(`⚠️ User ${user.id} has FCM token but no metrics - will send motivation message`)
            }

            // Select template
            const template = useRecommendedCategory && personalizedData.recommendedCategory
              ? getRandomTemplate(personalizedData.recommendedCategory)
              : getRandomTemplate()

            // Get template variables
            const variables = getTemplateVariables(personalizedData)

            // Personalize message
            const personalizedMessage = personalizeTemplate(template.template, variables)

            // Create FCM message
            const fcmMessage: admin.messaging.Message = {
              token: user.fcmToken,
              notification: {
                title: '🏋️ Fitness Update',
                body: personalizedMessage,
              },
              data: {
                type: 'personalized',
                category: template.category,
                userId: user.id,
                timestamp: new Date().toISOString(),
              },
              android: {
                priority: 'high' as const,
              },
              apns: {
                headers: {
                  'apns-priority': '10',
                },
              },
            }

            messages.push(fcmMessage)
            messageDetails.push({
              userId: user.id,
              userName: user.name,
              message: personalizedMessage,
            })
          } catch (error: any) {
            console.error(`Error processing user ${user.id}:`, error)
            result.skipped++
            result.details.push({
              userId: user.id,
              userName: user.name,
              status: 'skipped',
              error: error.message || 'Processing error',
            })
          }
        })
      )
    }

    console.log(`✅ Prepared ${messages.length} personalized messages`)

    if (messages.length === 0) {
      result.success = true
      return result
    }

    // Send messages in batches (FCM limit is 500 per batch)
    const messaging = getMessaging()
    const batches: admin.messaging.Message[][] = []

    for (let i = 0; i < messages.length; i += batchSize) {
      batches.push(messages.slice(i, i + batchSize))
    }

    console.log(`📤 Sending ${batches.length} batch(es) of notifications...`)

    // Process batches sequentially to avoid rate limits
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const batchStartIndex = batchIndex * batchSize

      try {
        // Convert to multicast format
        const tokens = batch.map((msg) => msg.token)
        const multicastMessage: admin.messaging.MulticastMessage = {
          tokens,
          notification: {
            title: '🏋️ Fitness Update',
            body: 'Personalized notification', // Will be overridden per token
          },
          data: {
            type: 'personalized',
            timestamp: new Date().toISOString(),
          },
          android: {
            priority: 'high' as const,
          },
          apns: {
            headers: {
              'apns-priority': '10',
            },
          },
        }

        // Since we need personalized messages, we'll use sendEach instead
        // But FCM doesn't support per-token personalization in multicast
        // So we'll send individually but in parallel batches
        const sendPromises = batch.map(async (message, index) => {
          try {
            const messageId = await messaging.send(message)
            const detailIndex = batchStartIndex + index
            if (messageDetails[detailIndex]) {
              result.sent++
              console.log(`✅ Sent notification to ${messageDetails[detailIndex].userName} (${messageDetails[detailIndex].userId}): ${messageId}`)
              result.details.push({
                userId: messageDetails[detailIndex].userId,
                userName: messageDetails[detailIndex].userName,
                status: 'sent',
                message: messageDetails[detailIndex].message,
              })
            }
          } catch (error: any) {
            const detailIndex = batchStartIndex + index
            result.failed++
            const userId = messageDetails[detailIndex]?.userId || 'unknown'
            const userName = messageDetails[detailIndex]?.userName || 'Unknown'
            const errorMsg = error.message || 'Unknown error'

            // Log FCM errors for debugging
            console.error(`❌ Failed to send notification to ${userName} (${userId}):`, errorMsg)
            
            // Check for common FCM errors
            if (error.code === 'messaging/invalid-registration-token' || 
                error.code === 'messaging/registration-token-not-registered') {
              console.warn(`⚠️ Invalid/expired FCM token for user ${userId}`)
            }

            result.errors.push({
              userId,
              error: errorMsg,
            })
            result.details.push({
              userId,
              userName,
              status: 'failed',
              error: errorMsg,
            })
          }
        })

        // Wait for batch to complete (with some concurrency control)
        const batchSizeConcurrent = 100 // Send 100 at a time within batch
        for (let i = 0; i < sendPromises.length; i += batchSizeConcurrent) {
          await Promise.all(sendPromises.slice(i, i + batchSizeConcurrent))
        }

        console.log(
          `✅ Batch ${batchIndex + 1}/${batches.length} completed: ${result.sent} sent, ${result.failed} failed so far`
        )
      } catch (error: any) {
        console.error(`❌ Error in batch ${batchIndex + 1}:`, error)
        // Mark all in batch as failed
        for (let i = 0; i < batch.length; i++) {
          result.failed++
          const detailIndex = batchStartIndex + i
          const userId = messageDetails[detailIndex]?.userId || 'unknown'
          const userName = messageDetails[detailIndex]?.userName || 'Unknown'

          result.errors.push({
            userId,
            error: error.message || 'Batch error',
          })
          result.details.push({
            userId,
            userName,
            status: 'failed',
            error: error.message || 'Batch error',
          })
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`✅ Broadcast completed in ${duration}s`)
    console.log(`📊 Results: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`)

    result.success = result.sent > 0 || result.failed === 0
    return result
  } catch (error: any) {
    console.error('❌ Error in broadcastPersonalizedNotifications:', error)
    result.errors.push({
      userId: 'system',
      error: error.message || 'System error',
    })
    return result
  }
}

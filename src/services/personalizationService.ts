/**
 * Personalization service for calculating user metrics and goals
 * Handles all calculations needed for personalized notifications
 */

export interface UserData {
  id: string
  name: string
  fcmToken?: string
  targetCalories?: number
  targetSteps?: number
  targetSleep?: number
  targetWeight?: number
  monthlyWeightLossTarget?: number
  [key: string]: any
}

export interface DailyMetrics {
  steps?: number
  caloriesBurned?: number
  caloriesIntake?: number
  sleepHours?: number
  hrv?: number
  stress?: number
  spo2?: number
  heartRate?: number
  date?: string
}

export interface PersonalizedData {
  name: string
  stepsLeft: number
  caloriesLeft: number
  sleepRemaining: number
  excessCalories: number
  stressLevel: number
  hrvValue: number
  hasValidData: boolean
  hasMetrics: boolean
  recommendedCategory?: 'steps' | 'calories' | 'sleep' | 'stress' | 'hrv' | 'caloriesIntake' | 'motivation'
}

/**
 * Extract first name from full name
 */
function getFirstName(fullName: string | undefined): string {
  if (!fullName || typeof fullName !== 'string') {
    return 'Champion'
  }
  
  // Split by space and take the first part
  const firstName = fullName.trim().split(/\s+/)[0]
  return firstName || 'Champion'
}

/**
 * Calculate personalized metrics for a user
 */
export function calculatePersonalizedData(
  user: UserData,
  metrics: DailyMetrics
): PersonalizedData {
  // Calculate steps left (prevent negative)
  const steps = metrics.steps || 0
  const targetSteps = user.targetSteps || 0
  const stepsLeft = Math.max(0, targetSteps - steps)

  // Calculate calorie deficit
  const caloriesBurned = metrics.caloriesBurned || 0
  const caloriesIntake = metrics.caloriesIntake || 0
  const targetCalories = user.targetCalories || 0
  const netCalories = caloriesBurned - caloriesIntake
  const caloriesLeft = Math.max(0, targetCalories - netCalories)

  // Calculate excess calories (if over intake limit)
  const excessCalories = Math.max(0, caloriesIntake - (caloriesBurned + targetCalories))

  // Calculate sleep remaining
  const sleepHours = metrics.sleepHours || 0
  const targetSleep = user.targetSleep || 8 // Default 8 hours
  const sleepRemaining = Math.max(0, targetSleep - sleepHours)

  // Get stress and HRV values
  const stressLevel = metrics.stress || 0
  const hrvValue = metrics.hrv || 0

  // Determine if user has valid data
  // More lenient: if user has FCM token, we can send notifications even with minimal data
  // We'll use motivation templates if no specific metrics are available
  const hasValidData = Boolean(user.fcmToken)
  
  // Check if we have any meaningful metrics (for template selection)
  const hasMetrics = Boolean(
    steps > 0 || caloriesBurned > 0 || caloriesIntake > 0 || sleepHours > 0 || stressLevel > 0 || hrvValue > 0
  )

  // Recommend category based on data
  let recommendedCategory: PersonalizedData['recommendedCategory']

  // Priority: High stress > Excess calories > Steps > Calories deficit > Sleep > HRV
  if (stressLevel > 70) {
    recommendedCategory = 'stress'
  } else if (excessCalories > 200) {
    recommendedCategory = 'caloriesIntake'
  } else if (stepsLeft > 0 && stepsLeft < targetSteps * 0.3) {
    // Less than 30% of goal remaining
    recommendedCategory = 'steps'
  } else if (caloriesLeft > 0 && caloriesLeft < targetCalories * 0.3) {
    recommendedCategory = 'calories'
  } else if (sleepRemaining > 2) {
    // More than 2 hours of sleep needed
    recommendedCategory = 'sleep'
  } else if (hrvValue > 50) {
    // Good HRV
    recommendedCategory = 'hrv'
  } else {
    recommendedCategory = 'motivation'
  }

  return {
    name: getFirstName(user.name), // Use only first name
    stepsLeft,
    caloriesLeft,
    sleepRemaining: Math.round(sleepRemaining * 10) / 10, // Round to 1 decimal
    excessCalories,
    stressLevel,
    hrvValue,
    hasValidData,
    hasMetrics, // Track if we have actual metrics
    recommendedCategory: hasMetrics ? recommendedCategory : 'motivation', // Default to motivation if no metrics
  }
}

/**
 * Get variables for template personalization
 */
export function getTemplateVariables(personalizedData: PersonalizedData): Record<string, string | number> {
  return {
    name: personalizedData.name,
    stepsLeft: personalizedData.stepsLeft,
    caloriesLeft: personalizedData.caloriesLeft,
    sleepRemaining: personalizedData.sleepRemaining,
    excessCalories: personalizedData.excessCalories,
  }
}

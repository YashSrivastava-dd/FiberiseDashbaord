/**
 * Personalized notification templates for fitness band app
 * Zomato/Swiggy style - motivational, casual, and addictive
 */

export interface NotificationTemplate {
  id: string
  template: string
  category: 'steps' | 'calories' | 'sleep' | 'stress' | 'hrv' | 'caloriesIntake' | 'motivation'
  emoji: string
}

export const notificationTemplates: NotificationTemplate[] = [
  // Steps Templates
  {
    id: 'steps-1',
    template: '{{name}}, only {{stepsLeft}} steps left to crush your goal 👟',
    category: 'steps',
    emoji: '👟',
  },
  {
    id: 'steps-2',
    template: '{{name}}, you\'re {{stepsLeft}} steps away from victory! Keep moving 🏃',
    category: 'steps',
    emoji: '🏃',
  },
  {
    id: 'steps-3',
    template: '{{name}}, {{stepsLeft}} more steps and you\'ll hit your daily goal! 🔥',
    category: 'steps',
    emoji: '🔥',
  },
  {
    id: 'steps-4',
    template: '{{name}}, just {{stepsLeft}} steps to go! You\'ve got this 💪',
    category: 'steps',
    emoji: '💪',
  },

  // Calorie Deficit Templates
  {
    id: 'calories-1',
    template: '{{name}}, you\'re {{caloriesLeft}} kcal away from calorie deficit 🔥',
    category: 'calories',
    emoji: '🔥',
  },
  {
    id: 'calories-2',
    template: '{{name}}, only {{caloriesLeft}} more kcal to burn and you\'ll hit your deficit! 💪',
    category: 'calories',
    emoji: '💪',
  },
  {
    id: 'calories-3',
    template: '{{name}}, {{caloriesLeft}} kcal left to achieve your calorie goal today! 🎯',
    category: 'calories',
    emoji: '🎯',
  },
  {
    id: 'calories-4',
    template: '{{name}}, you\'re so close! Just {{caloriesLeft}} kcal to go 🔥',
    category: 'calories',
    emoji: '🔥',
  },

  // Sleep Templates
  {
    id: 'sleep-1',
    template: '{{name}}, sleep {{sleepRemaining}} more hrs for better recovery 😴',
    category: 'sleep',
    emoji: '😴',
  },
  {
    id: 'sleep-2',
    template: '{{name}}, you need {{sleepRemaining}} more hours of sleep tonight! Rest well 🌙',
    category: 'sleep',
    emoji: '🌙',
  },
  {
    id: 'sleep-3',
    template: '{{name}}, {{sleepRemaining}} hours of sleep left to hit your goal! Sweet dreams 💤',
    category: 'sleep',
    emoji: '💤',
  },
  {
    id: 'sleep-4',
    template: '{{name}}, aim for {{sleepRemaining}} more hours tonight for optimal recovery 🛌',
    category: 'sleep',
    emoji: '🛌',
  },

  // Stress Templates
  {
    id: 'stress-1',
    template: '{{name}}, stress is high today, take 3 deep breaths 🧠',
    category: 'stress',
    emoji: '🧠',
  },
  {
    id: 'stress-2',
    template: '{{name}}, your stress levels are elevated. Time for a quick meditation 🧘',
    category: 'stress',
    emoji: '🧘',
  },
  {
    id: 'stress-3',
    template: '{{name}}, high stress detected! Take a 5-min break and breathe 🌸',
    category: 'stress',
    emoji: '🌸',
  },
  {
    id: 'stress-4',
    template: '{{name}}, your body needs rest. Stress is high - take it easy today 🕯️',
    category: 'stress',
    emoji: '🕯️',
  },

  // HRV Templates
  {
    id: 'hrv-1',
    template: '{{name}}, your HRV is improving, go harder today 💪',
    category: 'hrv',
    emoji: '💪',
  },
  {
    id: 'hrv-2',
    template: '{{name}}, great HRV reading! Your body is ready for a challenge 🚀',
    category: 'hrv',
    emoji: '🚀',
  },
  {
    id: 'hrv-3',
    template: '{{name}}, your HRV shows you\'re recovering well! Push yourself today ⚡',
    category: 'hrv',
    emoji: '⚡',
  },
  {
    id: 'hrv-4',
    template: '{{name}}, excellent HRV! Your body is primed for peak performance 🏆',
    category: 'hrv',
    emoji: '🏆',
  },

  // Calories Intake (Over limit)
  {
    id: 'caloriesIntake-1',
    template: '{{name}}, you are {{excessCalories}} kcal over your intake today 🍔',
    category: 'caloriesIntake',
    emoji: '🍔',
  },
  {
    id: 'caloriesIntake-2',
    template: '{{name}}, you\'ve consumed {{excessCalories}} extra kcal today. Time to burn it off! 🔥',
    category: 'caloriesIntake',
    emoji: '🔥',
  },
  {
    id: 'caloriesIntake-3',
    template: '{{name}}, {{excessCalories}} kcal over limit! Let\'s get moving to balance it out 💪',
    category: 'caloriesIntake',
    emoji: '💪',
  },
  {
    id: 'caloriesIntake-4',
    template: '{{name}}, you\'re {{excessCalories}} kcal over. A quick workout will fix this! 🏋️',
    category: 'caloriesIntake',
    emoji: '🏋️',
  },

  // General Motivation
  {
    id: 'motivation-1',
    template: '{{name}}, you\'re doing amazing! Keep pushing towards your goals 🌟',
    category: 'motivation',
    emoji: '🌟',
  },
  {
    id: 'motivation-2',
    template: '{{name}}, every step counts! You\'re building something great 💎',
    category: 'motivation',
    emoji: '💎',
  },
  {
    id: 'motivation-3',
    template: '{{name}}, consistency is key! You\'ve got this 🔑',
    category: 'motivation',
    emoji: '🔑',
  },
  {
    id: 'motivation-4',
    template: '{{name}}, small progress is still progress! Keep going 🎯',
    category: 'motivation',
    emoji: '🎯',
  },
]

/**
 * Get a random template from a specific category
 */
export function getRandomTemplate(category?: NotificationTemplate['category']): NotificationTemplate {
  const templates = category
    ? notificationTemplates.filter((t) => t.category === category)
    : notificationTemplates

  if (templates.length === 0) {
    // Fallback to any template if category has none
    return notificationTemplates[Math.floor(Math.random() * notificationTemplates.length)]
  }

  return templates[Math.floor(Math.random() * templates.length)]
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: NotificationTemplate['category']
): NotificationTemplate[] {
  return notificationTemplates.filter((t) => t.category === category)
}

/**
 * Personalize a template with user data
 */
export function personalizeTemplate(
  template: string,
  variables: Record<string, string | number>
): string {
  let personalized = template

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    personalized = personalized.replace(regex, String(value))
  })

  return personalized
}

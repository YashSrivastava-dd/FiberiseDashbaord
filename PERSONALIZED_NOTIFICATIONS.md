# Personalized Push Notification System

A Zomato-style personalized push notification system for fitness band apps using Firebase + Firestore + FCM.

## 🎯 Features

- **Fully Personalized**: Each notification is customized based on user's live health data and targets
- **Smart Template Selection**: Automatically selects the most relevant template based on user metrics
- **Production Ready**: Handles thousands of users with batching and error handling
- **Zomato-Style**: Motivational, casual, and addictive messaging

## 📁 Architecture

### Services Created

1. **`notificationTemplates.ts`** - Template system with 30+ Zomato-style messages
2. **`personalizationService.ts`** - Calculates metrics, goals, and personalization data
3. **`personalizedNotificationService.ts`** - Main broadcast function with Firestore integration
4. **`app/api/broadcast-personalized/route.ts`** - API endpoint for triggering broadcasts

## 🗄️ Firestore Structure

### Users Collection
```
users/{userId} {
  name: string
  fcmToken: string (or pushToken, notificationToken, etc.)
  targetCalories: number
  targetSteps: number
  targetSleep: number
  targetWeight: number
  monthlyWeightLossTarget: number
}
```

### Metrics Collection
```
metrics/{userId}/daily/{date} {
  steps: number
  caloriesBurned: number
  caloriesIntake: number
  sleepHours: number
  hrv: number
  stress: number (0-100)
  spo2: number
  heartRate: number
}
```

**Alternative Structure:**
```
metrics/{userId}/{date}/daily {
  ...same fields
}
```

## 📝 Notification Templates

### Categories

1. **Steps** (4 templates)
   - "{{name}}, only {{stepsLeft}} steps left to crush your goal 👟"
   - "{{name}}, you're {{stepsLeft}} steps away from victory! Keep moving 🏃"

2. **Calories** (4 templates)
   - "{{name}}, you're {{caloriesLeft}} kcal away from calorie deficit 🔥"
   - "{{name}}, only {{caloriesLeft}} more kcal to burn and you'll hit your deficit! 💪"

3. **Sleep** (4 templates)
   - "{{name}}, sleep {{sleepRemaining}} more hrs for better recovery 😴"
   - "{{name}}, you need {{sleepRemaining}} more hours of sleep tonight! Rest well 🌙"

4. **Stress** (4 templates)
   - "{{name}}, stress is high today, take 3 deep breaths 🧠"
   - "{{name}}, your stress levels are elevated. Time for a quick meditation 🧘"

5. **HRV** (4 templates)
   - "{{name}}, your HRV is improving, go harder today 💪"
   - "{{name}}, great HRV reading! Your body is ready for a challenge 🚀"

6. **Calories Intake** (4 templates)
   - "{{name}}, you are {{excessCalories}} kcal over your intake today 🍔"
   - "{{name}}, you've consumed {{excessCalories}} extra kcal today. Time to burn it off! 🔥"

7. **Motivation** (4 templates)
   - "{{name}}, you're doing amazing! Keep pushing towards your goals 🌟"
   - "{{name}}, every step counts! You're building something great 💎"

## 🚀 Usage

### API Endpoint

**POST** `/api/broadcast-personalized`

**Request Body (Optional):**
```json
{
  "batchSize": 500,
  "useRecommendedCategory": true
}
```

**Response:**
```json
{
  "success": true,
  "totalUsers": 1000,
  "sent": 950,
  "failed": 30,
  "skipped": 20,
  "errors": [...],
  "summary": {
    "totalProcessed": 1000,
    "successful": 950,
    "failed": 30,
    "skipped": 20,
    "successRate": "97.14%"
  },
  "sampleDetails": [...]
}
```

### Programmatic Usage

```typescript
import { broadcastPersonalizedNotifications } from '@/src/services/personalizedNotificationService'

// Basic usage
const result = await broadcastPersonalizedNotifications()

// With options
const result = await broadcastPersonalizedNotifications(
  500, // batchSize
  true // useRecommendedCategory
)

console.log(`Sent: ${result.sent}, Failed: ${result.failed}`)
```

## 🧮 Personalization Logic

### Calculations

1. **Steps Left**
   ```typescript
   stepsLeft = Math.max(0, targetSteps - currentSteps)
   ```

2. **Calories Left**
   ```typescript
   netCalories = caloriesBurned - caloriesIntake
   caloriesLeft = Math.max(0, targetCalories - netCalories)
   ```

3. **Excess Calories**
   ```typescript
   excessCalories = Math.max(0, caloriesIntake - (caloriesBurned + targetCalories))
   ```

4. **Sleep Remaining**
   ```typescript
   sleepRemaining = Math.max(0, targetSleep - sleepHours)
   ```

### Template Selection Priority

1. **High Stress** (>70) → Stress templates
2. **Excess Calories** (>200) → Calories Intake templates
3. **Steps Close** (<30% of goal remaining) → Steps templates
4. **Calories Close** (<30% of goal remaining) → Calories templates
5. **Sleep Needed** (>2 hours) → Sleep templates
6. **Good HRV** (>50) → HRV templates
7. **Default** → Motivation templates

## ⚡ Performance

### Batching Strategy

- **User Fetching**: 50 users per batch (Firestore read optimization)
- **Message Sending**: 100 concurrent sends per batch
- **FCM Limit**: 500 messages per multicast (handled automatically)

### Scalability

- ✅ Handles thousands of users
- ✅ Skips users without FCM tokens
- ✅ Skips users without valid metrics
- ✅ Prevents negative numbers in calculations
- ✅ Comprehensive error logging
- ✅ Detailed success/failure tracking

## 🔧 Configuration

### Environment Variables

Required (already set up):
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `MONGO_URI` (optional, for token storage)

### Customization

**Add New Templates:**
```typescript
// In notificationTemplates.ts
{
  id: 'custom-1',
  template: '{{name}}, your custom message with {{variable}} 🎯',
  category: 'motivation',
  emoji: '🎯',
}
```

**Modify Personalization Logic:**
```typescript
// In personalizationService.ts
// Update calculatePersonalizedData() function
```

## 📊 Monitoring

### Logs

The system logs:
- User fetching progress
- Metrics fetching progress
- Batch sending progress
- Success/failure counts
- Error details

### Response Details

Each broadcast returns:
- Total users processed
- Success/failure/skipped counts
- Error list (limited to 50)
- Sample details (first 10)
- Success rate percentage

## 🧪 Testing

### Test with cURL

```bash
curl -X POST http://localhost:3000/api/broadcast-personalized \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 100, "useRecommendedCategory": true}'
```

### Test Programmatically

```typescript
// In a Next.js API route or server function
import { broadcastPersonalizedNotifications } from '@/src/services/personalizedNotificationService'

export async function testBroadcast() {
  const result = await broadcastPersonalizedNotifications(100, true)
  console.log('Result:', result)
}
```

## 🎨 Example Notifications

### User A (Steps Goal)
- **Template**: "John, only 2500 steps left to crush your goal 👟"
- **Category**: Steps
- **Reason**: 70% of goal completed, close to target

### User B (High Stress)
- **Template**: "Sarah, stress is high today, take 3 deep breaths 🧠"
- **Category**: Stress
- **Reason**: Stress level > 70

### User C (Excess Calories)
- **Template**: "Mike, you are 450 kcal over your intake today 🍔"
- **Category**: Calories Intake
- **Reason**: Excess calories > 200

### User D (Good HRV)
- **Template**: "Emma, your HRV is improving, go harder today 💪"
- **Category**: HRV
- **Reason**: HRV > 50, good recovery

## 🔒 Error Handling

### Skipped Users

Users are skipped if:
- No FCM token found
- No valid metrics data
- Processing error

### Failed Sends

Failed sends are logged with:
- User ID
- Error message
- Error type

### Retry Logic

For production, consider adding:
- Retry for transient errors
- Dead letter queue for persistent failures
- Rate limiting protection

## 📈 Next Steps

1. **Schedule Broadcasts**: Set up cron jobs or Cloud Functions
2. **A/B Testing**: Test different templates and timings
3. **Analytics**: Track open rates, engagement
4. **Optimization**: Fine-tune template selection logic
5. **Localization**: Add multi-language support

## 🎯 Best Practices

1. **Timing**: Send notifications at optimal times (morning, evening)
2. **Frequency**: Don't overwhelm users (max 2-3 per day)
3. **Relevance**: Always use recommended categories
4. **Testing**: Test with small batches first
5. **Monitoring**: Monitor success rates and adjust

---

**Built with ❤️ for fitness enthusiasts**

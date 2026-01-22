# Push Notifications UI - Integration Guide

## ✅ What's Been Created

A complete push notification UI has been integrated into your dashboard with the following features:

### 1. **Notification Push Component** (`components/notifications/NotificationPush.tsx`)
   - Single user notification mode
   - Broadcast to all users mode
   - FCM token selection from Firestore
   - Title and body input fields
   - Optional custom data fields
   - Real-time result feedback
   - Error handling and validation

### 2. **Notifications Page** (`app/notifications/page.tsx`)
   - Full page layout with sidebar and top bar
   - Integrated notification push component

### 3. **Sidebar Integration** (`components/layout/Sidebar.tsx`)
   - Added "Notifications" menu item
   - Navigation between Dashboard and Notifications
   - Active state highlighting based on current route

### 4. **FCM Token Fetching** (`lib/firebaseEndpoints.ts`)
   - `getUserFcmTokens()` - Fetches all FCM tokens from Firestore user documents
   - `getUserFcmToken(userId)` - Fetches token for a specific user
   - Supports multiple field name variations:
     - `fcmToken`
     - `pushToken`
     - `notificationToken`
     - `fcm_token`
     - `push_token`
     - `deviceToken`

### 5. **API Client** (`lib/notificationApi.ts`)
   - `sendNotification()` - Send to single token
   - `broadcastNotification()` - Send to all tokens
   - `registerToken()` - Register a new token

### 6. **Custom Hook** (`hooks/useFcmTokens.ts`)
   - `useFcmTokens()` - React hook for fetching and managing FCM tokens
   - Loading states
   - Error handling
   - Refetch capability

## 🚀 How to Use

### Accessing the UI

1. **Via Sidebar**: Click on "Notifications" in the sidebar menu
2. **Direct URL**: Navigate to `http://localhost:3000/notifications`

### Sending Notifications

#### Single User Notification

1. Select "Single User" mode
2. Choose a user from the dropdown (tokens are fetched from Firestore)
3. Enter notification title and body
4. (Optional) Add custom data fields (key-value pairs)
5. Click "Send Notification"

#### Broadcast Notification

1. Select "Broadcast (All Users)" mode
2. Enter notification title and body
3. (Optional) Add custom data fields
4. Click "Broadcast Notification"
5. View results showing how many were sent/failed

### FCM Token Storage in Firestore

The UI automatically fetches FCM tokens from user documents in Firestore. Make sure your user documents have one of these fields:

```javascript
// Example user document structure
{
  id: "user123",
  name: "John Doe",
  email: "john@example.com",
  fcmToken: "dGhpcyBpcyBhbiBmY20gdG9rZW4...", // ✅ Supported
  // OR
  pushToken: "dGhpcyBpcyBhbiBmY20gdG9rZW4...", // ✅ Supported
  // OR
  notificationToken: "dGhpcyBpcyBhbiBmY20gdG9rZW4...", // ✅ Supported
  // OR any of: fcm_token, push_token, deviceToken
}
```

## 📋 Features

### ✅ Single User Mode
- Dropdown to select user by name/ID
- Shows available token count
- Sends notification to selected user only

### ✅ Broadcast Mode
- Sends to all users with FCM tokens
- Shows total user count
- Displays success/failure statistics
- Lists errors for failed deliveries

### ✅ Custom Data Fields
- Add multiple key-value pairs
- Useful for deep linking, navigation, etc.
- Example: `{ screen: "home", userId: "123" }`

### ✅ Real-time Feedback
- Success/error messages
- Loading states
- Detailed error information
- Refresh tokens button

### ✅ Error Handling
- Validates required fields
- Shows helpful error messages
- Handles network errors gracefully
- Displays Firebase errors clearly

## 🔧 Technical Details

### API Endpoints Used

- `POST /api/send` - Send to single token
- `POST /api/send-all` - Broadcast to all tokens
- `GET /api/health` - Health check (used internally)

### Data Flow

1. **Token Fetching**: 
   - UI calls `useFcmTokens()` hook
   - Hook calls `getUserFcmTokens()` from `firebaseEndpoints.ts`
   - Function queries Firestore users collection
   - Extracts FCM tokens from user documents
   - Returns array of `{ userId, token, userName }`

2. **Sending Notification**:
   - User fills form and clicks send
   - UI calls `sendNotification()` or `broadcastNotification()`
   - Function makes POST request to Next.js API route
   - API route calls notification service
   - Service uses Firebase Admin SDK to send via FCM
   - Response returned to UI with results

## 🎨 UI Components

### NotificationPush Component Structure

```
NotificationPush
├── Mode Selection (Single/Broadcast)
├── Token Selection (Single mode only)
├── Broadcast Info (Broadcast mode only)
├── Notification Form
│   ├── Title input
│   ├── Body textarea
│   └── Data fields (dynamic)
├── Result Display
└── Action Buttons
    ├── Send/Broadcast
    ├── Reset
    └── Refresh Tokens
```

## 🐛 Troubleshooting

### No Tokens Found

**Problem**: Dropdown shows "No tokens available"

**Solutions**:
1. Check if user documents in Firestore have FCM token fields
2. Verify field names match supported variations
3. Ensure tokens are valid strings (not null/empty)
4. Click "Refresh Tokens" button

### Notification Not Sending

**Problem**: Error when sending notification

**Solutions**:
1. Check if FCM backend is configured (see `FCM_INTEGRATION.md`)
2. Verify MongoDB connection
3. Check Firebase Admin SDK credentials
4. Review server logs for detailed errors

### Token Field Not Detected

**Problem**: Tokens exist but not showing in UI

**Solutions**:
1. Check field name matches supported variations
2. Verify token is a string type
3. Check browser console for errors
4. Try refreshing tokens

## 📝 Example Usage

### Example 1: Simple Notification

```
Mode: Single User
User: John Doe (+917011803119)
Title: Welcome!
Body: Thanks for using our app!
Data: (none)
```

### Example 2: Notification with Deep Link

```
Mode: Broadcast
Title: New Feature Available
Body: Check out our new health tracking feature!
Data:
  - Key: screen, Value: health
  - Key: feature, Value: tracking
```

### Example 3: User-Specific Notification

```
Mode: Single User
User: Jane Smith (+919876543210)
Title: Your Health Report
Body: Your weekly health report is ready!
Data:
  - Key: screen, Value: reports
  - Key: reportId, Value: 12345
```

## 🎯 Next Steps

1. **Test the UI**: Navigate to `/notifications` and try sending a test notification
2. **Verify Tokens**: Ensure your Firestore user documents have FCM tokens
3. **Configure Backend**: Set up environment variables (see `ENV_SETUP.md`)
4. **Test Notifications**: Send test notifications to verify end-to-end flow

## 📚 Related Documentation

- `FCM_INTEGRATION.md` - Complete FCM backend documentation
- `FCM_QUICK_START.md` - Quick setup guide
- `ENV_SETUP.md` - Environment variables setup

---

**Ready to send notifications!** 🚀

Navigate to `/notifications` in your dashboard to start using the push notification UI.

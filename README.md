# Fiberise Dashboard

A production-ready health records dashboard built with Next.js, TypeScript, Tailwind CSS, and Firebase Firestore REST API.

## Features

- 🎨 **Pixel-perfect UI** - Matches Dribbble design exactly
- 🔥 **Real Firebase Data** - All data from Firestore REST API
- 📊 **Interactive Charts** - Recharts with real-time data
- 🎯 **TypeScript** - Full type safety
- 📱 **Responsive Design** - Works on all devices
- 🔐 **Bearer Token Auth** - Secure API access

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Recharts** - For data visualization
- **Axios** - HTTP client
- **Firebase Firestore REST API**
- **Lucide React** - Icons

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Firebase Access Token

You need a Firebase access token to authenticate API requests. Options:

#### Option A: Firebase Admin SDK (Recommended for development)

```javascript
// Create a script: scripts/getToken.js
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

admin.auth().createCustomToken('test-user-id')
  .then(token => console.log('Token:', token));
```

#### Option B: OAuth2 Token

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth2 credentials
3. Get access token using OAuth2 flow

### 3. Set Access Token

When you first open the dashboard, you'll see a token setup modal. Enter your Firebase access token there.

Alternatively, set it manually in browser console:

```javascript
localStorage.setItem('firebase_access_token', 'YOUR_TOKEN_HERE')
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
Fiberise_Dashboard/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard page
│   ├── globals.css         # Global styles with Tailwind
│   └── user/
│       └── [id]/
│           └── page.tsx    # User detail page
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx     # Left sidebar navigation
│   │   └── TopBar.tsx      # Top navigation bar
│   ├── dashboard/
│   │   ├── StatCard.tsx    # Statistic cards
│   │   ├── ChartSection.tsx # Chart wrapper
│   │   ├── StepsChart.tsx  # Steps visualization
│   │   └── ActivityTable.tsx # Activity data table
│   ├── TokenSetup.tsx      # Token setup modal
│   └── ErrorToast.tsx      # Error notifications
├── hooks/
│   ├── useUsers.ts         # Users data hook
│   ├── useStats.ts         # Statistics hook
│   ├── useSteps.ts         # Steps data hook
│   ├── useMeals.ts         # Meals data hook
│   └── useHealth.ts        # Health data hook
├── lib/
│   ├── api.ts              # Axios instance with interceptors
│   ├── firebaseEndpoints.ts # Firebase API functions
│   └── utils.ts            # Utility functions
└── src/
    └── firebase.js         # Firebase SDK config (legacy)
```

## API Endpoints Used

All endpoints use Firebase Firestore REST API:

- `GET /documents/users` - Get all users
- `GET /documents/users/{id}` - Get user by ID
- `POST /documents:runQuery` - Query users by field
- `GET /documents/users/{id}/Step_24` - Get step data
- `GET /documents/users/{id}/meals` - Get meals
- `GET /documents/users/{id}/healthData` - Get health data

## Environment Variables

No environment variables needed. Token is stored in `localStorage`.

## Firestore Security Rules

Make sure your Firestore rules allow read access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{phone} {
      allow read: if true;
      // ... your write rules
    }
  }
}
```

## Building for Production

```bash
npm run build
npm start
```

## Notes

- All data comes from Firebase Firestore REST API
- No mock data or hardcoded values
- Token is stored in browser localStorage
- Dashboard is fully responsive
- Dark theme with glassmorphism effects

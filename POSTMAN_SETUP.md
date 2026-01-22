# Postman Collection Setup Guide

## Overview

This Postman collection allows you to test Firebase Firestore REST API operations for the Fiberise Dashboard project.

## Important Notes

⚠️ **This is a frontend Next.js application** that uses Firebase SDK directly. The Postman collection uses Firebase's REST API, which requires authentication.

## Setup Instructions

### 1. Get Firebase Access Token

You have two options to get an access token:

#### Option A: Using Firebase Admin SDK (Recommended for testing)
```javascript
// Run this in Node.js
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

admin.auth().createCustomToken('test-user-id')
  .then(token => {
    console.log('Access Token:', token);
  });
```

#### Option B: Using OAuth2 (For production)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth2 credentials
3. Use the OAuth2 token in Postman

### 2. Import Collection

1. Open Postman
2. Click **Import** button
3. Select `Fiberise_Dashboard.postman_collection.json`
4. The collection will be imported with all requests

### 3. Set Environment Variables

In Postman, set these variables in your environment or collection:

- `user_id`: User document ID (phone number, e.g., `+917011803119`)
- `date`: Date for Step_24 documents (e.g., `2025-12-09`)
- `firebase_access_token`: Your Firebase access token

### 4. Configure Authentication

The collection uses Bearer Token authentication. Make sure to:
1. Set the `firebase_access_token` variable
2. The token will be automatically added to all requests

## Available Requests

### Users Collection
- **Get All Users** - Fetch all users from Firestore
- **Get User by ID** - Get a specific user by phone number
- **Create User** - Create a new user document
- **Update User** - Update user fields
- **Delete User** - Delete a user document

### User Subcollections
- **Get Step_24 Collection** - Get all step data for a user
- **Get Step_24 Document by Date** - Get step data for a specific date
- **Create Step_24 Document** - Add new step data
- **Get Meals Collection** - Get all meals for a user
- **Get HealthData Collection** - Get all health data for a user

### Query Operations
- **Query Users by Field** - Query users by gender, ordered by createdAt
- **Query Users by BMI Range** - Query users with BMI in a specific range

## Firestore REST API Format

Firestore REST API uses a specific format for field values:

```json
{
  "fields": {
    "name": {
      "stringValue": "John Doe"
    },
    "age": {
      "integerValue": "30"
    },
    "bmi": {
      "doubleValue": 25.5
    },
    "isActive": {
      "booleanValue": true
    },
    "createdAt": {
      "timestampValue": "2025-12-09T10:00:00Z"
    },
    "tags": {
      "arrayValue": {
        "values": [
          {"stringValue": "tag1"},
          {"stringValue": "tag2"}
        ]
      }
    }
  }
}
```

## Testing Tips

1. **Start with GET requests** - They're read-only and safer
2. **Check Firestore Security Rules** - Make sure your rules allow the operations
3. **Use Collection Variables** - Set common values like `user_id` once
4. **Test with Real Data** - Use actual user IDs from your Firestore database

## Troubleshooting

### 401 Unauthorized
- Check if your access token is valid
- Verify the token hasn't expired
- Ensure the token has proper permissions

### 403 Forbidden
- Check Firestore security rules
- Verify your token has the right scopes

### 404 Not Found
- Verify the document path is correct
- Check if the document exists in Firestore
- Ensure collection and document IDs are correct

## Alternative: Use Firebase Console

If you prefer a GUI, you can also use:
- [Firebase Console](https://console.firebase.google.com/) - Web interface
- [Firebase Studio](https://firebase.google.com/docs/emulator-suite) - Local development tool

## Security Note

⚠️ **Never commit access tokens to version control!**
- Use environment variables
- Keep tokens secure
- Rotate tokens regularly

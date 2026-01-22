import api from './api'

export interface FirestoreDocument {
  name: string
  fields: Record<string, any>
  createTime?: string
  updateTime?: string
}

export interface FirestoreResponse {
  documents?: FirestoreDocument[]
  document?: FirestoreDocument
}

// Parse Firestore document to normalized format
export function parseFirestoreDoc(doc: FirestoreDocument) {
  const parsed: any = {
    id: doc.name.split('/').pop() || '',
  }

  Object.entries(doc.fields || {}).forEach(([key, value]) => {
    if (value.stringValue !== undefined) {
      parsed[key] = value.stringValue
    } else if (value.integerValue !== undefined) {
      parsed[key] = parseInt(value.integerValue)
    } else if (value.doubleValue !== undefined) {
      parsed[key] = parseFloat(value.doubleValue)
    } else if (value.booleanValue !== undefined) {
      parsed[key] = value.booleanValue
    } else if (value.timestampValue !== undefined) {
      parsed[key] = new Date(value.timestampValue)
    } else if (value.arrayValue?.values) {
      parsed[key] = value.arrayValue.values.map((v: any) => {
        if (v.stringValue !== undefined) return v.stringValue
        if (v.integerValue !== undefined) return parseInt(v.integerValue)
        if (v.doubleValue !== undefined) return parseFloat(v.doubleValue)
        return v
      })
    } else if (value.mapValue?.fields) {
      parsed[key] = parseFirestoreDoc({ name: '', fields: value.mapValue.fields })
    }
  })

  return parsed
}

// Get all users
export async function getAllUsers() {
  const response = await api.get<FirestoreResponse>('/documents/users')
  if (response.data.documents) {
    return response.data.documents.map(parseFirestoreDoc)
  }
  return []
}

// Get user by ID
export async function getUserById(userId: string) {
  const response = await api.get<FirestoreDocument>(`/documents/users/${encodeURIComponent(userId)}`)
  return parseFirestoreDoc(response.data)
}

// Query users by field
export async function queryUsersByField(field: string, value: string) {
  const response = await api.post<{ document?: FirestoreDocument }[]>('/documents:runQuery', {
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: 'EQUAL',
          value: { stringValue: value },
        },
      },
    },
  })
  return (response.data || []).map((item: any) => {
    if (item.document) return parseFirestoreDoc(item.document)
    return null
  }).filter(Boolean)
}

// Query users by BMI range
export async function queryUsersByBMIRange(min: number, max: number) {
  const response = await api.post<{ document?: FirestoreDocument }[]>('/documents:runQuery', {
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'bmi' },
                op: 'GREATER_THAN_OR_EQUAL',
                value: { stringValue: min.toString() },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: 'bmi' },
                op: 'LESS_THAN_OR_EQUAL',
                value: { stringValue: max.toString() },
              },
            },
          ],
        },
      },
    },
  })
  return (response.data || []).map((item: any) => {
    if (item.document) return parseFirestoreDoc(item.document)
    return null
  }).filter(Boolean)
}

// Get Step_24 collection for a user
export async function getUserSteps(userId: string) {
  try {
    const response = await api.get<FirestoreResponse>(`/documents/users/${encodeURIComponent(userId)}/Step_24`)
    if (response.data.documents) {
      return response.data.documents.map(parseFirestoreDoc)
    }
    return []
  } catch (error: any) {
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

// Get meals collection for a user
export async function getUserMeals(userId: string) {
  try {
    const response = await api.get<FirestoreResponse>(`/documents/users/${encodeURIComponent(userId)}/meals`)
    if (response.data.documents) {
      return response.data.documents.map(parseFirestoreDoc)
    }
    return []
  } catch (error: any) {
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

// Get healthData collection for a user
export async function getUserHealthData(userId: string) {
  try {
    const response = await api.get<FirestoreResponse>(`/documents/users/${encodeURIComponent(userId)}/healthData`)
    if (response.data.documents) {
      return response.data.documents.map(parseFirestoreDoc)
    }
    return []
  } catch (error: any) {
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

// Get FCM tokens from all users
// Checks common field names: fcmToken, pushToken, notificationToken, fcm_token, push_token
export async function getUserFcmTokens(): Promise<Array<{ userId: string; token: string; userName?: string }>> {
  try {
    const users = await getAllUsers()
    const tokens: Array<{ userId: string; token: string; userName?: string }> = []

    users.forEach((user: any) => {
      // Check multiple possible field names for FCM token
      const possibleFields = ['fcmToken', 'pushToken', 'notificationToken', 'fcm_token', 'push_token', 'fcmToken', 'deviceToken']
      
      for (const field of possibleFields) {
        if (user[field] && typeof user[field] === 'string' && user[field].trim() !== '') {
          tokens.push({
            userId: user.id || user.phone || '',
            token: user[field],
            userName: user.name || user.email || user.phone || 'Unknown User'
          })
          break // Found token, move to next user
        }
      }
    })

    return tokens
  } catch (error: any) {
    console.error('Error fetching FCM tokens:', error)
    throw error
  }
}

// Get FCM token for a specific user
export async function getUserFcmToken(userId: string): Promise<string | null> {
  try {
    const user = await getUserById(userId)
    const possibleFields = ['fcmToken', 'pushToken', 'notificationToken', 'fcm_token', 'push_token', 'fcmToken', 'deviceToken']
    
    for (const field of possibleFields) {
      if (user[field] && typeof user[field] === 'string' && user[field].trim() !== '') {
        return user[field]
      }
    }
    
    return null
  } catch (error: any) {
    console.error('Error fetching user FCM token:', error)
    return null
  }
}

import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Fetch all documents from a Firestore collection
 * @param {string} collectionName - Name of the collection
 * @param {number} maxDocs - Maximum number of documents to fetch (default: 100)
 * @returns {Promise<Array>} Array of documents
 */
export async function fetchCollection(collectionName, maxDocs = 100) {
  try {
    const collectionRef = collection(db, collectionName)
    const q = query(collectionRef, orderBy('createdAt', 'desc'), limit(maxDocs))
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    // If createdAt doesn't exist, try without ordering
    try {
      const collectionRef = collection(db, collectionName)
      const snapshot = await getDocs(collectionRef)
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (err) {
      console.error(`Error fetching collection ${collectionName}:`, err)
      throw err
    }
  }
}

/**
 * Fetch all documents from multiple collections
 * @param {Array<string>} collectionNames - Array of collection names
 * @returns {Promise<Object>} Object with collection names as keys and arrays of documents as values
 */
export async function fetchMultipleCollections(collectionNames) {
  const results = {}
  
  await Promise.all(
    collectionNames.map(async (name) => {
      try {
        results[name] = await fetchCollection(name)
      } catch (error) {
        console.error(`Failed to fetch ${name}:`, error)
        results[name] = []
      }
    })
  )
  
  return results
}


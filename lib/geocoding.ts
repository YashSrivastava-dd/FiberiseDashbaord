// Simple Mapbox reverse geocoding helper used on the client side
// NOTE: For production, consider moving this to a server route to hide the token.

const MAPBOX_TOKEN =
  'pk.eyJ1IjoieWFzaDk5MDAiLCJhIjoiY21rbWNpYWdrMGMzdTNlczViemgwNTY0bCJ9.6j36Iy_Q8lh2nBXKjGVsew'

export type GeoResult = { city: string | null; state: string | null }

// In-memory cache to avoid repeated network calls for the same coordinates
const geoCache = new Map<string, GeoResult>()

// Pending requests to avoid duplicate concurrent requests
const pendingRequests = new Map<string, Promise<GeoResult | null>>()

// Batch processing queue
const BATCH_SIZE = 5
const BATCH_DELAY = 100 // ms

function makeKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

async function reverseGeocodeSingle(
  lat: number,
  lng: number
): Promise<GeoResult | null> {
  if (!MAPBOX_TOKEN) return null

  const key = makeKey(lat, lng)
  
  // Check cache first
  if (geoCache.has(key)) {
    return geoCache.get(key) as GeoResult
  }

  // Check if there's already a pending request for this coordinate
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!
  }

  // Create new request
  const request = (async () => {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=place,region&language=en`
      const res = await fetch(url)
      if (!res.ok) return null
      const data = await res.json()

      let city: string | null = null
      let state: string | null = null

      for (const feature of data.features ?? []) {
        if (feature.place_type?.includes('place') && !city) city = feature.text
        if (feature.place_type?.includes('region') && !state) state = feature.text
      }

      const result: GeoResult = { city, state }
      geoCache.set(key, result)
      return result
    } catch (err) {
      console.error('Error during reverse geocoding:', err)
      return null
    } finally {
      pendingRequests.delete(key)
    }
  })()

  pendingRequests.set(key, request)
  return request
}

// Batch geocoding function for multiple coordinates
export async function reverseGeocodeBatch(
  coordinates: Array<{ lat: number; lng: number }>
): Promise<Map<string, GeoResult | null>> {
  const results = new Map<string, GeoResult | null>()
  const toFetch: Array<{ key: string; lat: number; lng: number }> = []

  // Check cache first
  for (const { lat, lng } of coordinates) {
    const key = makeKey(lat, lng)
    if (geoCache.has(key)) {
      results.set(key, geoCache.get(key)!)
    } else {
      toFetch.push({ key, lat, lng })
    }
  }

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE)
    const batchPromises = batch.map(({ lat, lng, key }) =>
      reverseGeocodeSingle(lat, lng).then(result => ({ key, result }))
    )
    
    const batchResults = await Promise.all(batchPromises)
    batchResults.forEach(({ key, result }) => {
      results.set(key, result)
    })

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < toFetch.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
    }
  }

  return results
}

// Single coordinate geocoding (backward compatible)
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeoResult | null> {
  return reverseGeocodeSingle(lat, lng)
}


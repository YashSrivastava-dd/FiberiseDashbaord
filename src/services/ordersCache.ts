// Dedicated in-memory cache service for Shopify and Shiprocket orders
// to comply with Next.js App Router route file export limitations.

export let cachedOrders: any[] | null = null
export let cacheExpiresAt = 0
export const CACHE_TTL_MS = 15000 // 15 seconds in-memory cache

export let activeFetchPromise: Promise<{ shopifyOrders: any[]; shiprocketOrders: any[] }> | null = null

export function getCachedOrders() {
  return cachedOrders
}

export function setCachedOrders(orders: any[], expiresAt: number) {
  cachedOrders = orders
  cacheExpiresAt = expiresAt
}

export function getCacheExpiresAt() {
  return cacheExpiresAt
}

export function getCachedOrderById(id: string | number) {
  return cachedOrders?.find(o => String(o.id) === String(id)) || null
}

export function removeOrderFromCache(id: string | number) {
  if (cachedOrders) {
    cachedOrders = cachedOrders.filter(o => String(o.id) !== String(id))
  }
}

export function getActiveFetchPromise() {
  return activeFetchPromise
}

export function setActiveFetchPromise(p: Promise<{ shopifyOrders: any[]; shiprocketOrders: any[] }> | null) {
  activeFetchPromise = p
}

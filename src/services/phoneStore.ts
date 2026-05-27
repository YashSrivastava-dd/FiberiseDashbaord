/**
 * Persistent phone number store for Shiprocket custom/cloned orders.
 * Shiprocket's list API always masks phone numbers ("xxxxxxxxxx").
 * We capture the real phone at order creation time and store it here, keyed by Shiprocket order ID.
 * This store persists to disk so it survives server restarts.
 */

import fs from 'fs'
import path from 'path'

const STORE_PATH = path.join(process.cwd(), '.shiprocket-phones.json')

type PhoneStore = Record<string, string> // { [orderId]: phone }

function loadStore(): PhoneStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'))
    }
  } catch {
    // corrupt file — start fresh
  }
  return {}
}

function saveStore(store: PhoneStore) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch (e) {
    console.error('⚠️ Failed to persist phone store:', e)
  }
}

/** Store the phone number for a Shiprocket order ID */
export function storePhone(shiprocketOrderId: string | number, phone: string) {
  if (!phone || phone === 'xxxxxxxxxx') return
  const store = loadStore()
  store[String(shiprocketOrderId)] = phone
  saveStore(store)
}

/** Look up the stored phone for a Shiprocket order ID */
export function lookupPhone(shiprocketOrderId: string | number): string {
  const store = loadStore()
  return store[String(shiprocketOrderId)] || ''
}

/** Store phone keyed by channel_order_id (e.g. "1128-C") as well */
export function storePhoneByChannel(channelOrderId: string, phone: string) {
  if (!phone || phone === 'xxxxxxxxxx') return
  const key = `ch_${channelOrderId.replace(/^#/, '').trim().toLowerCase()}`
  const store = loadStore()
  store[key] = phone
  saveStore(store)
}

/** Look up stored phone by channel_order_id */
export function lookupPhoneByChannel(channelOrderId: string): string {
  const key = `ch_${channelOrderId.replace(/^#/, '').trim().toLowerCase()}`
  const store = loadStore()
  return store[key] || ''
}

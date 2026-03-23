const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external'

let cachedToken: string | null = null
let cachedTokenExpiresAt: number | null = null

async function getAuthToken(): Promise<string> {
  const now = Date.now()

  if (cachedToken && cachedTokenExpiresAt && now < cachedTokenExpiresAt) {
    return cachedToken
  }

  if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
    throw new Error('Shiprocket credentials are not configured in environment variables.')
  }

  const res = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: SHIPROCKET_EMAIL, password: SHIPROCKET_PASSWORD }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Shiprocket auth failed: ${res.status} ${res.statusText} ${text}`)
  }

  const data = (await res.json()) as { token?: string; expires_in?: number }
  if (!data.token) throw new Error('Shiprocket auth response did not contain a token.')

  cachedToken = data.token
  const ttlMs = data.expires_in ? data.expires_in * 1000 : 9 * 24 * 60 * 60 * 1000
  cachedTokenExpiresAt = now + ttlMs

  return cachedToken
}

async function shiprocketGet(path: string): Promise<any> {
  const token = await getAuthToken()

  const res = await fetch(`${SHIPROCKET_BASE_URL}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Shiprocket GET ${path} failed: ${res.status} ${res.statusText} ${text}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return res.json()
  return res.arrayBuffer()
}

async function shiprocketPost(path: string, body: any): Promise<any> {
  const token = await getAuthToken()

  const res = await fetch(`${SHIPROCKET_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Shiprocket POST ${path} failed: ${res.status} ${res.statusText} ${text}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return res.json()
  return res.arrayBuffer()
}

/**
 * Resolve a Shiprocket order by the channel order number
 * (e.g. Shopify order.name "#1021" → strip # → "1021")
 * Returns { id, shipment_id } or null if not found.
 */
export async function findShiprocketOrderByChannelNumber(
  orderName: string,
): Promise<{ id: number; shipment_id: number | null } | null> {
  const clean = orderName.replace(/^#/, '').trim()
  try {
    const data = await shiprocketGet(
      `/orders?channel_order_id=${encodeURIComponent(clean)}`,
    )
    const list: any[] = data?.data ?? data?.orders ?? []
    if (!Array.isArray(list) || list.length === 0) return null
    const order = list[0]
    return {
      id: order.id ?? order.order_id,
      shipment_id: order.shipments?.[0]?.id ?? order.shipment_id ?? null,
    }
  } catch {
    return null
  }
}

export async function getShiprocketInvoices(orderIds: number[]) {
  // POST /orders/print/invoice with { ids: [shiprocketOrderId, ...] }
  return shiprocketPost('/orders/print/invoice', { ids: orderIds })
}

export async function getShiprocketManifest(shipmentIds: number[]) {
  // POST /manifests/print with { shipment_id: [...] }
  return shiprocketPost('/manifests/print', { shipment_id: shipmentIds })
}

export async function generateShiprocketLabels(shipmentIds: number[]) {
  // POST /courier/generate/label with { shipment_id: [...] }
  return shiprocketPost('/courier/generate/label', { shipment_id: shipmentIds })
}

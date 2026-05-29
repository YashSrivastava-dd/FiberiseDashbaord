const admin = require('firebase-admin');
const fs = require('fs');
const dotenv = require('dotenv');

async function main() {
  if (fs.existsSync('.env')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  const db = admin.firestore();
  const testOrderSnapshot = await db.collection('test_orders').get();
  const testOrderIds = new Set();
  testOrderSnapshot.forEach(doc => {
    testOrderIds.add(String(doc.id));
  });
  console.log(`Loaded test order IDs from database: ${testOrderIds.size}`);

  const SHOP_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN;
  const API_VERSION = process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || '2024-01';
  const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  async function fetchAllShopifyOrders() {
    let shopifyOrders = [];
    let nextUrl = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/orders.json?limit=250&status=any`;
    
    while (nextUrl) {
      const res = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': ADMIN_TOKEN,
        },
      });

      if (!res.ok) throw new Error(`Shopify error: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        shopifyOrders = shopifyOrders.concat(data.orders);
      }

      const linkHeader = res.headers.get('Link') || res.headers.get('link');
      nextUrl = null;
      if (linkHeader) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (match) {
          nextUrl = match[1];
        }
      }
    }
    return shopifyOrders;
  }

  async function getAllShiprocketOrders() {
    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;
    const baseUrl = 'https://apiv2.shiprocket.in/v1/external';

    const authRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!authRes.ok) return [];
    const authData = await authRes.json();
    const token = authData.token;

    const ordersRes = await fetch(`${baseUrl}/orders?per_page=100&page=1`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });

    if (!ordersRes.ok) return [];
    const data = await ordersRes.json();
    let allOrders = data?.data ?? data?.orders ?? [];
    if (!Array.isArray(allOrders)) allOrders = [];

    const totalPages = data?.meta?.pagination?.total_pages;
    if (typeof totalPages === 'number' && totalPages > 1) {
      const remainingPromises = [];
      for (let p = 2; p <= totalPages; p++) {
        remainingPromises.push(
          fetch(`${baseUrl}/orders?per_page=100&page=${p}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          }).then(res => res.json())
        );
      }

      const results = await Promise.all(remainingPromises);
      results.forEach(res => {
        const list = res?.data ?? res?.orders ?? [];
        if (Array.isArray(list)) {
          allOrders = allOrders.concat(list);
        }
      });
    }
    return allOrders;
  }

  console.log("Fetching Shopify & Shiprocket live databases...");
  const [shopify, shiprocket] = await Promise.all([
    fetchAllShopifyOrders(),
    getAllShiprocketOrders(),
  ]);

  console.log(`Shopify orders raw count: ${shopify.length}`);
  console.log(`Shiprocket orders raw count: ${shiprocket.length}`);

  // Deduplicate and combine
  const shopifyMap = new Map();
  shopify.forEach((order) => {
    if (order.name) {
      const cleanName = order.name.replace(/^#/, '').trim().toLowerCase();
      shopifyMap.set(cleanName, order);
    }
    if (order.id) {
      shopifyMap.set(String(order.id), order);
    }
  });

  const customOrders = [];
  shiprocket.forEach((srOrder) => {
    const cleanSrName = String(srOrder.channel_order_id || '').replace(/^#/, '').trim().toLowerCase();
    const matchedShopify = shopifyMap.get(cleanSrName);
    const latestShipment = srOrder.shipments?.[0];
    const tracking_number = latestShipment?.awb || srOrder.last_mile_awb || null;

    if (matchedShopify) {
      if (tracking_number) {
        matchedShopify.fulfillment_status = 'fulfilled';
      }
    } else {
      customOrders.push({
        id: srOrder.id,
        name: srOrder.channel_order_id ? `#${srOrder.channel_order_id.replace('#', '')}` : `#SR-${srOrder.id}`,
        created_at: srOrder.created_at,
        total_price: String(srOrder.total || '0'),
        financial_status: 'pending',
        line_items: [],
        source: 'shiprocket'
      });
    }
  });

  const combined = shopify.concat(customOrders);
  console.log(`Combined base dataset size: ${combined.length}`);

  // Compute test vs real splits
  let totalTest = 0;
  let totalReal = 0;
  let totalCancelled = 0;

  const realOrdersList = [];
  const testOrdersList = [];

  combined.forEach(o => {
    const isTest = o.test === true || testOrderIds.has(String(o.id));
    if (isTest) {
      totalTest++;
      testOrdersList.push(o);
    } else {
      totalReal++;
      realOrdersList.push(o);

      const isCancelled = !!o.cancelled_at ||
        o.financial_status?.toLowerCase() === 'voided' ||
        o.financial_status?.toLowerCase() === 'cancelled' ||
        o.financial_status?.toLowerCase() === 'refunded' ||
        o.fulfillments?.[0]?.shipment_status === 'cancelled';
      
      if (isCancelled) {
        totalCancelled++;
      }
    }
  });

  console.log(`\n--- Verification Metrics Summary ---`);
  console.log(`Total Test Orders in DB: ${totalTest}`);
  console.log(`Total Real Orders in DB: ${totalReal}`);
  console.log(`Cancelled attempts among Real Orders: ${totalCancelled}`);
  console.log(`Expected Total Orders shown in Dashboard (Real excluding Cancelled): ${totalReal - totalCancelled}`);
}

main().catch(console.error);

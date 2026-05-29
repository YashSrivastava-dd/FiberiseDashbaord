/**
 * Firestore Service — Centralized CRUD for WhatsApp Journey Collections
 *
 * Handles all Firestore operations for:
 *  - customers
 *  - journeys
 *  - message_templates
 *  - message_logs
 *
 * Uses Firebase Admin SDK for server-side operations.
 */

import { getFirebaseAdmin } from '@/src/firebase/firebase.config';
import admin from 'firebase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Customer {
  id?: string;
  customerName: string;
  phone: string;
  email: string;
  source: string;
  createdAt?: admin.firestore.Timestamp;
}

export interface Journey {
  id?: string;
  customerId: string;
  orderId: string;
  orderAmount: number;
  products: string[];
  orderDate: admin.firestore.Timestamp;
  currentDay: number;
  nextMessageDate: admin.firestore.Timestamp;
  lastMessageSent: string;
  status: 'active' | 'paused' | 'completed';
  provider: string;
  createdAt?: admin.firestore.Timestamp;
}

export interface MessageTemplate {
  id?: string;
  templateName: string;
  campaignName: string;
  templateId: string;
  dayNumber: number;
  messageContent: string;
  variables: string[];
  active: boolean;
}

export interface MessageLog {
  id?: string;
  customerId: string;
  journeyId: string;
  phone: string;
  templateName: string;
  response: string | null;
  status: 'sent' | 'failed' | 'pending';
  sentAt?: admin.firestore.Timestamp;
  error: string | null;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getDb() {
  const app = getFirebaseAdmin();
  return admin.firestore(app);
}

/**
 * Convert a Firestore document snapshot to a plain object with `id` field.
 */
function docToObject<T>(doc: admin.firestore.DocumentSnapshot): T & { id: string } {
  return { id: doc.id, ...(doc.data() as T) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Upsert a customer by phone number.
 * If a customer with the same phone already exists, return the existing doc.
 * Otherwise, create a new one.
 */
export async function upsertCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<string> {
  const db = getDb();
  const col = db.collection('customers');

  // Check if customer already exists by phone
  const existing = await col.where('phone', '==', customer.phone).limit(1).get();

  if (!existing.empty) {
    const existingDoc = existing.docs[0];
    // Update name/email if changed
    await existingDoc.ref.update({
      customerName: customer.customerName,
      email: customer.email,
    });
    return existingDoc.id;
  }

  // Create new customer
  const docRef = await col.add({
    ...customer,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`👤 Customer created: ${customer.customerName} (${customer.phone})`);
  return docRef.id;
}

/**
 * Get a customer by ID.
 */
export async function getCustomerById(customerId: string): Promise<(Customer & { id: string }) | null> {
  const db = getDb();
  const doc = await db.collection('customers').doc(customerId).get();
  if (!doc.exists) return null;
  return docToObject<Customer>(doc);
}

/**
 * Get all customers.
 */
export async function getAllCustomers(): Promise<(Customer & { id: string })[]> {
  const db = getDb();
  const snapshot = await db.collection('customers').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => docToObject<Customer>(doc));
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOURNEYS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new journey document.
 */
export async function createJourney(
  journey: Omit<Journey, 'id' | 'createdAt'>
): Promise<string> {
  const db = getDb();
  const docRef = await db.collection('journeys').add({
    ...journey,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`🚀 Journey created: ${docRef.id} for order ${journey.orderId}`);
  return docRef.id;
}

/**
 * Get all active journeys.
 */
export async function getActiveJourneys(): Promise<(Journey & { id: string })[]> {
  const db = getDb();
  const snapshot = await db
    .collection('journeys')
    .where('status', '==', 'active')
    .get();

  return snapshot.docs.map((doc) => docToObject<Journey>(doc));
}

/**
 * Get all journeys (with optional status filter).
 */
export async function getAllJourneys(status?: string): Promise<(Journey & { id: string })[]> {
  const db = getDb();
  let query: admin.firestore.Query = db.collection('journeys').orderBy('createdAt', 'desc');

  if (status && status !== 'all') {
    query = query.where('status', '==', status);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => docToObject<Journey>(doc));
}

/**
 * Get a journey by ID.
 */
export async function getJourneyById(journeyId: string): Promise<(Journey & { id: string }) | null> {
  const db = getDb();
  const doc = await db.collection('journeys').doc(journeyId).get();
  if (!doc.exists) return null;
  return docToObject<Journey>(doc);
}

/**
 * Update journey progress after a message is sent.
 */
export async function updateJourneyProgress(
  journeyId: string,
  currentDay: number,
  lastMessageSent: string,
  nextMessageDate: Date
): Promise<void> {
  const db = getDb();
  await db.collection('journeys').doc(journeyId).update({
    currentDay,
    lastMessageSent,
    nextMessageDate: admin.firestore.Timestamp.fromDate(nextMessageDate),
  });
}

/**
 * Update journey status (active/paused/completed).
 */
export async function updateJourneyStatus(
  journeyId: string,
  status: 'active' | 'paused' | 'completed'
): Promise<void> {
  const db = getDb();
  await db.collection('journeys').doc(journeyId).update({ status });
  console.log(`📋 Journey ${journeyId} status updated to: ${status}`);
}

/**
 * Check if a message for a specific day was already sent in a journey.
 * Prevents duplicate sends.
 */
export async function wasMessageAlreadySent(
  journeyId: string,
  dayNumber: number
): Promise<boolean> {
  const db = getDb();
  const snapshot = await db
    .collection('message_logs')
    .where('journeyId', '==', journeyId)
    .where('templateName', '>=', '')
    .get();

  // Check if any log entry matches the day's template
  const templates = await getTemplateByDay(dayNumber);
  if (!templates) return false;

  return snapshot.docs.some(
    (doc) =>
      doc.data().templateName === templates.templateName &&
      doc.data().status === 'sent'
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all message templates.
 */
export async function getAllTemplates(): Promise<(MessageTemplate & { id: string })[]> {
  const db = getDb();
  const snapshot = await db
    .collection('message_templates')
    .orderBy('dayNumber', 'asc')
    .get();

  return snapshot.docs.map((doc) => docToObject<MessageTemplate>(doc));
}

/**
 * Get a template mapped to a specific day number.
 */
export async function getTemplateByDay(
  dayNumber: number
): Promise<(MessageTemplate & { id: string }) | null> {
  const db = getDb();
  const snapshot = await db
    .collection('message_templates')
    .where('dayNumber', '==', dayNumber)
    .where('active', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return docToObject<MessageTemplate>(snapshot.docs[0]);
}

/**
 * Create a new template mapping.
 */
export async function createTemplate(
  template: Omit<MessageTemplate, 'id'>
): Promise<string> {
  const db = getDb();
  const docRef = await db.collection('message_templates').add(template);
  console.log(`📝 Template mapped: ${template.templateName} → Day ${template.dayNumber}`);
  return docRef.id;
}

/**
 * Update a template mapping.
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<MessageTemplate>
): Promise<void> {
  const db = getDb();
  await db.collection('message_templates').doc(templateId).update(updates);
}

/**
 * Delete a template mapping.
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  const db = getDb();
  await db.collection('message_templates').doc(templateId).delete();
  console.log(`🗑️ Template deleted: ${templateId}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE LOGS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get message logs with optional filters.
 */
export async function getMessageLogs(filters?: {
  status?: string;
  customerId?: string;
  limit?: number;
}): Promise<(MessageLog & { id: string })[]> {
  const db = getDb();
  let query: admin.firestore.Query = db.collection('message_logs').orderBy('sentAt', 'desc');

  if (filters?.status && filters.status !== 'all') {
    query = query.where('status', '==', filters.status);
  }

  if (filters?.customerId) {
    query = query.where('customerId', '==', filters.customerId);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(100); // Default limit
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => docToObject<MessageLog>(doc));
}

/**
 * Get analytics data — aggregated counts.
 */
export async function getAnalytics(): Promise<{
  totalMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  activeJourneys: number;
  completedJourneys: number;
  totalCustomers: number;
  journeyCompletionRate: number;
}> {
  const db = getDb();

  // Count message logs by status
  const [allLogs, sentLogs, failedLogs, activeJ, completedJ, customers] = await Promise.all([
    db.collection('message_logs').count().get(),
    db.collection('message_logs').where('status', '==', 'sent').count().get(),
    db.collection('message_logs').where('status', '==', 'failed').count().get(),
    db.collection('journeys').where('status', '==', 'active').count().get(),
    db.collection('journeys').where('status', '==', 'completed').count().get(),
    db.collection('customers').count().get(),
  ]);

  const totalMessages = allLogs.data().count;
  const delivered = sentLogs.data().count;
  const failed = failedLogs.data().count;
  const active = activeJ.data().count;
  const completed = completedJ.data().count;
  const totalCustomers = customers.data().count;
  const totalJourneys = active + completed;

  return {
    totalMessages,
    deliveredMessages: delivered,
    failedMessages: failed,
    activeJourneys: active,
    completedJourneys: completed,
    totalCustomers,
    journeyCompletionRate: totalJourneys > 0 ? Math.round((completed / totalJourneys) * 100) : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

export interface TestOrderMetadata {
  orderId: string;
  isTestOrder: boolean;
  markedBy: string;
  markedAt: admin.firestore.Timestamp | any;
  ip: string;
  device: string;
}

/**
 * Mark or unmark an order as a test order in the test_orders collection.
 */
export async function markOrderAsTest(
  orderId: string,
  isTest: boolean,
  audit: { markedBy: string; ip: string; device: string }
): Promise<void> {
  const db = getDb();
  const docRef = db.collection('test_orders').doc(String(orderId));

  if (isTest) {
    await docRef.set({
      orderId: String(orderId),
      isTestOrder: true,
      markedBy: audit.markedBy,
      markedAt: admin.firestore.FieldValue.serverTimestamp(),
      ip: audit.ip,
      device: audit.device,
    });
    console.log(`🧪 Order ${orderId} marked as Test Order by ${audit.markedBy}`);
  } else {
    await docRef.delete();
    console.log(`🔓 Test Order status removed from order ${orderId} by ${audit.markedBy}`);
  }
}

/**
 * Retrieve a Set of all test order IDs from the database.
 */
export async function getAllTestOrderIds(): Promise<Set<string>> {
  try {
    const db = getDb();
    const snapshot = await db.collection('test_orders').get();
    const ids = new Set<string>();
    snapshot.forEach((doc) => {
      ids.add(doc.id);
    });
    return ids;
  } catch (error) {
    console.error('❌ Failed to retrieve test order IDs:', error);
    return new Set<string>();
  }
}


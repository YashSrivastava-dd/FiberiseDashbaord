/**
 * Journey Service — WhatsApp Journey Lifecycle Management
 *
 * Orchestrates the entire journey flow:
 *  1. Customer places order → journey created
 *  2. Day 0 → immediate order confirmation
 *  3. Day N → scheduled message based on template mapping
 *
 * This service ties together Firestore operations and WhatsApp sending.
 */

import {
  upsertCustomer,
  createJourney as createJourneyDoc,
  getActiveJourneys,
  getTemplateByDay,
  updateJourneyProgress,
  updateJourneyStatus,
  wasMessageAlreadySent,
  getCustomerById,
  getAllTemplates,
} from './firestore.service';
import { sendWhatsAppTemplate, normalizePhoneNumber } from './whatsapp.service';
import admin from 'firebase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderData {
  orderId: string;
  orderAmount: number;
  products: string[];
  customer: {
    name: string;
    phone: string;
    email: string;
  };
}

// ─── Journey Creation ─────────────────────────────────────────────────────────

/**
 * Create a full journey from a Shopify order.
 *
 * Steps:
 *  1. Upsert customer in Firestore
 *  2. Create journey document
 *  3. Send Day 0 order confirmation (if template exists)
 */
export async function createJourneyFromOrder(order: OrderData): Promise<{
  customerId: string;
  journeyId: string;
  confirmationSent: boolean;
}> {
  console.log(`\n🛒 Creating journey for order: ${order.orderId}`);

  // Step 1: Upsert customer
  const customerId = await upsertCustomer({
    customerName: order.customer.name,
    phone: normalizePhoneNumber(order.customer.phone),
    email: order.customer.email,
    source: 'shopify',
  });

  // Step 2: Create journey document
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0); // Next message at 10 AM next day

  const journeyId = await createJourneyDoc({
    customerId,
    orderId: order.orderId,
    orderAmount: order.orderAmount,
    products: order.products,
    orderDate: admin.firestore.Timestamp.fromDate(now),
    currentDay: 0,
    nextMessageDate: admin.firestore.Timestamp.fromDate(tomorrow),
    lastMessageSent: '',
    status: 'active',
    provider: 'aisensy',
  });

  // Step 3: Send Day 0 — Order Confirmation
  let confirmationSent = false;
  const day0Template = await getTemplateByDay(0);

  if (day0Template) {
    // Build template params by replacing variable placeholders
    const params = buildTemplateParams(day0Template.variables, {
      customer_name: order.customer.name,
      product_name: order.products.join(', '),
      order_amount: `₹${order.orderAmount}`,
      order_id: order.orderId,
    });

    const result = await sendWhatsAppTemplate({
      phone: order.customer.phone,
      templateName: day0Template.templateName,
      campaignName: day0Template.campaignName,
      params,
      userName: order.customer.name,
      source: 'shopify',
      journeyId,
      customerId,
    });

    confirmationSent = result.success;

    // Update journey with Day 0 progress
    if (result.success) {
      await updateJourneyProgress(journeyId, 0, day0Template.templateName, tomorrow);
    }
  } else {
    console.warn('⚠️ No Day 0 template found — skipping order confirmation');
  }

  console.log(`✅ Journey ${journeyId} created. Confirmation sent: ${confirmationSent}`);

  return { customerId, journeyId, confirmationSent };
}

// ─── Journey Tick Processing ──────────────────────────────────────────────────

/**
 * Process all active journeys — called by the cron scheduler.
 *
 * For each active journey:
 *  1. Calculate days elapsed since orderDate
 *  2. Find the matching template for the current day
 *  3. Send the WhatsApp message if not already sent
 *  4. Update journey progress
 */
export async function processAllJourneys(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  completed: number;
}> {
  console.log('\n⏰ Journey Scheduler: Processing active journeys...');

  const journeys = await getActiveJourneys();
  const stats = { processed: 0, sent: 0, skipped: 0, failed: 0, completed: 0 };

  if (journeys.length === 0) {
    console.log('📭 No active journeys to process');
    return stats;
  }

  // Fetch test order IDs to exclude notifications for test orders
  let testOrderIds = new Set<string>();
  try {
    const { getAllTestOrderIds } = require('./firestore.service');
    testOrderIds = await getAllTestOrderIds();
  } catch (err) {
    console.error('⚠️ Failed to load test order IDs in scheduler:', err);
  }

  console.log(`📋 Found ${journeys.length} active journeys`);

  // Get all active templates to know the max day
  const allTemplates = await getAllTemplates();
  const activeDays = allTemplates
    .filter((t) => t.active)
    .map((t) => t.dayNumber)
    .sort((a, b) => a - b);
  const maxDay = activeDays.length > 0 ? Math.max(...activeDays) : 5;

  for (const journey of journeys) {
    stats.processed++;

    try {
      // Prevent customer notifications if order is marked as a test order
      if (testOrderIds.has(String(journey.orderId))) {
        console.log(`🧪 Journey ${journey.id} belongs to Test Order ${journey.orderId} — automatically completing journey without notifications`);
        await updateJourneyStatus(journey.id, 'completed');
        stats.completed++;
        continue;
      }

      // Calculate days elapsed since order
      const orderDate = journey.orderDate.toDate();
      const now = new Date();
      const daysElapsed = Math.floor(
        (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log(
        `  📌 Journey ${journey.id}: Day ${daysElapsed} (currentDay: ${journey.currentDay})`
      );

      // Skip if we haven't reached a new day yet
      if (daysElapsed <= journey.currentDay) {
        stats.skipped++;
        continue;
      }

      // Check if journey should be completed (past max template day)
      if (daysElapsed > maxDay && journey.currentDay >= maxDay) {
        await updateJourneyStatus(journey.id, 'completed');
        stats.completed++;
        console.log(`  🏁 Journey ${journey.id} completed (all messages sent)`);
        continue;
      }

      // Find template for the current day
      const template = await getTemplateByDay(daysElapsed);

      if (!template) {
        // No template for this day — skip but don't mark as completed
        stats.skipped++;
        continue;
      }

      // Check for duplicate — prevent re-sending the same day's message
      const alreadySent = await wasMessageAlreadySent(journey.id, daysElapsed);
      if (alreadySent) {
        stats.skipped++;
        console.log(`  ⏭️ Day ${daysElapsed} already sent for journey ${journey.id}`);
        continue;
      }

      // Fetch customer details for template params
      const customer = await getCustomerById(journey.customerId);
      if (!customer) {
        stats.failed++;
        console.error(`  ❌ Customer ${journey.customerId} not found for journey ${journey.id}`);
        continue;
      }

      // Build template params
      const params = buildTemplateParams(template.variables, {
        customer_name: customer.customerName,
        product_name: journey.products.join(', '),
        order_amount: `₹${journey.orderAmount}`,
        order_id: journey.orderId,
      });

      // Send WhatsApp message
      const result = await sendWhatsAppTemplate({
        phone: customer.phone,
        templateName: template.templateName,
        campaignName: template.campaignName,
        params,
        userName: customer.customerName,
        journeyId: journey.id,
        customerId: journey.customerId,
      });

      if (result.success) {
        // Calculate next message date
        const nextDay = findNextTemplateDay(daysElapsed, activeDays);
        const nextDate = new Date(orderDate);
        nextDate.setDate(nextDate.getDate() + nextDay);
        nextDate.setHours(10, 0, 0, 0);

        await updateJourneyProgress(journey.id, daysElapsed, template.templateName, nextDate);
        stats.sent++;
        console.log(`  ✅ Day ${daysElapsed} message sent for journey ${journey.id}`);
      } else {
        stats.failed++;
        console.error(`  ❌ Failed to send Day ${daysElapsed} for journey ${journey.id}`);
      }
    } catch (error) {
      stats.failed++;
      console.error(`  ❌ Error processing journey ${journey.id}:`, error);
    }
  }

  console.log(
    `\n📊 Scheduler Summary: ${stats.processed} processed, ${stats.sent} sent, ${stats.skipped} skipped, ${stats.failed} failed, ${stats.completed} completed\n`
  );

  return stats;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build an ordered array of template parameter values from variable names.
 *
 * Variables like ["customer_name", "order_id"] get mapped to their actual values.
 */
function buildTemplateParams(
  variables: string[],
  valueMap: Record<string, string>
): string[] {
  return variables.map((variable) => {
    // Strip curly braces if present: {{customer_name}} → customer_name
    const key = variable.replace(/\{\{|\}\}/g, '').trim();
    return valueMap[key] || variable;
  });
}

/**
 * Find the next template day after the current day.
 * If no more days, return current + 1 (journey will be completed on next tick).
 */
function findNextTemplateDay(currentDay: number, activeDays: number[]): number {
  const nextDay = activeDays.find((d) => d > currentDay);
  return nextDay !== undefined ? nextDay : currentDay + 1;
}

/**
 * Scheduler Initialization
 *
 * Starts the journey scheduler cron job.
 * This is imported by Next.js instrumentation to run on server startup.
 */

import { startJourneyScheduler } from './journeyScheduler';

let initialized = false;

/**
 * Initialize the scheduler. Safe to call multiple times —
 * will only start once.
 */
export function initScheduler(): void {
  if (initialized) {
    console.log('📌 Scheduler already initialized');
    return;
  }

  try {
    startJourneyScheduler();
    initialized = true;
    console.log('🚀 Journey scheduler initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize scheduler:', error);
  }
}

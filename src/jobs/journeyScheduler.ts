/**
 * Journey Scheduler — node-cron based hourly job
 *
 * Runs every hour to process active journeys:
 *  - Fetch active journeys from Firestore
 *  - Calculate days elapsed since order
 *  - Match template for current day
 *  - Send WhatsApp message via AiSensy
 *  - Update journey progress
 *  - Prevent duplicate sends
 *
 * The scheduler is idempotent — safe to restart at any time.
 */

import cron, { ScheduledTask } from 'node-cron';
import { processAllJourneys } from '@/src/services/journey.service';

let schedulerTask: ScheduledTask | null = null;
let isRunning = false;
let lastRunAt: Date | null = null;
let lastRunStats: any = null;

/**
 * Start the journey scheduler cron job.
 * Runs every hour at minute 0.
 */
export function startJourneyScheduler(): void {
  if (schedulerTask) {
    console.log('⚠️ Journey scheduler is already running');
    return;
  }

  // Run every hour at minute 0: "0 * * * *"
  schedulerTask = cron.schedule('0 * * * *', async () => {
    if (isRunning) {
      console.log('⏳ Scheduler tick skipped — previous run still in progress');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`📅 Journey Scheduler Tick — ${new Date().toISOString()}`);
      console.log(`${'═'.repeat(60)}`);

      lastRunStats = await processAllJourneys();
      lastRunAt = new Date();

      const duration = Date.now() - startTime;
      console.log(`⏱️ Scheduler completed in ${duration}ms`);
    } catch (error) {
      console.error('💥 Journey scheduler error:', error);
    } finally {
      isRunning = false;
    }
  });

  console.log('✅ Journey scheduler started — running every hour at :00');
}

/**
 * Stop the journey scheduler.
 */
export function stopJourneyScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('⏹️ Journey scheduler stopped');
  }
}

/**
 * Manually trigger a scheduler tick (for testing/admin use).
 */
export async function triggerSchedulerManually(): Promise<any> {
  if (isRunning) {
    return { error: 'Scheduler is already running' };
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    console.log('\n🔧 Manual scheduler trigger...');
    const stats = await processAllJourneys();
    lastRunAt = new Date();
    lastRunStats = stats;
    const duration = Date.now() - startTime;
    return { success: true, stats, duration: `${duration}ms` };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    isRunning = false;
  }
}

/**
 * Get current scheduler status.
 */
export function getSchedulerStatus() {
  return {
    running: !!schedulerTask,
    currentlyProcessing: isRunning,
    lastRunAt: lastRunAt?.toISOString() || null,
    lastRunStats,
    schedule: '0 * * * * (every hour at :00)',
  };
}

/**
 * Next.js Instrumentation Hook
 *
 * This file is automatically loaded by Next.js on server startup.
 * It initializes the journey scheduler cron job.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the Node.js server runtime (not edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // const { initScheduler } = await import('@/src/jobs/initScheduler');
    // initScheduler();
    console.log('📌 Journey scheduler background cron job is disabled');
  }
}

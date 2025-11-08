/**
 * Worker Starter Script
 * Sprint 10 Week 1 - Background Jobs
 *
 * Entry point for starting BullMQ workers and cron schedulers.
 * Handles graceful shutdown and error recovery.
 *
 * Usage:
 *   pnpm workers              # Start all workers and schedulers
 *   pnpm workers --no-cron    # Start only workers (no schedulers)
 *   pnpm workers --cron-only  # Start only schedulers (no workers)
 */

import { Worker } from 'bullmq';
import { createWorker, closeQueue, healthCheck } from './queue';
import { processAggregationJob } from './aggregation-job';
import {
  initializeScheduler,
  startScheduler,
  stopScheduler,
  destroyScheduler,
  getSchedulerStatus,
} from './scheduler';

/**
 * Global worker instance
 */
let worker: Worker | null = null;

/**
 * Shutdown flag
 */
let isShuttingDown = false;

/**
 * Parse command line arguments
 */
function parseArgs(): {
  noCron: boolean;
  cronOnly: boolean;
  help: boolean;
} {
  const args = process.argv.slice(2);

  return {
    noCron: args.includes('--no-cron'),
    cronOnly: args.includes('--cron-only'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

/**
 * Display help message
 */
function showHelp(): void {
  console.log(`
Analytics Workers - Background Job Processing

Usage:
  pnpm workers [options]

Options:
  --no-cron      Start only workers (no cron schedulers)
  --cron-only    Start only cron schedulers (no workers)
  --help, -h     Show this help message

Examples:
  pnpm workers              # Start everything
  pnpm workers --no-cron    # Workers only
  pnpm workers --cron-only  # Schedulers only

Environment Variables:
  REDIS_HOST     Redis server host (default: localhost)
  REDIS_PORT     Redis server port (default: 6379)
  REDIS_PASSWORD Redis password (optional)
  REDIS_DB       Redis database number (default: 0)
  TZ             Timezone for cron jobs (default: America/New_York)
`);
}

/**
 * Start BullMQ workers
 */
async function startWorkers(): Promise<void> {
  console.log('[Workers] Starting BullMQ workers...');

  // Create worker with job processor
  worker = createWorker(async (job) => {
    console.log(`[Workers] Processing job ${job.id} (${job.name})`);

    switch (job.name) {
      case 'aggregation':
        return await processAggregationJob(job as any);

      case 'export':
        // TODO: Implement export job processor
        console.log('[Workers] Export job processor not yet implemented');
        return { success: true, message: 'Export not implemented' };

      case 'scheduled-report':
        // TODO: Implement scheduled report processor
        console.log('[Workers] Scheduled report processor not yet implemented');
        return { success: true, message: 'Scheduled report not implemented' };

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  });

  console.log('[Workers] BullMQ workers started successfully');
}

/**
 * Start cron schedulers
 */
function startCronSchedulers(): void {
  console.log('[Workers] Starting cron schedulers...');

  initializeScheduler();
  startScheduler();

  const status = getSchedulerStatus();
  console.log('[Workers] Cron schedulers started:', status);
}

/**
 * Stop BullMQ workers
 */
async function stopWorkers(): Promise<void> {
  if (worker) {
    console.log('[Workers] Stopping BullMQ workers...');
    await worker.close();
    worker = null;
    console.log('[Workers] BullMQ workers stopped');
  }
}

/**
 * Stop cron schedulers
 */
function stopCronSchedulers(): void {
  console.log('[Workers] Stopping cron schedulers...');
  stopScheduler();
  destroyScheduler();
  console.log('[Workers] Cron schedulers stopped');
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.log('[Workers] Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;

  console.log(`\n[Workers] Received ${signal}, starting graceful shutdown...`);

  try {
    // Stop accepting new jobs
    stopCronSchedulers();

    // Wait for current jobs to complete (with timeout)
    console.log('[Workers] Waiting for active jobs to complete...');
    await stopWorkers();

    // Close queue connections
    console.log('[Workers] Closing queue connections...');
    await closeQueue();

    console.log('[Workers] Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('[Workers] Error during shutdown:', error);
    process.exit(1);
  }
}

/**
 * Error handler for uncaught exceptions
 */
function handleUncaughtError(error: Error): void {
  console.error(`[Workers] Uncaught error:`, error);

  // Don't exit immediately - log error and continue
  // Workers should be resilient to individual job failures
  console.error('[Workers] Worker will continue running despite error');
}

/**
 * Health check timer
 */
function startHealthCheck(intervalMs: number = 60000): NodeJS.Timeout {
  console.log(`[Workers] Starting health check (every ${intervalMs / 1000}s)...`);

  return setInterval(async () => {
    try {
      const health = await healthCheck();

      if (health.healthy) {
        console.log('[Workers] Health check: OK', health.metrics);
      } else {
        console.error('[Workers] Health check: FAILED', health.error);
      }
    } catch (error) {
      console.error('[Workers] Health check error:', error);
    }
  }, intervalMs);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = parseArgs();

  // Show help if requested
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log('='.repeat(60));
  console.log('Analytics Workers - Background Job Processing');
  console.log('Sprint 10 Week 1 - Advanced Analytics');
  console.log('='.repeat(60));

  try {
    // Run health check
    console.log('[Workers] Running initial health check...');
    const health = await healthCheck();

    if (!health.healthy) {
      console.error('[Workers] Health check failed:', health.error);
      console.error('[Workers] Cannot start workers - fix issues and try again');
      process.exit(1);
    }

    console.log('[Workers] Health check passed:', health.metrics);

    // Start workers and/or schedulers based on args
    if (args.cronOnly) {
      console.log('[Workers] Mode: Cron schedulers only');
      startCronSchedulers();
    } else if (args.noCron) {
      console.log('[Workers] Mode: Workers only');
      await startWorkers();
    } else {
      console.log('[Workers] Mode: Workers + Cron schedulers');
      await startWorkers();
      startCronSchedulers();
    }

    // Start health check monitoring
    const healthCheckTimer = startHealthCheck(60000); // Every 60 seconds

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Register error handlers
    process.on('uncaughtException', (error) => handleUncaughtError(error));
    process.on('unhandledRejection', (error) =>
      handleUncaughtError(error as Error)
    );

    console.log('='.repeat(60));
    console.log('[Workers] All systems started successfully');
    console.log('[Workers] Press CTRL+C to shutdown gracefully');
    console.log('='.repeat(60));

    // Keep process alive
    process.stdin.resume();
  } catch (error) {
    console.error('[Workers] Fatal error during startup:', error);
    process.exit(1);
  }
}

// Start the workers
if (require.main === module) {
  main().catch((error) => {
    console.error('[Workers] Fatal error:', error);
    process.exit(1);
  });
}

// Export for programmatic use
export { startWorkers, stopWorkers, startCronSchedulers, stopCronSchedulers, gracefulShutdown };

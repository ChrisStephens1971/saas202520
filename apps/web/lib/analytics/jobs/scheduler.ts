/**
 * Job Scheduler
 * Sprint 10 Week 1 - Background Jobs
 *
 * Schedules recurring analytics aggregation jobs using node-cron.
 * Runs aggregations at regular intervals for all tenants.
 */

import cron from 'node-cron';
import { addJob, AggregationJobData } from './queue';
import { createJobOptions } from './aggregation-job';

/**
 * Scheduled job task interface
 */
interface ScheduledTask {
  name: string;
  schedule: string;
  task: cron.ScheduledTask;
  enabled: boolean;
}

/**
 * Active scheduled tasks
 */
const scheduledTasks: Map<string, ScheduledTask> = new Map();

/**
 * Schedule hourly aggregation for all tenants
 *
 * Runs every hour at the top of the hour (e.g., 1:00, 2:00, 3:00)
 * Aggregates data for the previous hour/day/week/month as appropriate
 */
export function scheduleHourlyAggregation(): void {
  const taskName = 'hourly-aggregation';

  // Check if already scheduled
  if (scheduledTasks.has(taskName)) {
    console.log(`[Scheduler] Task '${taskName}' is already scheduled`);
    return;
  }

  // Cron expression: Run at minute 0 of every hour
  // '0 * * * *' = At minute 0 past every hour
  const schedule = '0 * * * *';

  const task = cron.schedule(
    schedule,
    async () => {
      console.log('[Scheduler] Running hourly aggregation...');

      try {
        // Queue aggregation job for all tenants
        const jobData: AggregationJobData = {
          type: 'all', // Run all aggregation types
        };

        const jobOptions = createJobOptions({
          priority: 'LOW', // Background job, low priority
          attempts: 3,
        });

        const job = await addJob('aggregation', jobData, jobOptions);

        console.log(`[Scheduler] Hourly aggregation job queued: ${job.id}`);
      } catch (error) {
        console.error('[Scheduler] Failed to queue hourly aggregation:', error);
      }
    },
    {
      scheduled: false, // Don't start immediately
      timezone: process.env.TZ || 'America/New_York',
    }
  );

  scheduledTasks.set(taskName, {
    name: taskName,
    schedule,
    task,
    enabled: false,
  });

  console.log(`[Scheduler] Scheduled task '${taskName}' created with cron: ${schedule}`);
}

/**
 * Schedule daily revenue aggregation
 *
 * Runs every day at midnight to aggregate the previous day's revenue
 */
export function scheduleDailyRevenueAggregation(): void {
  const taskName = 'daily-revenue';

  if (scheduledTasks.has(taskName)) {
    console.log(`[Scheduler] Task '${taskName}' is already scheduled`);
    return;
  }

  // Cron expression: Run at midnight every day
  // '0 0 * * *' = At 00:00 (midnight) every day
  const schedule = '0 0 * * *';

  const task = cron.schedule(
    schedule,
    async () => {
      console.log('[Scheduler] Running daily revenue aggregation...');

      try {
        const jobData: AggregationJobData = {
          type: 'revenue',
          periodType: 'day',
        };

        const jobOptions = createJobOptions({
          priority: 'NORMAL',
          attempts: 3,
        });

        const job = await addJob('aggregation', jobData, jobOptions);

        console.log(`[Scheduler] Daily revenue aggregation job queued: ${job.id}`);
      } catch (error) {
        console.error('[Scheduler] Failed to queue daily revenue aggregation:', error);
      }
    },
    {
      scheduled: false,
      timezone: process.env.TZ || 'America/New_York',
    }
  );

  scheduledTasks.set(taskName, {
    name: taskName,
    schedule,
    task,
    enabled: false,
  });

  console.log(`[Scheduler] Scheduled task '${taskName}' created with cron: ${schedule}`);
}

/**
 * Schedule monthly cohort analysis
 *
 * Runs on the first day of each month to analyze user cohorts
 */
export function scheduleMonthlyCohortAnalysis(): void {
  const taskName = 'monthly-cohorts';

  if (scheduledTasks.has(taskName)) {
    console.log(`[Scheduler] Task '${taskName}' is already scheduled`);
    return;
  }

  // Cron expression: Run at 1:00 AM on the 1st of every month
  // '0 1 1 * *' = At 01:00 on day-of-month 1
  const schedule = '0 1 1 * *';

  const task = cron.schedule(
    schedule,
    async () => {
      console.log('[Scheduler] Running monthly cohort analysis...');

      try {
        const jobData: AggregationJobData = {
          type: 'cohorts',
        };

        const jobOptions = createJobOptions({
          priority: 'NORMAL',
          attempts: 3,
        });

        const job = await addJob('aggregation', jobData, jobOptions);

        console.log(`[Scheduler] Monthly cohort analysis job queued: ${job.id}`);
      } catch (error) {
        console.error('[Scheduler] Failed to queue monthly cohort analysis:', error);
      }
    },
    {
      scheduled: false,
      timezone: process.env.TZ || 'America/New_York',
    }
  );

  scheduledTasks.set(taskName, {
    name: taskName,
    schedule,
    task,
    enabled: false,
  });

  console.log(`[Scheduler] Scheduled task '${taskName}' created with cron: ${schedule}`);
}

/**
 * Schedule weekly tournament aggregation
 *
 * Runs every Monday at 2:00 AM to aggregate the previous week's tournaments
 */
export function scheduleWeeklyTournamentAggregation(): void {
  const taskName = 'weekly-tournaments';

  if (scheduledTasks.has(taskName)) {
    console.log(`[Scheduler] Task '${taskName}' is already scheduled`);
    return;
  }

  // Cron expression: Run at 2:00 AM every Monday
  // '0 2 * * 1' = At 02:00 on Monday
  const schedule = '0 2 * * 1';

  const task = cron.schedule(
    schedule,
    async () => {
      console.log('[Scheduler] Running weekly tournament aggregation...');

      try {
        const jobData: AggregationJobData = {
          type: 'tournaments',
          periodType: 'week',
        };

        const jobOptions = createJobOptions({
          priority: 'NORMAL',
          attempts: 3,
        });

        const job = await addJob('aggregation', jobData, jobOptions);

        console.log(`[Scheduler] Weekly tournament aggregation job queued: ${job.id}`);
      } catch (error) {
        console.error('[Scheduler] Failed to queue weekly tournament aggregation:', error);
      }
    },
    {
      scheduled: false,
      timezone: process.env.TZ || 'America/New_York',
    }
  );

  scheduledTasks.set(taskName, {
    name: taskName,
    schedule,
    task,
    enabled: false,
  });

  console.log(`[Scheduler] Scheduled task '${taskName}' created with cron: ${schedule}`);
}

/**
 * Schedule hourly scheduled reports check
 *
 * Runs every hour to check for reports that are due to run
 */
export function scheduleReportsCheck(): void {
  const taskName = 'hourly-reports-check';

  if (scheduledTasks.has(taskName)) {
    console.log(`[Scheduler] Task '${taskName}' is already scheduled`);
    return;
  }

  // Cron expression: Run every hour at minute 5
  // '5 * * * *' = At minute 5 past every hour
  const schedule = '5 * * * *';

  const task = cron.schedule(
    schedule,
    async () => {
      console.log('[Scheduler] Running scheduled reports check...');

      try {
        // Import dynamically to avoid circular dependencies
        const { scheduleReports } = await import('./report-generation-job');
        await scheduleReports();
      } catch (error) {
        console.error('[Scheduler] Failed to check scheduled reports:', error);
      }
    },
    {
      scheduled: false,
      timezone: process.env.TZ || 'America/New_York',
    }
  );

  scheduledTasks.set(taskName, {
    name: taskName,
    schedule,
    task,
    enabled: false,
  });

  console.log(`[Scheduler] Scheduled task '${taskName}' created with cron: ${schedule}`);
}

/**
 * Initialize all scheduled tasks
 *
 * Creates all scheduled jobs but doesn't start them.
 * Call startScheduler() to begin execution.
 */
export function initializeScheduler(): void {
  console.log('[Scheduler] Initializing scheduled tasks...');

  scheduleHourlyAggregation();
  scheduleDailyRevenueAggregation();
  scheduleMonthlyCohortAnalysis();
  scheduleWeeklyTournamentAggregation();
  scheduleReportsCheck();

  console.log(`[Scheduler] ${scheduledTasks.size} tasks initialized`);
}

/**
 * Start all scheduled tasks
 *
 * Begins executing all scheduled jobs according to their cron schedules.
 */
export function startScheduler(): void {
  console.log('[Scheduler] Starting all scheduled tasks...');

  let startedCount = 0;

  scheduledTasks.forEach((scheduledTask, name) => {
    if (!scheduledTask.enabled) {
      scheduledTask.task.start();
      scheduledTask.enabled = true;
      startedCount++;
      console.log(`[Scheduler] Started task: ${name} (${scheduledTask.schedule})`);
    }
  });

  console.log(`[Scheduler] ${startedCount} tasks started`);
}

/**
 * Stop all scheduled tasks
 *
 * Stops executing scheduled jobs. Jobs can be restarted with startScheduler().
 */
export function stopScheduler(): void {
  console.log('[Scheduler] Stopping all scheduled tasks...');

  let stoppedCount = 0;

  scheduledTasks.forEach((scheduledTask, name) => {
    if (scheduledTask.enabled) {
      scheduledTask.task.stop();
      scheduledTask.enabled = false;
      stoppedCount++;
      console.log(`[Scheduler] Stopped task: ${name}`);
    }
  });

  console.log(`[Scheduler] ${stoppedCount} tasks stopped`);
}

/**
 * Destroy all scheduled tasks
 *
 * Completely removes all scheduled tasks. Cannot be restarted without re-initialization.
 */
export function destroyScheduler(): void {
  console.log('[Scheduler] Destroying all scheduled tasks...');

  scheduledTasks.forEach((scheduledTask, name) => {
    scheduledTask.task.stop();
    scheduledTask.task.destroy();
    console.log(`[Scheduler] Destroyed task: ${name}`);
  });

  scheduledTasks.clear();

  console.log('[Scheduler] All tasks destroyed');
}

/**
 * Get status of all scheduled tasks
 *
 * @returns Array of task status information
 */
export function getSchedulerStatus(): Array<{
  name: string;
  schedule: string;
  enabled: boolean;
}> {
  return Array.from(scheduledTasks.values()).map((task) => ({
    name: task.name,
    schedule: task.schedule,
    enabled: task.enabled,
  }));
}

/**
 * Manually trigger a specific scheduled task
 *
 * Useful for testing or manual execution outside the regular schedule.
 *
 * @param taskName - Name of the task to trigger
 * @returns Success status
 */
export async function triggerTask(taskName: string): Promise<boolean> {
  const scheduledTask = scheduledTasks.get(taskName);

  if (!scheduledTask) {
    console.error(`[Scheduler] Task '${taskName}' not found`);
    return false;
  }

  console.log(`[Scheduler] Manually triggering task: ${taskName}`);

  try {
    // Get the task function and execute it
    // Note: We need to extract the function from the cron task
    // For now, we'll queue a job directly based on the task type
    let jobData: AggregationJobData;

    switch (taskName) {
      case 'hourly-aggregation':
        jobData = { type: 'all' };
        break;
      case 'daily-revenue':
        jobData = { type: 'revenue', periodType: 'day' };
        break;
      case 'monthly-cohorts':
        jobData = { type: 'cohorts' };
        break;
      case 'weekly-tournaments':
        jobData = { type: 'tournaments', periodType: 'week' };
        break;
      case 'hourly-reports-check':
        // Trigger scheduled reports check manually
        const { scheduleReports } = await import('./report-generation-job');
        await scheduleReports();
        return true;
      default:
        throw new Error(`Unknown task type: ${taskName}`);
    }

    const jobOptions = createJobOptions({
      priority: 'HIGH', // Manual trigger = high priority
      attempts: 3,
    });

    const job = await addJob('aggregation', jobData, jobOptions);

    console.log(`[Scheduler] Manual trigger successful: ${job.id}`);
    return true;
  } catch (error) {
    console.error(`[Scheduler] Failed to trigger task '${taskName}':`, error);
    return false;
  }
}

/**
 * Validate cron expression
 *
 * @param expression - Cron expression to validate
 * @returns True if valid, false otherwise
 */
export function validateCronExpression(expression: string): boolean {
  return cron.validate(expression);
}

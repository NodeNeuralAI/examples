import { Queue } from 'bullmq';
import { config } from './config.js';

const url = new URL(config.redisUrl);
export const connection = { host: url.hostname, port: Number(url.port || 6379), password: url.password || undefined };

// Retries with backoff: a slow or failing model never blocks the ERP, it only delays the job.
export const queue = new Queue('erp', {
  connection,
  defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 2_000 }, removeOnComplete: 1_000 },
});

// Decisions below the confidence gate wait here for a person.
export const reviewQueue = new Queue('review', { connection });

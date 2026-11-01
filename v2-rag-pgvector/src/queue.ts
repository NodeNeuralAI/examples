import { Queue } from 'bullmq';

const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
export const connection = { host: url.hostname, port: Number(url.port || 6379), password: url.password || undefined };

export const embeddings = new Queue('embeddings', {
  connection,
  defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 2_000 }, removeOnComplete: 1_000 },
});

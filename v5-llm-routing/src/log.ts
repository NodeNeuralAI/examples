import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Task, Tier } from './types.js';

export type Attempt = {
  at: string;
  requestId: string;
  tenant: string;
  task: Task;
  tier: Tier;
  ok: boolean;
  reason?: string;
  cost: number;
  latencyMs: number;
};

export type Sample = { at: string; task: Task; tier: Tier; input: string; json: unknown };

const LOG_FILE = process.env.LOG_FILE ?? 'logs/attempts.jsonl';
const SAMPLE_FILE = process.env.SAMPLE_FILE ?? 'logs/samples.jsonl';

const append = (file: string, row: object) => {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(row)}\n`);
};

// In production, send these to your log pipeline instead (CloudWatch, Datadog…): one row per model call.
export const log = (attempt: Omit<Attempt, 'at'>) => append(LOG_FILE, { at: new Date().toISOString(), ...attempt });

// Samples keep the input, so they hold customer data: store them where your retention rules apply.
export const sample = (row: Omit<Sample, 'at'>) => append(SAMPLE_FILE, { at: new Date().toISOString(), ...row });

export const readRows = <T>(file: string): T[] =>
  existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line) as T) : [];

export const readAttempts = () => readRows<Attempt>(LOG_FILE);
export const readSamples = () => readRows<Sample>(SAMPLE_FILE);

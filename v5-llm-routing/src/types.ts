import type { z } from 'zod';

export const TIERS = ['small', 'medium', 'large'] as const;
export type Tier = (typeof TIERS)[number];

export type Task = 'classify_ticket' | 'translate' | 'extract_invoice' | 'summarize' | 'contract_qa';

export type LlmRequest = {
  id: string;
  tenant: string;
  task: Task;
  input: string;
  // Set by the caller from what it knows (the contract module, the payments screen…), never by the model
  tags: string[];
  inputTokens: number;
  schema: z.ZodType;
};

export type ModelAnswer = {
  tier: Tier;
  modelId: string;
  text: string;
  // The parsed JSON reply, or null when the model didn't return valid JSON
  json: unknown;
  cost: number;
  latencyMs: number;
};

export type Check = { ok: true } | { ok: false; reason: string };

export const atLeast = (tier: Tier, floor: Tier): Tier => (TIERS.indexOf(tier) < TIERS.indexOf(floor) ? floor : tier);

export function next(tier: Tier): Tier {
  const i = TIERS.indexOf(tier);
  if (i === TIERS.length - 1) throw new Error('No tier above large');
  return TIERS[i + 1];
}

// Good enough for routing decisions; use the provider's token counter if you bill on it.
export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

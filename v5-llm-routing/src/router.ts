import { atLeast, type LlmRequest, type Task, type Tier } from './types.js';

// Each task starts at the tier you tested, not the one you guessed
const TASK_TIER: Partial<Record<Task, Tier>> = {
  classify_ticket: 'small',
  translate: 'small',
  extract_invoice: 'small',
  summarize: 'medium',
};

// Length says what a prompt costs, not how much a wrong answer costs: these skip the cheap tiers.
const RISKY = new Set(['legal', 'payment', 'medical']);

const LONG_INPUT = 30_000;

// Plain code, not another LLM: it adds no latency or cost, and every decision can be explained.
export function route(req: LlmRequest): Tier {
  if (req.tags.some((tag) => RISKY.has(tag))) return 'large';

  // A task nobody has mapped yet (contract_qa here) costs more instead of risking more
  const tier = TASK_TIER[req.task] ?? 'large';
  return req.inputTokens > LONG_INPUT ? atLeast(tier, 'medium') : tier;
}

// Per task: where requests end up, how often they escalate, and what they cost.
// A task that escalates often belongs one tier up: you're paying for two calls.
import { readAttempts, type Attempt } from './log.js';
import { TIERS } from './types.js';

const ESCALATION_LIMIT = 0.05;

const groupBy = <T, K>(items: T[], key: (item: T) => K) => {
  const groups = new Map<K, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
};

export function summarize(attempts: Attempt[]) {
  const byRequest = groupBy(attempts, (a) => a.requestId);
  const byTask = groupBy([...byRequest.values()], (calls) => calls[0].task);

  return [...byTask].map(([task, requests]) => {
    const final = requests.map((calls) => calls.at(-1)!);
    const escalated = requests.filter((calls) => calls.length > 1).length;
    return {
      task,
      requests: requests.length,
      // Where accepted answers came from; failed on large = sent to a person
      answeredOn: Object.fromEntries(TIERS.map((tier) => [tier, final.filter((a) => a.ok && a.tier === tier).length])),
      toHuman: final.filter((a) => !a.ok).length,
      escalationRate: escalated / requests.length,
      cost: requests.flat().reduce((total, a) => total + a.cost, 0),
    };
  });
}

if (import.meta.main) {
  const rows = summarize(readAttempts());
  if (!rows.length) console.log('No attempts logged yet: run npm run demo first.');
  for (const row of rows) {
    const flag = row.escalationRate > ESCALATION_LIMIT ? '  ← move this task one tier up' : '';
    console.log(
      `${row.task.padEnd(16)} ${String(row.requests).padStart(5)} req  ` +
        TIERS.map((tier) => `${tier} ${row.answeredOn[tier]}`).join(' · ') +
        `  human ${row.toHuman}  escalation ${(row.escalationRate * 100).toFixed(1)}%  $${row.cost.toFixed(4)}${flag}`,
    );
  }
}

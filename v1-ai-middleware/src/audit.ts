import { appendFile } from 'node:fs/promises';

// One line per decision: who decided what, when, and why. Use a table or a log pipeline in production.
export const audit = {
  log: (orderId: string, decision: object) =>
    appendFile('audit.jsonl', JSON.stringify({ at: new Date().toISOString(), orderId, ...decision }) + '\n'),
};

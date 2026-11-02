// The two requests from the video: an invoice routed to small, and the contract question that goes straight to large.
import { createAsk, NeedsHuman } from './cascade.js';
import { callModel, MODEL_ID } from './models.js';
import { makeRequest } from './request.js';
import { route } from './router.js';

const ask = createAsk({ callModel, modelId: MODEL_ID, sampleRate: Number(process.env.SAMPLE_RATE ?? 0) });

const invoice = makeRequest(
  'acme',
  'extract_invoice',
  `ACME Corp — Invoice INV-2026-0417
Industrial sensors (x40) ........ 12,800.00
Installation ...................... 4,200.00
Annual support .................... 1,420.00
TOTAL DUE ........................ 18,420.00`,
);

const contract = makeRequest(
  'acme',
  'contract_qa',
  `Question: Can we end the Globex contract early?

Contract (excerpt):
7.1 Term. This agreement runs for 36 months from the effective date.
7.2 Termination for convenience. Either party may terminate with twelve (12) months' written notice.
7.3 Early termination fee. Termination under 7.2 before month 24 incurs a fee equal to three months of fees.`,
  ['legal'], // set by the contracts screen, not inferred from the text
);

for (const req of [invoice, contract]) {
  console.log(`→ ${req.task}  routed to ${route(req)}`);
  try {
    const answer = await ask(req);
    console.log(`  answered on ${answer.tier} ($${answer.cost.toFixed(4)}, ${answer.latencyMs} ms)`);
    console.log(`  ${JSON.stringify(answer.json)}\n`);
  } catch (err) {
    if (!(err instanceof NeedsHuman)) throw err;
    console.log(`  needs a person: ${err.reason}\n`);
  }
}
console.log(`Every attempt is in ${process.env.LOG_FILE ?? 'logs/attempts.jsonl'}: npm run report`);

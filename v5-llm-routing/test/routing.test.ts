import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAsk, NeedsHuman } from '../src/cascade.js';
import { summarize } from '../src/report.js';
import { makeRequest } from '../src/request.js';
import { route } from '../src/router.js';
import type { Attempt } from '../src/log.js';
import type { LlmRequest, ModelAnswer, Tier } from '../src/types.js';

const MODEL_ID: Record<Tier, string> = { small: 'fake-small', medium: 'fake-medium', large: 'fake-large' };

// A fake model that returns a scripted JSON reply per tier
const fakeModel = (replies: Partial<Record<Tier, unknown>>) => {
  const calls: Tier[] = [];
  const callModel = async (modelId: string, _req: LlmRequest): Promise<ModelAnswer> => {
    const tier = (Object.keys(MODEL_ID) as Tier[]).find((t) => MODEL_ID[t] === modelId)!;
    calls.push(tier);
    const json = replies[tier] ?? null;
    return { tier, modelId, text: JSON.stringify(json), json, cost: { small: 1, medium: 10, large: 50 }[tier], latencyMs: 1 };
  };
  return { calls, callModel };
};

const silent = { log: () => {}, sample: () => {} };

const invoiceText = 'Invoice INV-1\nSensors 12,800.00\nInstallation 4,200.00\nSupport 1,420.00\nTOTAL 18,420.00';
const goodInvoice = {
  invoiceNumber: 'INV-1',
  lines: [
    { description: 'Sensors', amount: 12800 },
    { description: 'Installation', amount: 4200 },
    { description: 'Support', amount: 1420 },
  ],
  total: 18420,
};

test('route: task rules, unknown tasks, long inputs and risk tags', () => {
  assert.equal(route(makeRequest('t', 'classify_ticket', 'printer is broken')), 'small');
  assert.equal(route(makeRequest('t', 'summarize', 'short doc')), 'medium');
  assert.equal(route(makeRequest('t', 'contract_qa', 'Can we end the Globex contract early?')), 'large');
  assert.equal(route(makeRequest('t', 'translate', 'x'.repeat(200_000))), 'medium');
  // Seven words, but tagged legal: length doesn't matter
  assert.equal(route(makeRequest('t', 'classify_ticket', 'Can we end the Globex contract early?', ['legal'])), 'large');
});

test('cascade: a schema failure on small escalates to medium', async () => {
  const model = fakeModel({ small: { invoiceNumber: 'INV-1', lines: goodInvoice.lines, total: null }, medium: goodInvoice });
  const ask = createAsk({ callModel: model.callModel, modelId: MODEL_ID, ...silent });
  const answer = await ask(makeRequest('acme', 'extract_invoice', invoiceText));
  assert.equal(answer.tier, 'medium');
  assert.deepEqual(model.calls, ['small', 'medium']);
});

test('cascade: lines that do not add up fail the task check', async () => {
  const model = fakeModel({ small: { ...goodInvoice, total: 18000 }, medium: goodInvoice });
  const ask = createAsk({ callModel: model.callModel, modelId: MODEL_ID, ...silent });
  assert.equal((await ask(makeRequest('acme', 'extract_invoice', invoiceText))).tier, 'medium');
});

test('cascade: a made-up clause on large goes to a person', async () => {
  const model = fakeModel({ large: { answer: 'Yes, 30 days notice.', clauses: ['9.4'] } });
  const ask = createAsk({ callModel: model.callModel, modelId: MODEL_ID, ...silent });
  const req = makeRequest('acme', 'contract_qa', '7.2 Either party may terminate with twelve months notice.', ['legal']);
  await assert.rejects(ask(req), NeedsHuman);
  assert.deepEqual(model.calls, ['large']);
});

test('report: escalation rate and final tier per task', () => {
  const row = (requestId: string, tier: Tier, ok: boolean): Attempt => ({
    at: '', requestId, tenant: 't', task: 'extract_invoice', tier, ok, cost: 1, latencyMs: 1,
  });
  const [summary] = summarize([row('a', 'small', true), row('b', 'small', false), row('b', 'medium', true)]);
  assert.equal(summary.requests, 2);
  assert.equal(summary.escalationRate, 0.5);
  assert.deepEqual(summary.answeredOn, { small: 1, medium: 1, large: 0 });
  assert.equal(summary.cost, 3);
});

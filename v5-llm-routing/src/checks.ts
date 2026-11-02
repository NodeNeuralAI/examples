import { z } from 'zod';
import type { Check, LlmRequest, ModelAnswer, Task } from './types.js';

export const LABELS = ['billing', 'bug', 'sales'] as const;

// What each task must return. The model is asked for exactly this JSON (see models.ts).
export const TASK_SCHEMA = {
  classify_ticket: z.object({ label: z.enum(LABELS) }),
  translate: z.object({ text: z.string().min(1) }),
  extract_invoice: z.object({
    invoiceNumber: z.string().min(1),
    lines: z.array(z.object({ description: z.string(), amount: z.number() })).min(1),
    total: z.number(),
  }),
  summarize: z.object({ summary: z.string().min(1), keyDates: z.array(z.string()) }),
  contract_qa: z.object({
    answer: z.string().min(1),
    // Every claim points at a clause, so a person can check it in seconds
    clauses: z.array(z.string()).min(1),
  }),
} satisfies Record<Task, z.ZodType>;

export const TASK_PROMPT: Record<Task, string> = {
  classify_ticket: `Classify the support ticket. Reply with JSON: {"label": one of ${LABELS.map((l) => `"${l}"`).join(', ')}}.`,
  translate: 'Translate the text to English. Reply with JSON: {"text": "..."}.',
  extract_invoice:
    'Extract the invoice. Reply with JSON: {"invoiceNumber": "...", "lines": [{"description": "...", "amount": number}], "total": number}.',
  summarize: 'Summarize the document for a manager. Reply with JSON: {"summary": "...", "keyDates": ["..."]}.',
  contract_qa:
    'Answer the question using only the contract text. Reply with JSON: {"answer": "...", "clauses": ["clause numbers you relied on"]}. If the contract does not say, answer "not stated".',
};

const ok: Check = { ok: true };
const fail = (reason: string): Check => ({ ok: false, reason });

// Checks the schema can't express. They catch broken answers, not mediocre ones: that's the shadow check's job.
export const TASK_CHECKS: Record<Task, (req: LlmRequest, answer: ModelAnswer) => Check> = {
  classify_ticket: () => ok,

  translate: (req, answer) => {
    const { text } = TASK_SCHEMA.translate.parse(answer.json);
    // An "translation" identical to the input, or a fraction of its length, is a failure
    if (text.trim() === req.input.trim()) return fail('untranslated');
    return text.length < req.input.length * 0.3 ? fail('too short') : ok;
  },

  extract_invoice: (_req, answer) => {
    const invoice = TASK_SCHEMA.extract_invoice.parse(answer.json);
    const sum = invoice.lines.reduce((total, line) => total + line.amount, 0);
    return Math.abs(sum - invoice.total) < 0.01 ? ok : fail('lines do not add up');
  },

  summarize: (req, answer) => {
    const { summary } = TASK_SCHEMA.summarize.parse(answer.json);
    return summary.length > req.input.length / 2 ? fail('not a summary') : ok;
  },

  contract_qa: (req, answer) => {
    const { clauses } = TASK_SCHEMA.contract_qa.parse(answer.json);
    // A cited clause must exist in the contract, or the citation was made up
    const missing = clauses.find((clause) => !req.input.includes(clause));
    return missing ? fail(`clause ${missing} not in contract`) : ok;
  },
};

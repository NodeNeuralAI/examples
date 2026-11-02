import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { TASK_PROMPT } from './checks.js';
import { TIERS, type LlmRequest, type ModelAnswer, type Tier } from './types.js';

const bedrock = new BedrockRuntimeClient({});

const env = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env`);
  return value;
};

const tierEnv = (tier: Tier) => tier.toUpperCase();

export const MODEL_ID = Object.fromEntries(TIERS.map((tier) => [tier, env(`MODEL_${tierEnv(tier)}`)])) as Record<Tier, string>;

// USD per million tokens, "input/output"
const PRICE = Object.fromEntries(
  TIERS.map((tier) => [tier, env(`PRICE_${tierEnv(tier)}`).split('/').map(Number) as [number, number]]),
) as Record<Tier, [number, number]>;

const tierOf = (modelId: string) => TIERS.find((tier) => MODEL_ID[tier] === modelId)!;

const parseJson = (text: string): unknown => {
  // Models sometimes wrap JSON in a code fence; anything else counts as invalid
  const body = text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '');
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
};

export async function callModel(modelId: string, req: LlmRequest): Promise<ModelAnswer> {
  const tier = tierOf(modelId);
  const started = Date.now();
  const res = await bedrock.send(
    new ConverseCommand({
      modelId,
      system: [{ text: `${TASK_PROMPT[req.task]} Reply with the JSON only.` }],
      messages: [{ role: 'user', content: [{ text: req.input }] }],
      inferenceConfig: { maxTokens: 1500, temperature: 0 },
    }),
  );
  const text = res.output?.message?.content?.map((block) => block.text ?? '').join('') ?? '';
  const [inPrice, outPrice] = PRICE[tier];
  const cost = ((res.usage?.inputTokens ?? 0) * inPrice + (res.usage?.outputTokens ?? 0) * outPrice) / 1_000_000;

  return { tier, modelId, text, json: parseJson(text), cost, latencyMs: Date.now() - started };
}

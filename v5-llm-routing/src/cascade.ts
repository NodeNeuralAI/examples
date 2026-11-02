import { TASK_CHECKS } from './checks.js';
import { log as logAttempt, sample as keepSample } from './log.js';
import { route } from './router.js';
import { next, type Check, type LlmRequest, type ModelAnswer } from './types.js';

export class NeedsHuman extends Error {
  constructor(
    readonly req: LlmRequest,
    readonly reason: string,
  ) {
    super(`${req.task} ${req.id} failed validation on every tier: ${reason}`);
  }
}

const validate = (req: LlmRequest, answer: ModelAnswer): Check =>
  req.schema.safeParse(answer.json).success
    ? TASK_CHECKS[req.task](req, answer) // label in list, lines add up…
    : { ok: false, reason: 'schema' };

type Deps = {
  callModel: (modelId: string, req: LlmRequest) => Promise<ModelAnswer>;
  modelId: Record<ModelAnswer['tier'], string>;
  log?: typeof logAttempt;
  sample?: typeof keepSample;
  sampleRate?: number;
};

// Dependencies are injected so the tests can run the cascade with a fake model.
export function createAsk({ callModel, modelId: MODEL_ID, log = logAttempt, sample = keepSample, sampleRate = 0 }: Deps) {
  return async function ask(req: LlmRequest): Promise<ModelAnswer> {
    for (let tier = route(req); ; tier = next(tier)) {
      const answer = await callModel(MODEL_ID[tier], req);
      const check = validate(req, answer);
      log({
        requestId: req.id,
        tenant: req.tenant,
        task: req.task,
        tier,
        ok: check.ok,
        reason: check.ok ? undefined : check.reason,
        cost: answer.cost,
        latencyMs: answer.latencyMs,
      });

      if (check.ok) {
        // A few accepted cheap answers go to the daily shadow check against the large model
        if (tier !== 'large' && Math.random() < sampleRate) sample({ task: req.task, tier, input: req.input, json: answer.json });
        return answer;
      }
      // Even the large model failed: its answer is not safe to return, so a person takes it
      if (tier === 'large') throw new NeedsHuman(req, check.reason);
    }
  };
}

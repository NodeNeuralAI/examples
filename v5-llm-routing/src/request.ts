import { randomUUID } from 'node:crypto';
import { TASK_SCHEMA } from './checks.js';
import { estimateTokens, type LlmRequest, type Task } from './types.js';

export const makeRequest = (tenant: string, task: Task, input: string, tags: string[] = []): LlmRequest => ({
  id: randomUUID(),
  tenant,
  task,
  input,
  tags,
  inputTokens: estimateTokens(input),
  schema: TASK_SCHEMA[task],
});

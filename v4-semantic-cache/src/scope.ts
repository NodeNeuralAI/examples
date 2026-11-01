import { createHash } from 'node:crypto';

export type CacheRequest = {
  tenantId: string;
  question: string;
  knowledgeVersion: string;
  // Set when the answer depends on live or personal data ("where's my order?"): never cached.
  personal: boolean;
};

export const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? '';
export const SYSTEM_PROMPT_VERSION = process.env.SYSTEM_PROMPT_VERSION ?? '1';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// An answer is only reusable inside the same scope
export const scopeOf = (req: CacheRequest) =>
  sha256([
    req.tenantId,
    MODEL_ID,
    SYSTEM_PROMPT_VERSION,
    req.knowledgeVersion,
  ].join('|'));

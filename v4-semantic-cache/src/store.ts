import { randomUUID } from 'node:crypto';
import { askModel } from './bedrock.js';
import { reply } from './http.js';
import type { CacheRequest } from './scope.js';
import { valkey } from './valkey.js';
import { toBytes } from './vectors.js';

export async function answerAndStore(req: CacheRequest, scope: string, vector: number[]) {
  const answer = await askModel(req);
  const key = `ans:${randomUUID()}`;

  await valkey.hset(key, {
    scope,
    question: req.question,
    answer,
    embedding: toBytes(vector), // raw float32, little-endian
  });
  await valkey.expire(key, 24 * 60 * 60);

  return reply(answer, 'miss', key);
}

// "Cancel order 1042" must never reuse the answer for order 1043
export const sameEntities = (a: string, b: string) =>
  ids(a).join() === ids(b).join();
const ids = (text: string) =>
  (text.match(/\b[\w-]*\d[\w-]*\b/g) ?? []).sort();

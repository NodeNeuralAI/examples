import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { CacheRequest } from './scope.js';

// Questions about the caller's own live data: answering them from a cache is wrong by definition.
const PERSONAL = /\b(my|mine|our)\s+(order|account|invoice|ticket|balance|password|shipment)s?\b/i;

export function parseRequest(event: APIGatewayProxyEvent): CacheRequest {
  const body = JSON.parse(event.body ?? '{}') as { question?: string };
  // Set by the API Gateway authorizer, never by the client.
  const tenantId = event.requestContext.authorizer?.tenantId as string | undefined;
  if (!tenantId) throw new Error('No tenant in the authorizer context');
  const question = (body.question ?? '').trim();
  return {
    tenantId,
    question,
    knowledgeVersion: process.env.KNOWLEDGE_VERSION ?? '1',
    personal: PERSONAL.test(question),
  };
}

export const cacheable = (req: CacheRequest) => !req.personal && req.question.length > 0 && req.question.length <= 500;

// The cache key travels with every response, so a thumbs-down can evict the exact entry.
export const reply = (answer: string, cache: 'hit' | 'miss' | 'bypass', key?: string): APIGatewayProxyResult => ({
  statusCode: 200,
  headers: { 'content-type': 'application/json', 'x-cache': cache, ...(key ? { 'x-cache-key': key } : {}) },
  body: JSON.stringify({ answer }),
});

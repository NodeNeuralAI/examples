import type { APIGatewayProxyEvent } from 'aws-lambda';
import { askModel, embed } from './bedrock.js';
import { cacheable, parseRequest, reply } from './http.js';
import { scopeOf } from './scope.js';
import { answerAndStore, sameEntities } from './store.js';
import { valkey } from './valkey.js'; // created outside the handler, reused while warm
import { firstHit, toBytes } from './vectors.js';

export const handler = async (event: APIGatewayProxyEvent) => {
  const req = parseRequest(event);
  if (!cacheable(req)) return reply(await askModel(req), 'bypass');

  const scope = scopeOf(req);
  const vector = await embed(req.question); // Titan V2, 512 dims

  const hit = firstHit(await valkey.customCommand([
    'FT.SEARCH', 'answers',
    `@scope:{${scope}}=>[KNN 1 @embedding $v AS distance]`,
    'PARAMS', '2', 'v', toBytes(vector),
    'RETURN', '3', 'question', 'answer', 'distance', // leave the raw vector out of the reply
    'DIALECT', '2',
  ]));

  if (hit && hit.distance < 0.1 && sameEntities(req.question, hit.question)) {
    return reply(hit.answer, 'hit', hit.key);
  }
  return answerAndStore(req, scope, vector);
};

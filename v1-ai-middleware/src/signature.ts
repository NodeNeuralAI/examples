import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { config } from './config.js';

// The raw body is captured by express.json({ verify }) in webhook.ts: the signature covers the exact bytes.
export type SignedRequest = Request & { rawBody?: Buffer };

export const verifySignature = (req: SignedRequest) => {
  const received = req.get('x-erp-signature');
  if (!received || !req.rawBody) return false;
  const expected = createHmac('sha256', config.webhookSecret()).update(req.rawBody).digest('hex');
  const a = Buffer.from(received, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
};

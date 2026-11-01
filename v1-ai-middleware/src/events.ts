import { z } from 'zod';

export const Order = z.object({
  id: z.string(),
  customerId: z.string(),
  destination: z.object({ country: z.string().length(2), postalCode: z.string() }),
  weightKg: z.number().positive(),
  priority: z.enum(['standard', 'express']),
  lines: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive() })).min(1),
});
export type Order = z.infer<typeof Order>;

// Every event carries an id from the ERP: it becomes the job id, so a retried webhook is a no-op.
export const ErpEvent = z.object({
  id: z.string().min(1),
  type: z.literal('order.created'),
  occurredAt: z.iso.datetime(),
  order: Order,
});
export type ErpEvent = z.infer<typeof ErpEvent>;

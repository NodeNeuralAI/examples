import { Worker } from 'bullmq';
import { z } from 'zod';
import { audit } from './audit.js';
import { buildContext, SYSTEM_PROMPT } from './context.js';
import { erp } from './erp.js';
import type { ErpEvent } from './events.js';
import { llm } from './llm.js';
import { connection, reviewQueue } from './queues.js';

const RoutingDecision = z.object({
  carrier: z.enum(['DHL', 'FEDEX', 'LOCAL_FLEET']),
  warehouseId: z.string(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

new Worker<ErpEvent>(
  'erp',
  async (job) => {
    const { order } = job.data;
    const decision = RoutingDecision.parse(
      await llm.generate({ schema: RoutingDecision, input: buildContext(order), system: SYSTEM_PROMPT }),
    );

    if (decision.confidence < 0.85) {
      return reviewQueue.add('routing', { order, decision });
    }

    await erp.updateShipment(order.id, decision);
    await audit.log(order.id, decision);
  },
  { connection, concurrency: 5 },
);

console.log('Routing worker started');

import express from 'express';
import { config } from './config.js';
import { ErpEvent } from './events.js';
import { queue } from './queues.js';
import { verifySignature, type SignedRequest } from './signature.js';

const app = express();
app.use(express.json({ verify: (req, _res, buf) => { (req as SignedRequest).rawBody = buf; } }));

// Ack fast, process later: the ERP gets a 202 in milliseconds, whatever the model is doing.
app.post('/erp/events', async (req, res) => {
  if (!verifySignature(req)) return res.sendStatus(401);

  const parsed = ErpEvent.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const event = parsed.data;

  await queue.add(event.type, event, { jobId: event.id });

  res.sendStatus(202);
});

app.listen(config.port, () => console.log(`ERP webhook listening on :${config.port}`));

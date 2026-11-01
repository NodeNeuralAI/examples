# V1: AI middleware between your ERP and an LLM

Video: [Never Call an LLM From Your ERP: AI Middleware Architecture](https://www.youtube.com/watch?v=JQ25ZvyS3Uk)

The ERP never waits for a model. It posts an event, gets a `202` in milliseconds, and a worker does the slow part:

```
ERP → POST /erp/events → verify signature → Zod → BullMQ (jobId = event id) → 202
                                                     ↓
                     worker → LLM (structured output) → Zod → confidence ≥ 0.85 ? ERP + audit : review queue
```

| File | What it does |
|---|---|
| `src/webhook.ts` | Ingestion endpoint: HMAC signature on the raw body, Zod validation, idempotent enqueue |
| `src/routing.worker.ts` | The AI worker: schema, confidence gate, write-back, audit |
| `src/llm.ts` | Structured output on Amazon Bedrock (Converse API, forced tool call); swap it for any provider |
| `src/context.ts` | System prompt and the context the model sees |
| `src/queues.ts` | Queues with retries and exponential backoff |

## Run it

```bash
cp .env.example .env    # fill in the values
docker run -d -p 6379:6379 valkey/valkey   # or any Redis
npm install
npm run api             # terminal 1
npm run worker          # terminal 2
```

Not included: the consumer of the `review` queue (your review UI) and the invoice-analysis variant from the end of the video, which is the same worker with a different schema and prompt.

# Node & Neural: code from the videos

Full, runnable source for the architectures in the [Node & Neural](https://www.youtube.com/@NodeNeuralAI) videos. The code on screen is simplified; this is the version with the helpers, config and comments.

| Video | Folder | Stack |
|---|---|---|
| [Never Call an LLM From Your ERP: AI Middleware Architecture](https://www.youtube.com/watch?v=JQ25ZvyS3Uk) | [`v1-ai-middleware`](v1-ai-middleware) | Node.js, Express, BullMQ, Zod, Amazon Bedrock |
| [Enterprise RAG with PostgreSQL + pgvector](https://www.youtube.com/watch?v=HlT40sMLex0) | [`v2-rag-pgvector`](v2-rag-pgvector) | PostgreSQL, pgvector, row-level security, outbox, BullMQ |
| [Semantic Cache on AWS](https://www.youtube.com/watch?v=XjfXwFTX_R8) | [`v4-semantic-cache`](v4-semantic-cache) | API Gateway, Lambda, ElastiCache for Valkey, Bedrock |
| [LLM Routing: Stop Paying Premium Prices for Simple Prompts](https://www.youtube.com/watch?v=7kZ9mOlxuZo) | [`v5-llm-routing`](v5-llm-routing) | Amazon Bedrock (Converse), Zod, validation cascade |

Each folder is a standalone TypeScript project (Node 22+): `cp .env.example .env`, `npm install`, then the scripts in its README.

These are reference implementations for learning: review them, add your own tests and error handling, and size them for your workload before production.

MIT licensed.

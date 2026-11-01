# V4: Semantic cache on AWS

Video: [Semantic Cache on AWS: Cut LLM Costs Without Serving Wrong Answers](https://www.youtube.com/watch?v=XjfXwFTX_R8)

Hit often, never hit wrong: answers are reused only inside the same scope (tenant, model, prompt version, knowledge version), under a strict distance, and only when both questions mention the same numbers and IDs.

```
Client → API Gateway (auth · throttling) → Lambda (in VPC)
                                             ├─ Titan Text Embeddings V2 (512 dims)
                                             ├─ ElastiCache for Valkey 8.2: FT.SEARCH @scope:{…}=>[KNN 1 …]
                                             └─ on a miss only: LLM on Bedrock → HSET + EXPIRE 24h
```

| File | What it does |
|---|---|
| `src/create-index.ts` | `FT.CREATE`: scope tag + HNSW vector field, run once at deploy |
| `src/scope.ts` | `scopeOf`: the four things an answer depends on, hashed into one tag |
| `src/handler.ts` | The Lambda: guard, embed, one hybrid search, distance + entity check |
| `src/store.ts` | Miss path: call the model, store with TTL; `sameEntities` |
| `src/http.ts` | Request parsing, the "personal data" bypass, `x-cache` / `x-cache-key` headers |
| `src/bedrock.ts` | Titan embeddings and the Converse call |
| `src/vectors.ts` | float32 bytes and parsing the `FT.SEARCH` reply |

## Deploy notes

- ElastiCache for Valkey **8.2 or later** (vector search), cluster mode, in the Lambda's VPC with TLS.
- Lambda role: `bedrock:InvokeModel` on the embedding model and the chat model.
- `@valkey/valkey-glide` ships a native binary: install it for the Lambda architecture (or use a layer) and keep it external when bundling (`npm run build`).
- API Gateway authorizer puts `tenantId` in the request context; the client never chooses its tenant.
- Start with `distance < 0.1`, then tune it on a few hundred labelled question pairs from your logs. Run in shadow mode (look up, don't serve) for a week before switching it on.

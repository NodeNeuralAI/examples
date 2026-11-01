import { BedrockRuntimeClient, ConverseCommand, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { MODEL_ID, type CacheRequest } from './scope.js';

const bedrock = new BedrockRuntimeClient({});

const SYSTEM_PROMPT = 'You are the internal helpdesk assistant. Answer briefly and only from company policy.';

// Titan Text Embeddings V2 at 512 dimensions: half the memory of the 1024 default.
export async function embed(text: string): Promise<number[]> {
  const res = await bedrock.send(
    new InvokeModelCommand({
      modelId: process.env.EMBEDDING_MODEL_ID ?? 'amazon.titan-embed-text-v2:0',
      contentType: 'application/json',
      body: JSON.stringify({ inputText: text, dimensions: 512, normalize: true }),
    }),
  );
  return (JSON.parse(new TextDecoder().decode(res.body)) as { embedding: number[] }).embedding;
}

export async function askModel(req: CacheRequest): Promise<string> {
  const res = await bedrock.send(
    new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: SYSTEM_PROMPT }],
      messages: [{ role: 'user', content: [{ text: req.question }] }],
      inferenceConfig: { maxTokens: 800 },
    }),
  );
  return res.output?.message?.content?.map((block) => block.text ?? '').join('') ?? '';
}

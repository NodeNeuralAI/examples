import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { z } from 'zod';
import { config } from './config.js';

const client = new BedrockRuntimeClient({});

// Structured output through tool use: the model must call `answer` with arguments matching the schema.
// The caller still validates with Zod; the schema is a request, not a guarantee.
export const llm = {
  async generate({ schema, input, system }: { schema: z.ZodType; input: string; system?: string }): Promise<unknown> {
    const { $schema, ...json } = z.toJSONSchema(schema) as Record<string, unknown>;
    const res = await client.send(
      new ConverseCommand({
        modelId: config.modelId(),
        system: system ? [{ text: system }] : undefined,
        messages: [{ role: 'user', content: [{ text: input }] }],
        toolConfig: {
          tools: [{ toolSpec: { name: 'answer', description: 'Return the decision.', inputSchema: { json: json as never } } }],
          toolChoice: { tool: { name: 'answer' } },
        },
        inferenceConfig: { maxTokens: 1024, temperature: 0 },
      }),
    );
    const call = res.output?.message?.content?.find((block) => block.toolUse)?.toolUse;
    if (!call) throw new Error(`Model returned no structured answer (stop reason: ${res.stopReason})`);
    return call.input;
  },
};

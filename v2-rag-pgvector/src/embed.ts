// Embeddings through any OpenAI-compatible endpoint. Use the same model for documents and questions.
const endpoint = process.env.EMBEDDINGS_URL ?? 'https://api.openai.com/v1/embeddings';
const model = process.env.EMBEDDINGS_MODEL ?? 'text-embedding-3-small';

export async function embedMany(inputs: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += 96) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.EMBEDDINGS_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, input: inputs.slice(i, i + 96) }),
    });
    if (!res.ok) throw new Error(`Embeddings ${res.status}: ${await res.text()}`);
    const { data } = (await res.json()) as { data: { index: number; embedding: number[] }[] };
    out.push(...data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
  }
  return out;
}

export const embed = async (text: string) => (await embedMany([text]))[0];

// pgvector's text format: '[0.1,0.2,...]'
export const toSql = (vector: number[]) => `[${vector.join(',')}]`;

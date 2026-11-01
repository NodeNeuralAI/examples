// Chunks of about `maxTokens` tokens with `overlap` tokens repeated between neighbours, so a sentence cut
// at a boundary still appears whole in one chunk. Tokens are estimated from words (~0.75 words per token);
// swap in your model's tokenizer if you need exact sizes.
export function split(text: string, { maxTokens, overlap }: { maxTokens: number; overlap: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  const size = Math.max(1, Math.floor(maxTokens * 0.75));
  const step = Math.max(1, size - Math.floor(overlap * 0.75));
  const chunks: string[] = [];
  for (let start = 0; start < words.length; start += step) {
    chunks.push(words.slice(start, start + size).join(' '));
    if (start + size >= words.length) break;
  }
  return chunks;
}

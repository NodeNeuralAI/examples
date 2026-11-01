import type { GlideReturnType } from '@valkey/valkey-glide';

// Valkey stores vectors as raw float32, little-endian (Float32Array uses the platform order, which is
// little-endian on Lambda's x86_64 and arm64).
export const toBytes = (vector: number[]) => Buffer.from(new Float32Array(vector).buffer);

export type Hit = { key: string; question: string; answer: string; distance: number };

// FT.SEARCH replies [total, key, fields, key, fields, ...]; fields arrive as a flat [name, value, ...]
// list or as a map, depending on the protocol, so both are read.
export function firstHit(reply: GlideReturnType): Hit | null {
  if (!Array.isArray(reply) || Number(reply[0]) === 0 || reply.length < 3) return null;
  const raw = reply[2];
  const fields: Record<string, string> = {};
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object' && 'key' in item && 'value' in item) fields[String(item.key)] = String(item.value);
    }
    for (let i = 0; i + 1 < raw.length; i += 2) {
      if (typeof raw[i] === 'string' || Buffer.isBuffer(raw[i])) fields[String(raw[i])] = String(raw[i + 1]);
    }
  } else if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) fields[k] = String(v);
  }
  if (!fields.answer || fields.distance === undefined) return null;
  return { key: String(reply[1]), question: fields.question ?? '', answer: fields.answer, distance: Number(fields.distance) };
}

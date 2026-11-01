import { valkey } from './valkey.js';

// Once, at deploy time
await valkey.customCommand([
  'FT.CREATE', 'answers', 'ON', 'HASH', 'PREFIX', '1', 'ans:',
  'SCHEMA',
  'scope', 'TAG',
  'embedding', 'VECTOR', 'HNSW', '6',
  'TYPE', 'FLOAT32', 'DIM', '512', 'DISTANCE_METRIC', 'COSINE',
]);
console.log('Index "answers" created');
valkey.close();

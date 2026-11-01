import { pool } from './db.js';
import { retrieve } from './retrieve.js';

// npm run ask -- <tenant-uuid> "your question"
const [tenantId, question] = process.argv.slice(2);
if (!tenantId || !question) {
  console.error('Usage: npm run ask -- <tenant-uuid> "question"');
  process.exit(1);
}
for (const row of await retrieve(tenantId, question)) {
  console.log(`${row.distance.toFixed(3)}  ${row.title}: ${row.content.slice(0, 120)}…`);
}
await pool.end();

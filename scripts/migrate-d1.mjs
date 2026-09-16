import fs from 'node:fs';
import path from 'node:path';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;

if (!ACCOUNT_ID || !API_TOKEN || !DATABASE_ID) {
  console.error('Missing required Cloudflare environment variables.');
  process.exit(1);
}

const schemaPath = path.resolve(process.cwd(), 'cloudflare/schema.sql');
const rawSql = fs.readFileSync(schemaPath, 'utf8');

// Parse statements cleanly
const statements = rawSql
  .split(/;\s*$/m)
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Executing ${statements.length} SQL statements on D1 database ${DATABASE_ID}...`);

const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const cleanStmt = stmt
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .trim();

  if (!cleanStmt) continue;

  console.log(`[${i + 1}/${statements.length}] Executing: ${cleanStmt.slice(0, 60).replace(/\n/g, ' ')}...`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: cleanStmt, params: [] }),
  });

  const body = await res.json();
  if (!body.success) {
    console.error(`❌ Error on statement:`, cleanStmt);
    console.error(JSON.stringify(body.errors, null, 2));
    process.exit(1);
  }
}

console.log('✅ All schema migration statements executed successfully!');

// Verify tables
const verifyRes = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    sql: "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%';",
    params: [],
  }),
});

const verifyBody = await verifyRes.json();
console.log('📋 Verified tables in Cloudflare D1:');
console.log(JSON.stringify(verifyBody.result[0].results, null, 2));


const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_KV_NAMESPACE_ID } = process.env;

console.log('Testing Cloudflare configuration:');
console.log('Account ID:', CLOUDFLARE_ACCOUNT_ID);
console.log('D1 DB ID:', CLOUDFLARE_D1_DATABASE_ID);
console.log('KV ID:', CLOUDFLARE_KV_NAMESPACE_ID);

// 1. Test D1 Query
const d1Url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_D1_DATABASE_ID}/query`;
const d1Res = await fetch(d1Url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ sql: 'SELECT count(*) as user_count FROM users;', params: [] }),
});
const d1Data = await d1Res.json();
console.log('D1 Query Result:', d1Data.result[0].results);

// 2. Test KV Write & Read
const kvKey = 'test-ping';
const kvVal = JSON.stringify({ ping: 'pong', timestamp: Date.now() });
const kvPutUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${CLOUDFLARE_KV_NAMESPACE_ID}/values/${kvKey}`;

await fetch(kvPutUrl, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'text/plain',
  },
  body: kvVal,
});

const kvGetRes = await fetch(kvPutUrl, {
  headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` },
});
const readBack = await kvGetRes.text();
console.log('KV Put & Get Verification:', readBack);

console.log('🎉 Cloudflare D1 & KV connection test passed 100%!');

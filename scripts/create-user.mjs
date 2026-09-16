import { hashPassword } from '../lib/auth/password.ts';

const email = process.argv[2] || 'admin@enrichagent.com';
const rawPassword = process.argv[3] || 'password123';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;

console.log(`Creating user in Cloudflare D1: ${email}`);

const passwordHash = await hashPassword(rawPassword);
const id = crypto.randomUUID();
const apiKey = `ea_live_${crypto.randomUUID().replace(/-/g, '')}`;

const sql = `
INSERT INTO users (id, email, password_hash, api_key, credits_balance, tier)
VALUES (?, ?, ?, ?, 10000, 'pro')
ON CONFLICT(email) DO UPDATE SET
  password_hash = excluded.password_hash,
  credits_balance = 10000,
  tier = 'pro';
`;

const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    sql,
    params: [id, email, passwordHash, apiKey],
  }),
});

const data = await res.json();
if (data.success) {
  console.log(`✅ User ready in Cloudflare D1!`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${rawPassword}`);
  console.log(`Credits:  10,000 (Pro Tier)`);
  console.log(`API Key:  ${apiKey}`);
} else {
  console.error('Error creating user:', JSON.stringify(data.errors, null, 2));
}

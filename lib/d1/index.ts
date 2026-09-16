import { D1DatabaseClient } from './types';
import { CloudflareD1RestClient } from './rest-client';
import { LocalNodeSqliteClient } from './local-fallback';

export * from './types';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

const hasD1Credentials = Boolean(accountId && databaseId && apiToken);

export const d1: D1DatabaseClient = hasD1Credentials
  ? new CloudflareD1RestClient({
      accountId: accountId!,
      databaseId: databaseId!,
      apiToken: apiToken!,
    })
  : new LocalNodeSqliteClient(process.env.LOCAL_SQLITE_PATH || '.dev-d1.sqlite');

if (!hasD1Credentials && process.env.NODE_ENV !== 'production') {
  // Graceful notification
  console.info('ℹ️  [Cloudflare D1] Operating with local SQLite fallback engine.');
}

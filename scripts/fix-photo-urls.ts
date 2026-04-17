import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import pg from 'pg';

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(
    `UPDATE "Player"
     SET "photoUrl" = REGEXP_REPLACE("photoUrl", '^https://drive\\.google\\.com/thumbnail\\?id=([a-zA-Z0-9_-]+).*$', 'https://lh3.googleusercontent.com/d/\\1=w400')
     WHERE "photoUrl" LIKE 'https://drive.google.com/thumbnail?id=%'`
  );
  console.log(`Updated ${res.rowCount} photoUrls to CDN format`);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });

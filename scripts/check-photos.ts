import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  const res = await client.query(
    `SELECT name, club, experience, education, contests, message, "photoUrl" FROM "Player" LIMIT 3`
  );
  for (const row of res.rows) {
    console.log(JSON.stringify(row, null, 2));
  }
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });

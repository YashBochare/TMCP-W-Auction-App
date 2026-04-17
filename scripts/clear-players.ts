import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  // Unset currentPlayerId first to avoid FK constraint
  await client.query(`UPDATE "AuctionState" SET "currentPlayerId" = NULL`);
  const res = await client.query(`DELETE FROM "Player"`);
  console.log(`Deleted ${res.rowCount} players`);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });

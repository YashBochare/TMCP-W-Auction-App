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
    `UPDATE "AuctionState" SET
      "currentPlayerId" = NULL,
      "currentHighestBid" = 0,
      "currentHighestBidderId" = NULL,
      "biddingStatus" = 'IDLE',
      "isPaused" = false`
  );
  console.log(`Reset ${res.rowCount} auction state row(s)`);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });

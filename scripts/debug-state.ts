import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import pg from 'pg';

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const state = await client.query('SELECT * FROM "AuctionState"');
  console.log('AuctionState:', JSON.stringify(state.rows, null, 2));
  const players = await client.query('SELECT COUNT(*) FROM "Player"');
  console.log('Player count:', players.rows[0].count);
  const playerStatuses = await client.query('SELECT status, COUNT(*) FROM "Player" GROUP BY status');
  console.log('By status:', playerStatuses.rows);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });

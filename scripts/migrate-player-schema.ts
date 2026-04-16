import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  console.log('Connected');

  // Drop old columns, add new columns. Use IF EXISTS / IF NOT EXISTS for safety.
  const stmts = [
    `ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "club" TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "experience" TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "education" TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "contests" TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "message" TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE "Player" ALTER COLUMN "basePrice" SET DEFAULT 3000`,
    `ALTER TABLE "Player" DROP COLUMN IF EXISTS "role"`,
    `ALTER TABLE "Player" DROP COLUMN IF EXISTS "clubLevel"`,
    `ALTER TABLE "Player" DROP COLUMN IF EXISTS "speakingSkill"`,
    `ALTER TABLE "Player" DROP COLUMN IF EXISTS "funTitle"`,
  ];

  for (const s of stmts) {
    console.log(s);
    await client.query(s);
  }

  console.log('Schema migrated');
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });

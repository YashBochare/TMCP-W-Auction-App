import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../apps/api/src/generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.auctionState.deleteMany();
  console.log('Cleared AuctionState');
  await prisma.player.deleteMany();
  console.log('Cleared Player');
  await prisma.team.deleteMany();
  console.log('Cleared Team');
  await prisma.eventConfig.deleteMany();
  console.log('Cleared EventConfig');
  console.log('Done — all data cleared');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

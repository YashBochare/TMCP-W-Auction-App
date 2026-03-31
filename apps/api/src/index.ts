import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { getPrisma } from './lib/prisma.js';
import authRoutes from './routes/auth.routes.js';
import eventConfigRoutes from './routes/eventConfig.routes.js';
import teamsRoutes from './routes/teams.routes.js';
import playersRoutes from './routes/players.routes.js';
import auctionRoutes from './routes/auction.routes.js';
import { setupSocketServer } from './socket/index.js';
import { stateMachine } from './auction/stateMachine.js';
import { auctionTimer } from './auction/auctionTimer.js';

const app = express();
const httpServer = createServer(app);
const io = setupSocketServer(httpServer);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/event-config', eventConfigRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/auction', auctionRoutes);

app.get('/api/health', async (_req, res) => {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: Date.now() });
  } catch (err) {
    console.error('Health check DB ping failed:', err);
    res.status(503).json({ status: 'error', db: 'disconnected', timestamp: Date.now() });
  }
});

httpServer.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Initialize auction state from DB (crash recovery)
async function initAuctionState() {
  try {
    // Ensure singleton row exists
    const existing = await getPrisma().auctionState.findFirst();
    if (!existing) {
      await getPrisma().auctionState.create({ data: {} });
    }
    await stateMachine.loadFromDb();

    // Initialize timer
    auctionTimer.setIo(io);
    auctionTimer.setOnExpire(async () => {
      try {
        if (stateMachine.phase !== 'bidding_open') return;
        await stateMachine.closeBidding();
        if ((stateMachine.phase as string) === 'bidding_closed') {
          io.emit('auction:stateChanged', stateMachine.getState({
            timerSeconds: 0,
            timerRunning: false,
          }));
          io.emit('auction:timerExpired');
        }
      } catch (error) {
        console.error('Timer expiry error:', error);
      }
    });

    // Crash recovery: resume timer if bidding was open
    if (stateMachine.phase === 'bidding_open') {
      auctionTimer.startFrom(stateMachine.timerSeconds);
    }

    console.log(`[Auction] State loaded: phase=${stateMachine.phase}`);
  } catch (err) {
    console.error('[Auction] Failed to initialize state:', err);
  }
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, async () => {
  console.log(`API server running on port ${PORT}`);
  await initAuctionState();
});

export { app, httpServer, io };

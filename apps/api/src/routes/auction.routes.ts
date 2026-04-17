import { Router } from 'express';
import type { Request, Response } from 'express';
import { stateMachine } from '../auction/stateMachine.js';
import { getIo } from '../socket/index.js';
import { getAllTeamConstraints, getTeamConstraints, validateTeamBid } from '../auction/constraintService.js';
import { auctionTimer } from '../auction/auctionTimer.js';
import { getTimerState } from '../auction/timerState.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { UserRole, getNextBid } from '@auction/shared';
import { getPrisma } from '../lib/prisma.js';

const router = Router();

router.get('/state', (_req: Request, res: Response) => {
  res.json({ success: true, data: stateMachine.getState(getTimerState()) });
});

router.post('/next-player', async (_req: Request, res: Response) => {
  try {
    const player = await stateMachine.nextPlayer();
    auctionTimer.stop();
    const io = getIo();
    const constraints = await getAllTeamConstraints();
    io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
    io.emit('auction:playerPresented', { player: player as any });
    io.emit('auction:constraintsUpdated', { constraints });
    res.json({ success: true, data: { player } });
  } catch (err: any) {
    if (err.message?.includes('No pending')) {
      res.status(404).json({ success: false, error: { message: err.message } });
    } else if (err.message?.includes('Cannot')) {
      res.status(400).json({ success: false, error: { message: err.message } });
    } else {
      console.error('Auction next-player error:', err);
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
});

router.post('/open-bidding', async (_req: Request, res: Response) => {
  try {
    await stateMachine.openBidding();
    getIo().emit('auction:stateChanged', stateMachine.getState(getTimerState()));
    res.json({ success: true, data: stateMachine.getState(getTimerState()) });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

router.post('/close-bidding', async (_req: Request, res: Response) => {
  try {
    await stateMachine.closeBidding();
    auctionTimer.stop();
    getIo().emit('auction:stateChanged', stateMachine.getState(getTimerState()));
    res.json({ success: true, data: stateMachine.getState(getTimerState()) });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

router.post('/sell', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.body;
    if (!teamId || typeof teamId !== 'string') {
      res.status(400).json({ success: false, error: { message: 'teamId is required' } });
      return;
    }
    const result = await stateMachine.sell(teamId);
    auctionTimer.stop();
    const io = getIo();
    const constraints = await getAllTeamConstraints();
    io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
    io.emit('auction:sold', result);
    io.emit('auction:constraintsUpdated', { constraints });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

router.post('/mark-unsold', async (_req: Request, res: Response) => {
  try {
    const result = await stateMachine.markUnsold();
    auctionTimer.stop();
    const io = getIo();
    io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
    io.emit('auction:unsold', result);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Pause/Resume
router.post('/pause', requireAuth, requireRole(UserRole.AUCTIONEER), async (_req: Request, res: Response) => {
  try {
    await stateMachine.pause();
    auctionTimer.pause();
    getIo().emit('auction:stateChanged', stateMachine.getState(getTimerState()));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

router.post('/resume', requireAuth, requireRole(UserRole.AUCTIONEER), async (_req: Request, res: Response) => {
  try {
    await stateMachine.resume();
    auctionTimer.resume();
    getIo().emit('auction:stateChanged', stateMachine.getState(getTimerState()));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Recall unsold players
router.post('/recall-unsold', requireAuth, requireRole(UserRole.AUCTIONEER), async (_req: Request, res: Response) => {
  if (stateMachine.phase !== 'idle') {
    res.status(400).json({ success: false, error: { message: 'Cannot recall unsold players while auction is active' } });
    return;
  }
  try {
    const prisma = getPrisma();
    const result = await prisma.player.updateMany({ where: { status: 'UNSOLD' }, data: { status: 'PENDING' } });
    if (result.count === 0) {
      res.status(404).json({ success: false, error: { message: 'No unsold players to recall' } });
      return;
    }
    getIo().emit('auction:rosterRefreshed');
    res.json({ success: true, data: { recalledCount: result.count } });
  } catch (err: any) {
    console.error('Recall unsold error:', err);
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
});

// Reset auction to idle (clears current player, bids, pause state). Does NOT touch players or teams.
router.post('/reset', requireAuth, requireRole(UserRole.AUCTIONEER), async (_req: Request, res: Response) => {
  try {
    await getPrisma().auctionState.updateMany({
      data: {
        currentPlayerId: null,
        currentHighestBid: 0,
        currentHighestBidderId: null,
        biddingStatus: 'IDLE',
        isPaused: false,
      },
    });
    await stateMachine.loadFromDb();
    auctionTimer.stop();
    const io = getIo();
    const constraints = await getAllTeamConstraints();
    io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
    io.emit('auction:constraintsUpdated', { constraints });
    res.json({ success: true, data: stateMachine.getState(getTimerState()) });
  } catch (err: any) {
    console.error('Reset auction error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to reset auction' } });
  }
});

// Register bid (physical bidding model)
router.post('/register-bid', requireAuth, requireRole(UserRole.AUCTIONEER), async (req: Request, res: Response) => {
  const { teamId } = req.body;
  if (!teamId || typeof teamId !== 'string') {
    res.status(400).json({ success: false, error: { message: 'teamId is required' } });
    return;
  }
  if (stateMachine.phase !== 'bidding_open') {
    res.status(400).json({ success: false, error: { message: 'Bidding is not open' } });
    return;
  }
  if (stateMachine.isPaused) {
    res.status(400).json({ success: false, error: { message: 'Auction is paused' } });
    return;
  }
  if (!stateMachine.currentPlayer) {
    res.status(400).json({ success: false, error: { message: 'No current player' } });
    return;
  }
  if (teamId === stateMachine.currentHighestBidderTeamId) {
    res.status(400).json({ success: false, error: { message: 'Team is already the highest bidder' } });
    return;
  }

  try {
    const nextBid = getNextBid(stateMachine.currentHighestBid, stateMachine.currentPlayer.basePrice);

    const teamConstraints = await getTeamConstraints(teamId);
    if (!teamConstraints.canBid) {
      res.status(400).json({ success: false, error: { message: 'Team cannot bid (squad full or no purse)' } });
      return;
    }
    if (nextBid > teamConstraints.maxBid) {
      res.status(400).json({ success: false, error: { message: `Team purse insufficient for bid of ${nextBid}` } });
      return;
    }

    await stateMachine.acceptBid(teamId, nextBid);
    const team = await getPrisma().team.findUnique({ where: { id: teamId }, select: { name: true } });
    const teamName = team?.name || 'Unknown';

    const io = getIo();
    io.emit('auction:bidRegistered', { teamId, teamName, bidAmount: nextBid });
    io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
    const constraints = await getAllTeamConstraints();
    io.emit('auction:constraintsUpdated', { constraints });

    res.json({ success: true, data: { teamId, teamName, bidAmount: nextBid } });
  } catch (err: any) {
    console.error('Register bid error:', err);
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
});

// Constraint endpoints

router.get('/constraints', async (_req: Request, res: Response) => {
  try {
    const constraints = await getAllTeamConstraints();
    res.json({ success: true, data: constraints });
  } catch (err: any) {
    console.error('Constraints error:', err);
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
});

router.get('/constraints/:teamId', async (req: Request, res: Response) => {
  try {
    const teamId = req.params.teamId as string;
    const constraints = await getTeamConstraints(teamId);
    res.json({ success: true, data: constraints });
  } catch (err: any) {
    if (err.message?.includes('not found')) {
      res.status(404).json({ success: false, error: { message: err.message } });
    } else {
      console.error('Constraint error:', err);
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
});

router.post('/validate-bid', async (req: Request, res: Response) => {
  const { teamId, bidAmount } = req.body;
  if (!teamId || typeof teamId !== 'string') {
    res.status(400).json({ success: false, error: { message: 'teamId is required' } });
    return;
  }
  if (typeof bidAmount !== 'number') {
    res.status(400).json({ success: false, error: { message: 'bidAmount must be a number' } });
    return;
  }

  const result = await validateTeamBid(teamId, bidAmount, stateMachine.currentHighestBid);
  if (result.valid) {
    res.json({ success: true, data: result });
  } else {
    res.status(400).json({ success: false, error: { message: result.reason } });
  }
});

// Undo last action (Story 5.2)
router.post('/undo', requireAuth, requireRole(UserRole.AUCTIONEER), async (_req: Request, res: Response) => {
  try {
    await stateMachine.undo();
    const io = getIo();
    const constraints = await getAllTeamConstraints();
    io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
    io.emit('auction:constraintsUpdated', { constraints });
    res.json({ success: true, data: stateMachine.getState(getTimerState()) });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

export default router;

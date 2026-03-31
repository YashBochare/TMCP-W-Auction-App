import { Router } from 'express';
import type { Request, Response } from 'express';
import { stateMachine } from '../auction/stateMachine.js';
import { getIo } from '../socket/index.js';
import { getAllTeamConstraints, getTeamConstraints, validateTeamBid } from '../auction/constraintService.js';
import { bidQueue } from '../auction/bidQueue.js';
import { auctionTimer } from '../auction/auctionTimer.js';
import { getTimerState } from '../auction/timerState.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '@auction/shared';
import { getPrisma } from '../lib/prisma.js';

const router = Router();

router.get('/state', (_req: Request, res: Response) => {
  res.json({ success: true, data: stateMachine.getState(getTimerState()) });
});

router.post('/next-player', async (_req: Request, res: Response) => {
  try {
    const player = await stateMachine.nextPlayer();
    auctionTimer.stop();
    bidQueue.clearQueue();
    const io = getIo();
    const constraints = await getAllTeamConstraints();
    io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
    io.emit('auction:playerPresented', { player: player as any });
    io.emit('auction:constraintsUpdated', { constraints });
    io.to('room:auctioneer').emit('auction:bidProposalQueued', { proposals: [] });
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
    auctionTimer.start();
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
    bidQueue.clearQueue();
    const io = getIo();
    const constraints = await getAllTeamConstraints();
    io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
    io.emit('auction:sold', result);
    io.emit('auction:constraintsUpdated', { constraints });
    io.to('room:auctioneer').emit('auction:bidProposalQueued', { proposals: [] });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

router.post('/mark-unsold', async (_req: Request, res: Response) => {
  try {
    const result = await stateMachine.markUnsold();
    auctionTimer.stop();
    bidQueue.clearQueue();
    const io = getIo();
    io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
    io.emit('auction:unsold', result);
    io.to('room:auctioneer').emit('auction:bidProposalQueued', { proposals: [] });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
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

// Bid proposal endpoints

router.post('/propose-bid', requireAuth, requireRole(UserRole.CAPTAIN), async (req: Request, res: Response) => {
  const { bidAmount } = req.body;
  if (bidAmount === undefined || typeof bidAmount !== 'number' || !Number.isFinite(bidAmount) || bidAmount <= 0 || !Number.isInteger(bidAmount)) {
    res.status(400).json({ success: false, error: { message: 'bidAmount must be a positive integer' } });
    return;
  }

  const teamId = req.user?.teamId;
  if (!teamId) {
    res.status(400).json({ success: false, error: { message: 'Captain not associated with a team' } });
    return;
  }
  if (stateMachine.phase !== 'bidding_open') {
    res.status(400).json({ success: false, error: { message: 'Bidding is not currently open' } });
    return;
  }

  const team = await getPrisma().team.findUnique({ where: { id: teamId }, select: { name: true } });
  if (!team) {
    res.status(404).json({ success: false, error: { message: 'Team not found' } });
    return;
  }

  const result = await validateTeamBid(teamId, bidAmount, stateMachine.currentHighestBid);
  if (!result.valid) {
    res.status(400).json({ success: false, error: { message: result.reason } });
    return;
  }

  bidQueue.removeTeamProposal(teamId);
  const proposal = bidQueue.addProposal(teamId, team.name, bidAmount);

  const io = getIo();
  io.to('room:auctioneer').emit('auction:bidProposed', { proposal });
  io.to('room:auctioneer').emit('auction:bidProposalQueued', { proposals: bidQueue.getProposals() });

  res.json({ success: true, data: { proposal } });
});

router.get('/proposals', requireAuth, requireRole(UserRole.AUCTIONEER), (_req: Request, res: Response) => {
  res.json({ success: true, data: { proposals: bidQueue.getProposals() } });
});

// Bid acceptance endpoint
router.post('/accept-bid', requireAuth, requireRole(UserRole.AUCTIONEER), async (req: Request, res: Response) => {
  const { proposalId } = req.body;
  if (!proposalId || typeof proposalId !== 'string') {
    res.status(400).json({ success: false, error: { message: 'proposalId is required' } });
    return;
  }

  const proposal = bidQueue.getProposalById(proposalId);
  if (!proposal) {
    res.status(404).json({ success: false, error: { message: 'Proposal not found or already processed' } });
    return;
  }

  try {
    const previousHighestBidderTeamId = stateMachine.currentHighestBidderTeamId;

    await stateMachine.acceptBid(proposal.teamId, proposal.bidAmount);
    if (auctionTimer.isRunning()) { auctionTimer.reset(); }

    bidQueue.removeProposal(proposal.id);
    const toBeClearedProposals = bidQueue.getProposals().filter(p => p.bidAmount <= proposal.bidAmount);
    const clearedTeamIds = toBeClearedProposals.map(p => p.teamId);
    bidQueue.clearLowerProposals(proposal.bidAmount);

    const playerName = stateMachine.currentPlayer?.name || 'Unknown';
    const io = getIo();
    io.emit('auction:bidAccepted', { teamId: proposal.teamId, teamName: proposal.teamName, bidAmount: proposal.bidAmount, playerName });
    io.emit('auction:stateChanged', stateMachine.getState(getTimerState()));
    io.to('room:auctioneer').emit('auction:bidProposalQueued', { proposals: bidQueue.getProposals() });

    // Captain notifications (same as WS handler)
    const { getClientsByRole } = await import('../socket/clientRegistry.js');
    const allCaptains = getClientsByRole('captain');
    const winningCaptain = allCaptains.find(c => c.teamId === proposal.teamId);
    if (winningCaptain) io.to(winningCaptain.socketId).emit('captain:highestBidder', { bidAmount: proposal.bidAmount });
    for (const tid of clearedTeamIds) {
      if (tid === proposal.teamId) continue;
      const cap = allCaptains.find(c => c.teamId === tid);
      if (cap) io.to(cap.socketId).emit('captain:outbid', { newHighestBid: proposal.bidAmount, newLeadingTeam: proposal.teamName });
    }
    if (previousHighestBidderTeamId && previousHighestBidderTeamId !== proposal.teamId && !clearedTeamIds.includes(previousHighestBidderTeamId)) {
      const cap = allCaptains.find(c => c.teamId === previousHighestBidderTeamId);
      if (cap) io.to(cap.socketId).emit('captain:outbid', { newHighestBid: proposal.bidAmount, newLeadingTeam: proposal.teamName });
    }

    res.json({ success: true, data: { acceptedBid: { teamId: proposal.teamId, teamName: proposal.teamName, bidAmount: proposal.bidAmount } } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

export default router;

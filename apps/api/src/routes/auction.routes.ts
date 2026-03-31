import { Router } from 'express';
import type { Request, Response } from 'express';
import { stateMachine } from '../auction/stateMachine.js';
import { getIo } from '../socket/index.js';

const router = Router();

router.get('/state', (_req: Request, res: Response) => {
  res.json({ success: true, data: stateMachine.getState() });
});

router.post('/next-player', async (_req: Request, res: Response) => {
  try {
    const player = await stateMachine.nextPlayer();
    const io = getIo();
    io.emit('auction:stateChanged', stateMachine.getState());
    io.emit('auction:playerPresented', { player: player as any });
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
    getIo().emit('auction:stateChanged', stateMachine.getState());
    res.json({ success: true, data: stateMachine.getState() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

router.post('/close-bidding', async (_req: Request, res: Response) => {
  try {
    await stateMachine.closeBidding();
    getIo().emit('auction:stateChanged', stateMachine.getState());
    res.json({ success: true, data: stateMachine.getState() });
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
    const io = getIo();
    io.emit('auction:stateChanged', stateMachine.getState());
    io.emit('auction:sold', result);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

router.post('/mark-unsold', async (_req: Request, res: Response) => {
  try {
    const result = await stateMachine.markUnsold();
    const io = getIo();
    io.emit('auction:stateChanged', stateMachine.getState());
    io.emit('auction:unsold', result);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

export default router;

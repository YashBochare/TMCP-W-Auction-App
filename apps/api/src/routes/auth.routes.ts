import { Router } from 'express';
import type { Request, Response } from 'express';
import { UserRole } from '@auction/shared';
import {
  validateCaptainCode,
  validateAuctioneerPassword,
  generateToken,
} from '../services/auth.service.js';

const router = Router();

router.post('/captain', async (req: Request, res: Response) => {
  const { accessCode } = req.body;
  if (!accessCode || typeof accessCode !== 'string') {
    res.status(400).json({ error: 'Access code is required' });
    return;
  }

  let team;
  try {
    team = await validateCaptainCode(accessCode);
  } catch (err) {
    console.error('Captain login DB error:', err);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  if (!team) {
    res.status(401).json({ error: 'Invalid access code' });
    return;
  }

  const token = generateToken({
    role: UserRole.CAPTAIN,
    teamId: team.teamId,
    teamName: team.teamName,
  });

  res.json({ token, role: UserRole.CAPTAIN, teamId: team.teamId, teamName: team.teamName });
});

router.post('/admin', (req: Request, res: Response) => {
  const { accessCode } = req.body;
  if (!accessCode || typeof accessCode !== 'string') {
    res.status(400).json({ error: 'Access code is required' });
    return;
  }

  if (!validateAuctioneerPassword(accessCode)) {
    res.status(401).json({ error: 'Invalid access code' });
    return;
  }

  const token = generateToken({ role: UserRole.AUCTIONEER });

  res.json({ token, role: UserRole.AUCTIONEER });
});

export default router;

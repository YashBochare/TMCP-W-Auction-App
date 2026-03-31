import { Router } from 'express';
import type { Request, Response } from 'express';
import { getPrisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const DEFAULTS = { startingPurse: 100000, maxSquadSize: 7, minBasePrice: 3000 } as const;

const router = Router();

// All routes require auctioneer auth
router.use(requireAuth, requireRole('auctioneer'));

// GET /api/event-config
router.get('/', async (_req: Request, res: Response) => {
  try {
    const config = await getPrisma().eventConfig.findFirst();
    res.json({ success: true, data: config || { ...DEFAULTS } });
  } catch (err) {
    console.error('EventConfig GET error:', err);
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
});

// POST /api/event-config (upsert)
router.post('/', async (req: Request, res: Response) => {
  const { startingPurse, maxSquadSize, minBasePrice } = req.body;

  // Validation
  const errors: string[] = [];
  if (startingPurse !== undefined && (!Number.isInteger(startingPurse) || startingPurse <= 0)) {
    errors.push('startingPurse must be a positive integer');
  }
  if (maxSquadSize !== undefined && (!Number.isInteger(maxSquadSize) || maxSquadSize <= 0)) {
    errors.push('maxSquadSize must be a positive integer');
  }
  if (minBasePrice !== undefined && (!Number.isInteger(minBasePrice) || minBasePrice <= 0)) {
    errors.push('minBasePrice must be a positive integer');
  }

  const purse = startingPurse ?? DEFAULTS.startingPurse;
  const squad = maxSquadSize ?? DEFAULTS.maxSquadSize;
  const base = minBasePrice ?? DEFAULTS.minBasePrice;

  if (purse < base * squad) {
    errors.push(`startingPurse (${purse}) must be >= minBasePrice (${base}) * maxSquadSize (${squad})`);
  }

  if (errors.length > 0) {
    res.status(422).json({ success: false, error: { message: 'Validation failed', details: errors } });
    return;
  }

  try {
    const existing = await getPrisma().eventConfig.findFirst();
    const data = { startingPurse: purse, maxSquadSize: squad, minBasePrice: base };

    const config = existing
      ? await getPrisma().eventConfig.update({ where: { id: existing.id }, data })
      : await getPrisma().eventConfig.create({ data });

    res.json({ success: true, data: config });
  } catch (err) {
    console.error('EventConfig POST error:', err);
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
});

export default router;

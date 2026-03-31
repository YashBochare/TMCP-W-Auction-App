import { Router } from 'express';
import type { Request, Response } from 'express';
import { ALLOWED_COLORS } from '@auction/shared';
import { getPrisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('auctioneer'));

// GET /api/teams
router.get('/', async (_req: Request, res: Response) => {
  const teams = await getPrisma().team.findMany({ orderBy: { createdAt: 'asc' } });
  res.json({ success: true, data: teams });
});

// POST /api/teams
router.post('/', async (req: Request, res: Response) => {
  const { name, accessCode, colorCode } = req.body;
  const errors = validateTeam(name, accessCode, colorCode);
  if (errors.length > 0) {
    res.status(422).json({ success: false, error: { message: 'Validation failed', details: errors } });
    return;
  }

  try {
    const team = await getPrisma().team.create({ data: { name, accessCode, colorCode } });
    res.status(201).json({ success: true, data: team });
  } catch (err: any) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      res.status(409).json({ success: false, error: { message: `${field} already exists` } });
      return;
    }
    throw err;
  }
});

// POST /api/teams/batch
router.post('/batch', async (req: Request, res: Response) => {
  const { teams: teamList } = req.body;
  if (!Array.isArray(teamList) || teamList.length === 0) {
    res.status(422).json({ success: false, error: { message: 'teams must be a non-empty array' } });
    return;
  }

  const allErrors: string[] = [];
  for (let i = 0; i < teamList.length; i++) {
    const t = teamList[i];
    const errs = validateTeam(t?.name, t?.accessCode, t?.colorCode);
    errs.forEach((e) => allErrors.push(`Team ${i + 1}: ${e}`));
  }

  // Check for duplicates within the batch
  const names = teamList.map((t: any) => t.name);
  const codes = teamList.map((t: any) => t.accessCode);
  if (new Set(names).size !== names.length) allErrors.push('Duplicate team names in batch');
  if (new Set(codes).size !== codes.length) allErrors.push('Duplicate access codes in batch');

  if (allErrors.length > 0) {
    res.status(422).json({ success: false, error: { message: 'Validation failed', details: allErrors } });
    return;
  }

  try {
    // Delete existing teams and recreate (batch setup replaces all)
    await getPrisma().$transaction(async (tx) => {
      await tx.team.deleteMany();
      for (const t of teamList) {
        await tx.team.create({ data: { name: t.name, accessCode: t.accessCode, colorCode: t.colorCode } });
      }
    });
    const teams = await getPrisma().team.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ success: true, data: teams });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, error: { message: 'Duplicate name or access code' } });
      return;
    }
    throw err;
  }
});

// PUT /api/teams/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, accessCode, colorCode } = req.body;

  const errors: string[] = [];
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    errors.push('name must be a non-empty string');
  }
  if (accessCode !== undefined && (typeof accessCode !== 'string' || accessCode.trim().length === 0)) {
    errors.push('accessCode must be a non-empty string');
  }
  if (colorCode !== undefined && !(ALLOWED_COLORS as readonly string[]).includes(colorCode)) {
    errors.push(`colorCode must be one of: ${ALLOWED_COLORS.join(', ')}`);
  }
  if (errors.length > 0) {
    res.status(422).json({ success: false, error: { message: 'Validation failed', details: errors } });
    return;
  }

  try {
    const team = await getPrisma().team.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(accessCode && { accessCode: accessCode.trim() }),
        ...(colorCode && { colorCode }),
      },
    });
    res.json({ success: true, data: team });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, error: { message: 'Team not found' } });
      return;
    }
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      res.status(409).json({ success: false, error: { message: `${field} already exists` } });
      return;
    }
    throw err;
  }
});

// DELETE /api/teams/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    await getPrisma().team.delete({ where: { id } });
    res.json({ success: true, data: null });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, error: { message: 'Team not found' } });
      return;
    }
    throw err;
  }
});

function validateTeam(name: unknown, accessCode: unknown, colorCode: unknown): string[] {
  const errors: string[] = [];
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('name is required');
  }
  if (!accessCode || typeof accessCode !== 'string' || accessCode.trim().length === 0) {
    errors.push('accessCode is required');
  }
  if (!colorCode || typeof colorCode !== 'string') {
    errors.push('colorCode is required');
  } else if (!(ALLOWED_COLORS as readonly string[]).includes(colorCode)) {
    errors.push(`colorCode must be one of: ${ALLOWED_COLORS.join(', ')}`);
  }
  return errors;
}

export default router;

import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { processPlayerUpload } from '../services/playerUpload.js';
import { getPrisma } from '../lib/prisma.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    const allowedExtensions = ['.xlsx', '.csv'];
    const ext = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));

    if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx and .csv files are accepted'));
    }
  },
});

router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      res.status(400).json({
        success: false,
        playersCreated: 0,
        errors: [{ row: 0, field: 'file', message: err.message }],
      });
      return;
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        playersCreated: 0,
        errors: [{ row: 0, field: 'file', message: 'No file uploaded' }],
      });
      return;
    }

    // Determine MIME type: trust extension over Content-Type header
    const ext = req.file.originalname
      .toLowerCase()
      .substring(req.file.originalname.lastIndexOf('.'));
    let mimeType = req.file.mimetype;
    if (ext === '.csv') {
      mimeType = 'text/csv';
    } else if (ext === '.xlsx') {
      mimeType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    const result = await processPlayerUpload(req.file.buffer, mimeType);
    const status = result.success ? 200 : 400;
    res.status(status).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload processing failed';
    res.status(400).json({
      success: false,
      playersCreated: 0,
      errors: [{ row: 0, field: 'file', message }],
    });
  }
});

// GET /api/players — list all, sorted by basePrice DESC
router.get('/', async (_req: Request, res: Response) => {
  const players = await getPrisma().player.findMany({
    orderBy: { basePrice: 'desc' },
  });
  res.json({ success: true, data: players });
});

// PUT /api/players/:id — update player details
router.put('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, role, clubLevel, speakingSkill, funTitle, basePrice } = req.body;

  // Check player exists
  const existing = await getPrisma().player.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: { message: 'Player not found' } });
    return;
  }

  // Reject edits on SOLD players
  if (existing.status === 'SOLD') {
    res.status(400).json({ success: false, error: { message: 'Cannot edit a SOLD player' } });
    return;
  }

  // Validation
  const errors: string[] = [];
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    errors.push('name must be a non-empty string');
  }
  if (basePrice !== undefined) {
    if (!Number.isInteger(basePrice) || basePrice <= 0) {
      errors.push('basePrice must be a positive integer');
    } else {
      // Check against global min base price
      const config = await getPrisma().eventConfig.findFirst();
      const minBase = config?.minBasePrice ?? 0;
      if (basePrice < minBase) {
        errors.push(`basePrice must be >= global minimum (${minBase})`);
      }
    }
  }
  if (errors.length > 0) {
    res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors } });
    return;
  }

  const player = await getPrisma().player.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(role && { role }),
      ...(clubLevel && { clubLevel }),
      ...(speakingSkill && { speakingSkill }),
      ...(funTitle && { funTitle }),
      ...(basePrice && { basePrice }),
    },
  });
  res.json({ success: true, data: player });
});

// DELETE /api/players/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const existing = await getPrisma().player.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: { message: 'Player not found' } });
    return;
  }

  if (existing.status === 'SOLD') {
    res.status(400).json({ success: false, error: { message: 'Cannot delete a SOLD player' } });
    return;
  }

  await getPrisma().player.delete({ where: { id } });
  res.status(204).send();
});

export default router;

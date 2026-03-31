import type {
  PlayerUploadRow,
  UploadValidationError,
  PlayerUploadResponse,
} from '@auction/shared';
import { getPrisma } from '../lib/prisma.js';
import { parseXlsx, parseCsv } from './fileParser.js';

interface ValidateResult {
  valid: PlayerUploadRow | null;
  errors: UploadValidationError[];
}

export function validatePlayerRow(
  row: Record<string, unknown>,
  rowIndex: number,
): ValidateResult {
  const errors: UploadValidationError[] = [];

  const name = String(row.name ?? '').trim();
  if (!name) {
    errors.push({
      row: rowIndex,
      field: 'name',
      message: 'Name is required',
      value: String(row.name ?? ''),
    });
  }

  const role = String(row.role ?? '').trim();
  if (!role) {
    errors.push({
      row: rowIndex,
      field: 'role',
      message: 'Role is required',
      value: String(row.role ?? ''),
    });
  }

  const clubLevel = String(row.clubLevel ?? '').trim();
  if (!clubLevel) {
    errors.push({
      row: rowIndex,
      field: 'clubLevel',
      message: 'Club Level is required',
      value: String(row.clubLevel ?? ''),
    });
  }

  const speakingSkill = String(row.speakingSkill ?? '').trim();
  if (!speakingSkill) {
    errors.push({
      row: rowIndex,
      field: 'speakingSkill',
      message: 'Speaking Skill is required',
      value: String(row.speakingSkill ?? ''),
    });
  }

  const funTitle = String(row.funTitle ?? '').trim();
  if (!funTitle) {
    errors.push({
      row: rowIndex,
      field: 'funTitle',
      message: 'Fun Title is required',
      value: String(row.funTitle ?? ''),
    });
  }

  const rawBasePrice = row.basePrice;
  const basePrice = Number(rawBasePrice);
  if (isNaN(basePrice) || !Number.isInteger(basePrice) || basePrice <= 0) {
    errors.push({
      row: rowIndex,
      field: 'basePrice',
      message: 'Base Price must be a valid positive number',
      value: String(rawBasePrice ?? ''),
    });
  }

  if (errors.length > 0) {
    return { valid: null, errors };
  }

  return {
    valid: { name, role, clubLevel, speakingSkill, funTitle, basePrice },
    errors: [],
  };
}

export async function processPlayerUpload(
  buffer: Buffer,
  mimeType: string,
): Promise<PlayerUploadResponse> {
  let rows: Record<string, unknown>[];

  if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    rows = await parseXlsx(buffer);
  } else if (mimeType === 'text/csv') {
    rows = await parseCsv(buffer);
  } else {
    return {
      success: false,
      playersCreated: 0,
      errors: [
        {
          row: 0,
          field: 'file',
          message: `Unsupported file type: ${mimeType}`,
        },
      ],
    };
  }

  if (rows.length === 0) {
    return {
      success: false,
      playersCreated: 0,
      errors: [
        { row: 0, field: 'file', message: 'File contains no data rows' },
      ],
    };
  }

  const allErrors: UploadValidationError[] = [];
  const validRows: PlayerUploadRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const { valid, errors } = validatePlayerRow(rows[i], i + 2); // +2: row 1 is header, data starts at row 2
    if (valid) {
      validRows.push(valid);
    }
    allErrors.push(...errors);
  }

  if (allErrors.length > 0) {
    return { success: false, playersCreated: 0, errors: allErrors };
  }

  const prisma = getPrisma();

  // Atomic: delete existing PENDING players and insert new ones in a single transaction
  await prisma.$transaction(async (tx) => {
    await tx.player.deleteMany({ where: { status: 'PENDING' } });
    await tx.player.createMany({
      data: validRows.map((row) => ({
        name: row.name,
        role: row.role,
        clubLevel: row.clubLevel,
        speakingSkill: row.speakingSkill,
        funTitle: row.funTitle,
        basePrice: row.basePrice,
        status: 'PENDING' as const,
        photoUrl: null,
      })),
    });
  });

  return { success: true, playersCreated: validRows.length, errors: [] };
}

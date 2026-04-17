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

const DEFAULT_BASE_PRICE = 3000;

/** Convert Google Drive share links to direct CDN URLs that work in <img> tags. */
function normalizeDriveUrl(url: string): string {
  if (!url) return url;
  // Matches: https://drive.google.com/open?id=FILE_ID, /file/d/FILE_ID/view, ?id=FILE_ID
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    // lh3.googleusercontent.com serves the image directly (no redirect) — works reliably in <img>
    return `https://lh3.googleusercontent.com/d/${idMatch[1]}=w400`;
  }
  return url;
}

export function validatePlayerRow(
  row: Record<string, unknown>,
  rowIndex: number,
): ValidateResult {
  const errors: UploadValidationError[] = [];

  const name = String(row.name ?? '').trim();
  if (!name) {
    errors.push({ row: rowIndex, field: 'name', message: 'Name is required', value: String(row.name ?? '') });
  }

  const club = String(row.club ?? '').trim();
  const experience = String(row.experience ?? '').trim();
  const education = String(row.education ?? '').trim();
  const contests = String(row.contests ?? '').trim();
  const message = String(row.message ?? '').trim();
  const rawPhoto = String(row.photoUrl ?? row.photo ?? '').trim();
  const photoUrl = rawPhoto ? normalizeDriveUrl(rawPhoto) : undefined;

  // basePrice is optional — defaults to 3000
  const rawBasePrice = row.basePrice;
  let basePrice = DEFAULT_BASE_PRICE;
  if (rawBasePrice !== undefined && rawBasePrice !== null && rawBasePrice !== '') {
    const parsed = Number(rawBasePrice);
    if (isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      errors.push({
        row: rowIndex,
        field: 'basePrice',
        message: 'Base Price must be a valid positive number',
        value: String(rawBasePrice),
      });
    } else {
      basePrice = parsed;
    }
  }

  if (errors.length > 0) {
    return { valid: null, errors };
  }

  return {
    valid: { name, club, experience, education, contests, message, photoUrl, basePrice },
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
      errors: [{ row: 0, field: 'file', message: `Unsupported file type: ${mimeType}` }],
    };
  }

  if (rows.length === 0) {
    return {
      success: false,
      playersCreated: 0,
      errors: [{ row: 0, field: 'file', message: 'File contains no data rows' }],
    };
  }

  const allErrors: UploadValidationError[] = [];
  const validRows: PlayerUploadRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const { valid, errors } = validatePlayerRow(rows[i], i + 2);
    if (valid) {
      validRows.push(valid);
    }
    allErrors.push(...errors);
  }

  if (allErrors.length > 0) {
    return { success: false, playersCreated: 0, errors: allErrors };
  }

  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    // Reset auction state so server doesn't think it's mid-auction from a previous session
    await tx.auctionState.updateMany({
      data: {
        currentPlayerId: null,
        currentHighestBid: 0,
        currentHighestBidderId: null,
        biddingStatus: 'IDLE',
        isPaused: false,
      },
    });
    await tx.player.deleteMany({ where: { status: 'PENDING' } });
    await tx.player.createMany({
      data: validRows.map((row) => ({
        name: row.name,
        club: row.club,
        experience: row.experience,
        education: row.education,
        contests: row.contests,
        message: row.message,
        photoUrl: row.photoUrl ?? null,
        basePrice: row.basePrice,
        status: 'PENDING' as const,
      })),
    });
  });

  return { success: true, playersCreated: validRows.length, errors: [] };
}

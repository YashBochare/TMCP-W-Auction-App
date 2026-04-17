import ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';

/**
 * Normalize a column header by lowercasing and removing spaces.
 * Maps common variants to canonical field names.
 */
function normalizeHeader(header: string): string | null {
  const h = header.toLowerCase().trim();

  // Exact matches first (highest priority)
  const exactMap: Record<string, string> = {
    'name': 'name',
    'club': 'club',
    'experience': 'experience',
    'education': 'education',
    'contests': 'contests',
    'message': 'message',
    'photo': 'photoUrl',
    'photourl': 'photoUrl',
    'baseprice': 'basePrice',
    'price': 'basePrice',
  };
  const stripped = h.replace(/\s+/g, '');
  if (exactMap[stripped]) return exactMap[stripped];

  // Keyword matching for Google Form-style long questions
  // Order matters — most specific first to avoid collisions
  if (h.includes('photo') || h.includes('picture') || h.includes('image')) return 'photoUrl';
  if (h.includes('price') || h.includes('base price')) return 'basePrice';
  if (h.includes('contest')) return 'contests';
  if (h.includes('educat') || h.includes('level') || h.includes('pathway')) return 'education';
  if (h.includes('experi') || h.includes('how long') || h.includes('years')) return 'experience';
  if (h.includes('message') || h.includes('tagline') || h.includes('pitch') || h.includes('why')) return 'message';
  if (h.includes('club')) return 'club';
  if (h.includes('name') || h.includes('participant')) return 'name';

  return null;
}

const REQUIRED_FIELDS = ['name'];

export function validateHeaders(headers: (string | null)[]): string[] {
  const found = new Set(headers.filter((h): h is string => h !== null));
  return REQUIRED_FIELDS.filter((f) => !found.has(f));
}

function normalizeRowHeaders(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const field = normalizeHeader(key.trim());
    if (field) {
      normalized[field] = value;
    }
  }
  return normalized;
}

export async function parseXlsx(
  buffer: Buffer,
): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) {
    return [];
  }

  // Extract headers from row 1
  const headerRow = worksheet.getRow(1);
  const headers: (string | null)[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    while (headers.length < colNumber - 1) {
      headers.push(null);
    }
    const raw = String(cell.value ?? '').trim();
    headers.push(normalizeHeader(raw));
  });

  const missingCols = validateHeaders(headers);
  if (missingCols.length > 0) {
    throw new Error(`Missing required columns: ${missingCols.join(', ')}`);
  }

  const rows: Record<string, unknown>[] = [];
  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
    const row = worksheet.getRow(rowIndex);
    const obj: Record<string, unknown> = {};
    let hasData = false;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        // Unwrap ExcelJS rich cell values (hyperlinks, rich text, etc.)
        let val: unknown = cell.value;
        if (val && typeof val === 'object') {
          const v = val as { hyperlink?: string; text?: string; result?: unknown; richText?: Array<{ text: string }> };
          if (v.hyperlink) val = v.hyperlink;
          else if (v.text) val = v.text;
          else if (v.richText) val = v.richText.map(r => r.text).join('');
          else if (v.result !== undefined) val = v.result;
        }
        obj[header] = val;
        if (val !== null && val !== undefined && String(val).trim() !== '') {
          hasData = true;
        }
      }
    });

    if (hasData) {
      rows.push(obj);
    }
  }

  return rows;
}

export async function parseCsv(
  buffer: Buffer,
): Promise<Record<string, unknown>[]> {
  const raw: Record<string, unknown>[] = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const normalized = raw.map(normalizeRowHeaders);

  if (normalized.length > 0) {
    const csvHeaders = Object.keys(normalized[0]).filter((k): k is string => k !== null);
    const missingCols = validateHeaders(csvHeaders);
    if (missingCols.length > 0) {
      throw new Error(`Missing required columns: ${missingCols.join(', ')}`);
    }
  }

  return normalized;
}

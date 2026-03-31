import ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';

/**
 * Normalize a column header by lowercasing and removing spaces.
 * Maps common variants to canonical field names.
 */
function normalizeHeader(header: string): string | null {
  const normalized = header.toLowerCase().replace(/\s+/g, '');

  const headerMap: Record<string, string> = {
    name: 'name',
    playername: 'name',
    role: 'role',
    clublevel: 'clubLevel',
    speakingskill: 'speakingSkill',
    funtitle: 'funTitle',
    baseprice: 'basePrice',
    price: 'basePrice',
  };

  return headerMap[normalized] ?? null;
}

const REQUIRED_FIELDS = ['name', 'role', 'clubLevel', 'speakingSkill', 'funTitle', 'basePrice'];

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
        obj[header] = cell.value;
        if (cell.value !== null && cell.value !== undefined && String(cell.value).trim() !== '') {
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

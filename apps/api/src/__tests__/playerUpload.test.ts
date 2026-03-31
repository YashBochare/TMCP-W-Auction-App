import { describe, it, expect } from 'vitest';
import { validatePlayerRow } from '../services/playerUpload.js';
import { parseXlsx, parseCsv } from '../services/fileParser.js';
import { createTestXlsx } from './fixtures/createTestXlsx.js';

describe('validatePlayerRow', () => {
  const validRow = {
    name: 'John Doe',
    role: 'Batsman',
    clubLevel: 'A',
    speakingSkill: 'Fluent',
    funTitle: 'The Wall',
    basePrice: 5000,
  };

  it('returns valid result for valid data', () => {
    const result = validatePlayerRow(validRow, 2);
    expect(result.valid).toEqual({
      name: 'John Doe',
      role: 'Batsman',
      clubLevel: 'A',
      speakingSkill: 'Fluent',
      funTitle: 'The Wall',
      basePrice: 5000,
    });
    expect(result.errors).toHaveLength(0);
  });

  it('returns error for missing name', () => {
    const result = validatePlayerRow({ ...validRow, name: '' }, 3);
    expect(result.valid).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      row: 3,
      field: 'name',
      message: 'Name is required',
    });
  });

  it('returns error for non-numeric basePrice', () => {
    const result = validatePlayerRow({ ...validRow, basePrice: 'abc' }, 4);
    expect(result.valid).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      row: 4,
      field: 'basePrice',
      message: 'Base Price must be a valid positive number',
      value: 'abc',
    });
  });

  it('returns error for negative basePrice', () => {
    const result = validatePlayerRow({ ...validRow, basePrice: -100 }, 5);
    expect(result.valid).toBeNull();
    expect(result.errors[0].field).toBe('basePrice');
  });

  it('returns error for zero basePrice', () => {
    const result = validatePlayerRow({ ...validRow, basePrice: 0 }, 5);
    expect(result.valid).toBeNull();
    expect(result.errors[0].field).toBe('basePrice');
  });

  it('returns all errors for multiple invalid fields', () => {
    const result = validatePlayerRow(
      { name: '', role: '', clubLevel: '', speakingSkill: '', funTitle: '', basePrice: 'bad' },
      6,
    );
    expect(result.valid).toBeNull();
    expect(result.errors).toHaveLength(6);
    const fields = result.errors.map((e) => e.field);
    expect(fields).toContain('name');
    expect(fields).toContain('role');
    expect(fields).toContain('clubLevel');
    expect(fields).toContain('speakingSkill');
    expect(fields).toContain('funTitle');
    expect(fields).toContain('basePrice');
  });

  it('trims whitespace from string fields', () => {
    const result = validatePlayerRow({ ...validRow, name: '  John Doe  ' }, 2);
    expect(result.valid?.name).toBe('John Doe');
  });

  it('parses string basePrice as number', () => {
    const result = validatePlayerRow({ ...validRow, basePrice: '3000' }, 2);
    expect(result.valid?.basePrice).toBe(3000);
  });
});

describe('parseXlsx', () => {
  it('parses a valid xlsx buffer', async () => {
    const buffer = await createTestXlsx(
      ['Name', 'Role', 'Club Level', 'Speaking Skill', 'Fun Title', 'Base Price'],
      [
        ['Alice', 'Bowler', 'A', 'Good', 'Speed Queen', 8000],
        ['Bob', 'Batsman', 'B', 'Great', 'The Wall', 5000],
      ],
    );

    const rows = await parseXlsx(buffer);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: 'Alice',
      role: 'Bowler',
      clubLevel: 'A',
      speakingSkill: 'Good',
      funTitle: 'Speed Queen',
      basePrice: 8000,
    });
  });

  it('handles case-insensitive headers', async () => {
    const buffer = await createTestXlsx(
      ['NAME', 'ROLE', 'CLUB LEVEL', 'SPEAKING SKILL', 'FUN TITLE', 'BASE PRICE'],
      [['Alice', 'Bowler', 'A', 'Good', 'Fast', 8000]],
    );

    const rows = await parseXlsx(buffer);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Alice');
  });

  it('returns empty array for empty worksheet', async () => {
    const buffer = await createTestXlsx(
      ['Name', 'Role', 'Club Level', 'Speaking Skill', 'Fun Title', 'Base Price'],
      [],
    );

    const rows = await parseXlsx(buffer);
    expect(rows).toHaveLength(0);
  });
});

describe('parseCsv', () => {
  it('parses a valid CSV buffer', async () => {
    const csv = `Name,Role,Club Level,Speaking Skill,Fun Title,Base Price
Alice,Bowler,A,Good,Speed Queen,8000
Bob,Batsman,B,Great,The Wall,5000`;

    const rows = await parseCsv(Buffer.from(csv));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: 'Alice',
      role: 'Bowler',
      clubLevel: 'A',
      speakingSkill: 'Good',
      funTitle: 'Speed Queen',
      basePrice: '8000', // CSV returns strings
    });
  });

  it('handles header variants like "Player Name" and "Price"', async () => {
    const csv = `Player Name,Role,Club Level,Speaking Skill,Fun Title,Price
Alice,Bowler,A,Good,Fast,8000`;

    const rows = await parseCsv(Buffer.from(csv));
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Alice');
    expect(rows[0].basePrice).toBe('8000');
  });

  it('skips empty lines', async () => {
    const csv = `Name,Role,Club Level,Speaking Skill,Fun Title,Base Price
Alice,Bowler,A,Good,Speed Queen,8000

Bob,Batsman,B,Great,The Wall,5000`;

    const rows = await parseCsv(Buffer.from(csv));
    expect(rows).toHaveLength(2);
  });
});

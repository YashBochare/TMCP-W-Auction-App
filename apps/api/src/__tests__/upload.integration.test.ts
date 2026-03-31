import { describe, it, expect, beforeAll, vi } from 'vitest';

// Mock Prisma before any imports that use it
vi.mock('../lib/prisma.js', () => {
  const mockPrisma = {
    player: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    $transaction: vi.fn(async (fn: (tx: any) => Promise<void>) => {
      await fn({
        player: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      });
    }),
  };
  return {
    getPrisma: () => mockPrisma,
    __mockPrisma: mockPrisma,
  };
});

beforeAll(() => {
  process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
});

import express from 'express';
import playersRoutes from '../routes/players.routes.js';
import { createTestXlsx } from './fixtures/createTestXlsx.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/players', playersRoutes);
  return app;
}

describe('POST /api/players/upload', () => {
  const app = createTestApp();

  async function uploadFile(
    filePath: string | undefined,
    fileBuffer: Buffer | undefined,
    filename: string,
  ) {
    const { default: supertest } = await import('supertest');
    const req = (supertest as any)(app).post('/api/players/upload');
    if (fileBuffer) {
      req.attach('file', fileBuffer, filename);
    }
    return req;
  }

  it('returns 200 with valid CSV file', async () => {
    const csv = `Name,Role,Club Level,Speaking Skill,Fun Title,Base Price
Alice,Bowler,A,Good,Speed Queen,8000
Bob,Batsman,B,Great,The Wall,5000`;

    const res = await uploadFile(undefined, Buffer.from(csv), 'players.csv');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.playersCreated).toBe(2);
    expect(res.body.errors).toHaveLength(0);
  });

  it('returns 200 with valid XLSX file', async () => {
    const buffer = await createTestXlsx(
      ['Name', 'Role', 'Club Level', 'Speaking Skill', 'Fun Title', 'Base Price'],
      [
        ['Alice', 'Bowler', 'A', 'Good', 'Speed Queen', 8000],
        ['Bob', 'Batsman', 'B', 'Great', 'The Wall', 5000],
      ],
    );

    const res = await uploadFile(undefined, buffer, 'players.xlsx');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.playersCreated).toBe(2);
  });

  it('returns 400 with invalid data in CSV', async () => {
    const csv = `Name,Role,Club Level,Speaking Skill,Fun Title,Base Price
,Bowler,A,Good,Speed Queen,abc
Bob,,B,,The Wall,-100`;

    const res = await uploadFile(undefined, Buffer.from(csv), 'players.csv');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.playersCreated).toBe(0);
    expect(res.body.errors.length).toBeGreaterThan(0);

    // Check specific errors are reported with row numbers
    const fields = res.body.errors.map((e: any) => e.field);
    expect(fields).toContain('name');
    expect(fields).toContain('basePrice');
  });

  it('returns 400 when no file is uploaded', async () => {
    const { default: supertest } = await import('supertest');
    const res = await (supertest as any)(app).post('/api/players/upload').send();

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0]).toMatchObject({
      row: 0,
      field: 'file',
      message: 'No file uploaded',
    });
  });

  it('returns 400 for unsupported file type', async () => {
    const { default: supertest } = await import('supertest');
    const res = await (supertest as any)(app)
      .post('/api/players/upload')
      .attach('file', Buffer.from('hello world'), 'players.txt');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0].field).toBe('file');
  });
});

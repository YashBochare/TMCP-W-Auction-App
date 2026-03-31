import { timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from '@auction/shared';
import { getAuthConfig } from '../config/auth.js';
import { getPrisma } from '../lib/prisma.js';

export async function validateCaptainCode(
  code: string
): Promise<{ teamId: string; teamName: string } | null> {
  const team = await getPrisma().team.findUnique({
    where: { accessCode: code },
    select: { id: true, name: true },
  });
  if (!team) return null;
  return { teamId: team.id, teamName: team.name };
}

export function validateAuctioneerPassword(password: string): boolean {
  const expected = getAuthConfig().auctioneerPassword;
  if (password.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload as object, getAuthConfig().jwtSecret, {
    expiresIn: getAuthConfig().jwtExpiry as string,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, getAuthConfig().jwtSecret) as AuthPayload;
  } catch {
    return null;
  }
}

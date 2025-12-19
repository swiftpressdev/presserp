import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRole } from './types';

const JWT_SECRET: string = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  adminId?: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error: any) {
    // Don't log expired token errors - they're expected and handled gracefully
    if (error?.name !== 'TokenExpiredError') {
      console.error('JWT verification failed:', error);
    }
    return null;
  }
}

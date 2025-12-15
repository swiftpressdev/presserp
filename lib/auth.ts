import { cookies } from 'next/headers';
import { verifyToken, JWTPayload } from './jwt';
import { UserRole } from './types';

export async function getAuthUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function requireAuth(): Promise<JWTPayload> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function requireAdmin(): Promise<JWTPayload> {
  const user = await requireAuth();

  if (user.role !== UserRole.ADMIN) {
    throw new Error('Admin access required');
  }

  return user;
}

export function getAdminId(user: JWTPayload): string {
  if (user.role === UserRole.ADMIN) {
    return user.id;
  }
  
  if (!user.adminId) {
    throw new Error('Admin ID not found for user');
  }
  
  return user.adminId;
}

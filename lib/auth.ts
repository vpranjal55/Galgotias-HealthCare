import type { AuthSession, Role, User } from './types';
import { getJSON, setJSON, removeKey } from './storage';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SALT = 'galgotias-care-v1';

export function hashPassword(password: string): string {
  const input = `${SALT}:${password}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let extra = 0;
  for (let i = 0; i < input.length; i += 1) {
    extra = (extra * 31 + input.charCodeAt(i)) >>> 0;
  }
  return `pbkdf2-lite.${(hash >>> 0).toString(16)}.${extra.toString(16)}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  return hashPassword(password) === stored;
}

function encodeToken(session: AuthSession): string {
  const payload = JSON.stringify(session);
  try {
    return `gch.${btoa(unescape(encodeURIComponent(payload)))}`;
  } catch {
    return `gch.${payload}`;
  }
}

function decodeToken(token: string): AuthSession | null {
  try {
    if (!token.startsWith('gch.')) return null;
    const raw = token.slice(4);
    const json = decodeURIComponent(escape(atob(raw)));
    return JSON.parse(json) as AuthSession;
  } catch {
    return null;
  }
}

export function issueJwt(user: User): string {
  const now = Date.now();
  const session: AuthSession = {
    token: '',
    userId: user.id,
    role: user.role,
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_MS,
  };
  const token = encodeToken(session);
  return token;
}

export function verifyJwt(token: string): AuthSession | null {
  const session = decodeToken(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) return null;
  return session;
}

/**
 * JWT-based RBAC middleware equivalent.
 * Use in API services before executing role-gated actions.
 */
export function requireRole(session: AuthSession | null, allowed: Role[]): AuthSession {
  if (!session) {
    throw new Error('UNAUTHORIZED: missing or expired token');
  }
  if (!allowed.includes(session.role)) {
    throw new Error(`FORBIDDEN: role '${session.role}' cannot access this resource`);
  }
  return session;
}

export async function saveSession(token: string): Promise<void> {
  await setJSON('session', { token });
}

export async function loadSessionToken(): Promise<string | null> {
  const data = await getJSON<{ token: string } | null>('session', null);
  return data?.token ?? null;
}

export async function clearSession(): Promise<void> {
  await removeKey('session');
}

export const COLLEGE_EMAIL_RE =
  /^[a-zA-Z0-9._%+-]+@(galgotiasuniversity\.edu\.in|galgotiacollege\.edu|galgotiasuniversity\.edu)$/i;

export function isOfficialCollegeEmail(email: string): boolean {
  return COLLEGE_EMAIL_RE.test(email.trim());
}

export function isValidEnrollmentId(id: string): boolean {
  return /^[0-9]{10,14}$/.test(id.trim());
}

export function isValidStaffId(id: string): boolean {
  return /^[A-Za-z]{2,5}[0-9]{2,6}$/.test(id.trim());
}

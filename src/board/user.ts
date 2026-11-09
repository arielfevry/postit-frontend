import { clearSession as clearLoginSession, getSession } from '../LoginAndRegistry/utils/session';
import type { User } from './types';

// The board uses the login page's session (localStorage "user_data",
// written by LoginAndRegistry after /api/login): { token, id, name }.
// Every board and item request sends that token as "Authorization: Bearer …".

/** The signed-in user, or null. The session has no email, so it's left blank. */
export function getStoredUser(): User | null {
  const session = getSession();
  return session ? { id: session.id, name: session.name, email: '' } : null;
}

/** The JWT from /api/login, or null if the session doesn't have one. */
export function getToken(): string | null {
  return getSession()?.token || null;
}

/** Signs out: removes the login page's session (and with it the token). */
export function clearSession(): void {
  clearLoginSession();
}

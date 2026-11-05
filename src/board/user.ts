import type { User } from './types';

// Session used by the board.
//
// - The signed-in user ({ id, name, email } from /api/login) is kept in
//   localStorage under "user".
// - The board routes (/api/boards) use HTTP Basic auth, so every request has
//   to carry the user's email and password. That credential is kept only in
//   sessionStorage (cleared when the tab closes) under "postit.auth", as the
//   ready-made header value "Basic base64(email:password)".
//
// The login page can call saveSession(user, email, password) after a
// successful /api/login so the board works without asking again.
const USER_KEY = 'user';
const AUTH_KEY = 'postit.auth';

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<User>;
    if (typeof parsed.id === 'string' && typeof parsed.name === 'string') {
      return { id: parsed.id, name: parsed.name, email: parsed.email ?? '' };
    }
  } catch {
    /* storage unavailable or bad JSON */
  }
  return null;
}

/** "Basic …" header value for the board routes, or null if not signed in in this tab. */
export function getAuthHeader(): string | null {
  try {
    return sessionStorage.getItem(AUTH_KEY);
  } catch {
    return null;
  }
}

/** UTF-8 safe base64 (btoa alone fails on non-Latin-1 passwords). */
function base64(text: string): string {
  let bin = '';
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte);
  return btoa(bin);
}

export function saveSession(user: User, email: string, password: string): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(AUTH_KEY, `Basic ${base64(`${email.trim()}:${password}`)}`);
  } catch {
    /* ignore */
  }
}

/** Forgets the credential (e.g. after a 401) but keeps the remembered user. */
export function clearAuth(): void {
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
}

export function clearSession(): void {
  clearAuth();
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

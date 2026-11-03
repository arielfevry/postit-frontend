import type { User } from './types';

// The login API returns { user: { id, name, email } } and no token yet,
// so the signed-in user is kept in localStorage under "user".
const KEY = 'user';

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(KEY);
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

export function storeUser(user: User): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

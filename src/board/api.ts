import type { Board, AnyItem, NewItem, User } from './types';
import { getAuthHeader } from './user';

const BASE = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/** Thrown on 401 so the board can ask the user to sign in again. */
export class AuthError extends Error {}

// keepalive requests (used when the tab closes) are capped at 64KB by browsers
const KEEPALIVE_LIMIT = 60_000;

interface Options {
  method?: string;
  body?: unknown;
  /** send the Basic auth header (required by /api/boards) */
  auth?: boolean;
  keepalive?: boolean;
}

async function request<T>(path: string, { method = 'GET', body, auth = false, keepalive }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const payload = body === undefined ? undefined : JSON.stringify(body);
  if (payload !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const header = getAuthHeader();
    if (!header) throw new AuthError('Please sign in to open this board.');
    headers.Authorization = header;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: payload,
      keepalive: keepalive && (payload?.length ?? 0) < KEEPALIVE_LIMIT,
    });
  } catch {
    throw new Error('Could not reach the PostIt! server.');
  }

  // board routes answer DELETE with 204 and no body
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (res.status === 401 && auth) throw new AuthError('Your session has expired. Please sign in again.');
  if (res.status === 413) throw new Error('That is too large to save. Try a smaller image.');
  // board routes report problems as { error }, item routes as { message }
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User }>('/login', { method: 'POST', body: { email, password } }),

  register: (name: string, email: string, password: string) =>
    request<{ user: User }>('/register', { method: 'POST', body: { name, email, password } }),

  /* ----- boards: /api/boards (Basic auth) ----- */

  createBoard: (title: string) =>
    request<{ board: Board }>('/boards', { method: 'POST', body: { title }, auth: true }),

  getBoard: (boardId: string) => request<{ board: Board }>(`/boards/${boardId}`, { auth: true }),

  /** Owner only. */
  updateBoard: (boardId: string, patch: Partial<Pick<Board, 'title' | 'background_image'>>) =>
    request<{ board: Board }>(`/boards/${boardId}`, { method: 'PATCH', body: patch, auth: true }),

  /** Owner only. The server refuses (409) while the board still has items. */
  deleteBoard: (boardId: string) => request<void>(`/boards/${boardId}`, { method: 'DELETE', auth: true }),

  /* ----- items: /api/items ----- */

  getItems: (boardId: string) =>
    request<{ items: AnyItem[] }>(`/items?boardId=${encodeURIComponent(boardId)}`),

  createItem: (boardId: string, userId: string, item: NewItem) =>
    request<{ item: AnyItem }>('/items', { method: 'POST', body: { boardId, userId, ...item } }),

  /** PUT replaces the item's whole content, so always send the full object. */
  updateItem: (itemId: string, content: AnyItem['content'], keepalive = false) =>
    request<{ item: AnyItem }>(`/items/${itemId}`, { method: 'PUT', body: { content }, keepalive }),

  deleteItem: (itemId: string) => request<{ item: AnyItem }>(`/items/${itemId}`, { method: 'DELETE' }),
};

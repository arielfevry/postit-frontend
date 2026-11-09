import type { Board, AnyItem, NewItem } from './types';
import { getToken } from './user';

const BASE = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/** Thrown when there's no token or the API answers 401, so the board can send the user to log in. */
export class AuthError extends Error {}

// keepalive requests (used when the tab closes) are capped at 64KB by browsers
const KEEPALIVE_LIMIT = 60_000;

interface Options {
  method?: string;
  body?: unknown;
  keepalive?: boolean;
}

// Every board and item route requires the JWT from /api/login as a Bearer token.
async function request<T>(path: string, { method = 'GET', body, keepalive }: Options = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new AuthError('Please log in to open this board.');

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const payload = body === undefined ? undefined : JSON.stringify(body);
  if (payload !== undefined) headers['Content-Type'] = 'application/json';

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
  // missing, invalid or expired token
  if (res.status === 401) throw new AuthError('Your session has expired. Please log in again.');
  if (res.status === 413) throw new Error('That is too large to save. Try a smaller image.');
  // board routes report problems as { error }, item routes as { message }
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  /* ----- boards: /api/boards ----- */

  createBoard: (title: string) => request<{ board: Board }>('/boards', { method: 'POST', body: { title } }),

  getBoard: (boardId: string) => request<{ board: Board }>(`/boards/${boardId}`),

  /** Owner only. */
  updateBoard: (boardId: string, patch: Partial<Pick<Board, 'title' | 'background_image'>>) =>
    request<{ board: Board }>(`/boards/${boardId}`, { method: 'PATCH', body: patch }),

  /** Owner only. The server refuses (409) while the board still has items. */
  deleteBoard: (boardId: string) => request<void>(`/boards/${boardId}`, { method: 'DELETE' }),

  /* ----- items: /api/items (the server takes the user from the token) ----- */

  getItems: (boardId: string) => request<{ items: AnyItem[] }>(`/items?boardId=${encodeURIComponent(boardId)}`),

  createItem: (boardId: string, item: NewItem) =>
    request<{ item: AnyItem }>('/items', { method: 'POST', body: { boardId, ...item } }),

  /** PUT replaces the item's whole content, so always send the full object. */
  updateItem: (itemId: string, content: AnyItem['content'], keepalive = false) =>
    request<{ item: AnyItem }>(`/items/${itemId}`, { method: 'PUT', body: { content }, keepalive }),

  deleteItem: (itemId: string) => request<{ item: AnyItem }>(`/items/${itemId}`, { method: 'DELETE' }),
};

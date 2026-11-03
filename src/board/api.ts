import type { Board, AnyItem, ContentPatch, NewItem, User } from './types';

const BASE = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch {
    throw new Error('Could not reach the PostIt! server. Is the backend running?');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User }>('/login', { method: 'POST', body: json({ email, password }) }),

  register: (name: string, email: string, password: string) =>
    request<{ user: User }>('/register', { method: 'POST', body: json({ name, email, password }) }),

  createBoard: (title: string, userId: string) =>
    request<{ board: Board }>('/boards', { method: 'POST', body: json({ title, userId }) }),

  getBoard: (boardId: string) => request<{ board: Board }>(`/boards/${boardId}`),

  updateBoard: (boardId: string, patch: Partial<Pick<Board, 'title' | 'background_image'>>) =>
    request<{ board: Board }>(`/boards/${boardId}`, { method: 'PATCH', body: json(patch) }),

  deleteBoard: (boardId: string) =>
    request<{ message: string }>(`/boards/${boardId}`, { method: 'DELETE' }),

  getItems: (boardId: string) => request<{ items: AnyItem[] }>(`/boards/${boardId}/items`),

  createItem: (boardId: string, userId: string, item: NewItem) =>
    request<{ item: AnyItem }>(`/boards/${boardId}/items`, {
      method: 'POST',
      body: json({ ...item, userId }),
    }),

  /** Sends only the changed content fields; the server merges them. */
  updateItem: (itemId: string, content: ContentPatch, keepalive = false) =>
    request<{ item: AnyItem }>(`/items/${itemId}`, {
      method: 'PATCH',
      body: json({ content }),
      keepalive,
    }),

  deleteItem: (itemId: string) => request<{ message: string }>(`/items/${itemId}`, { method: 'DELETE' }),
};

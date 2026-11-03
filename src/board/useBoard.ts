import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import type { AnyItem, Board, ContentPatch, NewItem, User } from './types';
import { isCanvasItem, isReminder } from './types';

const SAVE_DELAY = 450;

export type LoadState = 'loading' | 'ready' | 'error' | 'deleted';

/**
 * Loads one board and its items and keeps them in sync with the API.
 * Edits update local state straight away; content changes are batched per item
 * and only the changed fields are PATCHed after a short pause.
 */
export function useBoard(boardId: string, user: User) {
  const [board, setBoard] = useState<Board | null>(null);
  const [items, setItems] = useState<AnyItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState(0);

  const pending = useRef(new Map<string, ContentPatch>());
  const timers = useRef(new Map<string, number>());

  /* ---------- load ---------- */
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getBoard(boardId), api.getItems(boardId)])
      .then(([b, i]) => {
        if (cancelled) return;
        setBoard(b.board);
        setItems(i.items);
        setLoadState('ready');
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  const track = useCallback(async <T,>(p: Promise<T>): Promise<T> => {
    setInFlight((n) => n + 1);
    try {
      return await p;
    } finally {
      setInFlight((n) => n - 1);
    }
  }, []);

  /* ---------- saving ---------- */
  const flushItem = useCallback(
    (id: string, keepalive = false) => {
      const t = timers.current.get(id);
      if (t) window.clearTimeout(t);
      timers.current.delete(id);
      const patch = pending.current.get(id);
      pending.current.delete(id);
      if (!patch || id.startsWith('tmp-')) return;
      track(api.updateItem(id, patch, keepalive)).catch((e: Error) => setError(`Couldn't save: ${e.message}`));
    },
    [track],
  );

  // Send anything unsaved when the tab closes or the board unmounts.
  useEffect(() => {
    const timerMap = timers.current;
    const flushAll = () => {
      for (const id of [...timerMap.keys()]) flushItem(id, true);
    };
    window.addEventListener('pagehide', flushAll);
    return () => {
      window.removeEventListener('pagehide', flushAll);
      flushAll();
    };
  }, [flushItem]);

  /* ---------- items ---------- */
  const updateItem = useCallback(
    (id: string, patch: ContentPatch) => {
      setItems((prev) =>
        prev.map((it) => (it._id === id ? ({ ...it, content: { ...it.content, ...patch } } as AnyItem) : it)),
      );
      pending.current.set(id, { ...pending.current.get(id), ...patch });
      const t = timers.current.get(id);
      if (t) window.clearTimeout(t);
      timers.current.set(
        id,
        window.setTimeout(() => flushItem(id), SAVE_DELAY),
      );
    },
    [flushItem],
  );

  const addItem = useCallback(
    async (newItem: NewItem): Promise<AnyItem | null> => {
      try {
        const { item } = await track(api.createItem(boardId, user.id, newItem));
        setItems((prev) => [...prev, item]);
        return item;
      } catch (e) {
        setError(`Couldn't add that: ${(e as Error).message}`);
        return null;
      }
    },
    [boardId, user.id, track],
  );

  const removeItem = useCallback(
    async (id: string) => {
      const t = timers.current.get(id);
      if (t) window.clearTimeout(t);
      timers.current.delete(id);
      pending.current.delete(id);
      let removed: AnyItem | undefined;
      setItems((prev) => {
        removed = prev.find((it) => it._id === id);
        return prev.filter((it) => it._id !== id);
      });
      try {
        await track(api.deleteItem(id));
      } catch (e) {
        setError(`Couldn't delete: ${(e as Error).message}`);
        if (removed) {
          const restore = removed;
          setItems((prev) => [...prev, restore]);
        }
      }
    },
    [track],
  );

  /* ---------- board ---------- */
  const updateBoard = useCallback(
    async (patch: Partial<Pick<Board, 'title' | 'background_image'>>) => {
      setBoard((b) => (b ? { ...b, ...patch } : b));
      try {
        const { board: saved } = await track(api.updateBoard(boardId, patch));
        setBoard(saved);
      } catch (e) {
        setError(`Couldn't update the board: ${(e as Error).message}`);
      }
    },
    [boardId, track],
  );

  const deleteBoard = useCallback(async () => {
    for (const t of timers.current.values()) window.clearTimeout(t);
    timers.current.clear();
    pending.current.clear();
    await track(api.deleteBoard(boardId));
    setLoadState('deleted');
  }, [boardId, track]);

  const canvasItems = useMemo(() => items.filter(isCanvasItem), [items]);
  const reminders = useMemo(() => items.filter(isReminder), [items]);
  const maxZ = useMemo(() => canvasItems.reduce((m, it) => Math.max(m, it.content.z || 0), 0), [canvasItems]);

  return {
    board,
    canvasItems,
    reminders,
    maxZ,
    loadState,
    error,
    clearError: () => setError(null),
    reportError: setError,
    saving: inFlight > 0,
    addItem,
    updateItem,
    removeItem,
    updateBoard,
    deleteBoard,
  };
}

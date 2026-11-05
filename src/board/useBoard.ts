import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, AuthError } from './api';
import type { AnyItem, Board, ContentPatch, NewItem, User } from './types';
import { isCanvasItem, isReminder } from './types';

const SAVE_DELAY = 450;

export type LoadState = 'loading' | 'ready' | 'error' | 'deleted';

/**
 * Loads one board (GET /api/boards/:id) and its items (GET /api/items?boardId=)
 * and keeps them in sync with the API.
 *
 * Edits update local state straight away. Because PUT /api/items/:id replaces
 * the whole content, changes to an item are batched for a short pause and
 * then its full current content is sent. Saves for the same item run one at
 * a time so an older save can never land after a newer one.
 */
export function useBoard(boardId: string, user: User, onAuthError: () => void) {
  const [board, setBoard] = useState<Board | null>(null);
  const [items, setItems] = useState<AnyItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState(0);

  const itemsRef = useRef(items);
  const dirty = useRef(new Set<string>());
  const timers = useRef(new Map<string, number>());
  const saveChains = useRef(new Map<string, Promise<unknown>>());
  const onAuthErrorRef = useRef(onAuthError);

  useEffect(() => {
    itemsRef.current = items;
    onAuthErrorRef.current = onAuthError;
  });

  /** Routes auth failures to the sign-in screen; everything else to the error toast. */
  const fail = useCallback((prefix: string, e: unknown) => {
    if (e instanceof AuthError) onAuthErrorRef.current();
    else setError(`${prefix}${(e as Error).message}`);
  }, []);

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
        if (e instanceof AuthError) return onAuthErrorRef.current();
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
      if (!dirty.current.delete(id)) return;

      const save = async () => {
        // read the content when this save actually starts, so it's the newest
        const item = itemsRef.current.find((it) => it._id === id);
        if (!item) return; // deleted in the meantime
        await track(api.updateItem(id, item.content, keepalive));
      };
      const chain = (saveChains.current.get(id) ?? Promise.resolve())
        .then(save)
        .catch((e) => fail('Couldn’t save: ', e));
      saveChains.current.set(id, chain);
      chain.finally(() => {
        if (saveChains.current.get(id) === chain) saveChains.current.delete(id);
      });
    },
    [track, fail],
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
      dirty.current.add(id);
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
        fail('Couldn’t add that: ', e);
        return null;
      }
    },
    [boardId, user.id, track, fail],
  );

  const removeItem = useCallback(
    async (id: string) => {
      const t = timers.current.get(id);
      if (t) window.clearTimeout(t);
      timers.current.delete(id);
      dirty.current.delete(id);
      const removed = itemsRef.current.find((it) => it._id === id);
      setItems((prev) => prev.filter((it) => it._id !== id));
      try {
        await saveChains.current.get(id); // let an in-progress save finish first
        await track(api.deleteItem(id));
      } catch (e) {
        fail('Couldn’t delete: ', e);
        if (removed) setItems((prev) => [...prev, removed]);
      }
    },
    [track, fail],
  );

  /* ---------- board ---------- */
  const updateBoard = useCallback(
    async (patch: Partial<Pick<Board, 'title' | 'background_image'>>) => {
      const previous = board;
      setBoard((b) => (b ? { ...b, ...patch } : b));
      try {
        const { board: saved } = await track(api.updateBoard(boardId, patch));
        setBoard(saved);
      } catch (e) {
        if (previous) setBoard(previous);
        fail('Couldn’t update the board: ', e);
      }
    },
    [board, boardId, track, fail],
  );

  /**
   * The API only deletes an empty board, so every item (notes, media,
   * stickers and reminders) is deleted first, then the board itself.
   * Throws so the settings dialog can show what went wrong.
   */
  const deleteBoard = useCallback(async () => {
    for (const t of timers.current.values()) window.clearTimeout(t);
    timers.current.clear();
    dirty.current.clear();
    await Promise.allSettled(saveChains.current.values());

    try {
      const { items: remaining } = await track(api.getItems(boardId));
      for (let i = 0; i < remaining.length; i += 6) {
        const batch = remaining.slice(i, i + 6);
        await Promise.all(
          batch.map((it) =>
            track(api.deleteItem(it._id)).catch((e: Error) => {
              if (!/not found/i.test(e.message)) throw e; // already gone is fine
            }),
          ),
        );
        const gone = new Set(batch.map((it) => it._id));
        setItems((prev) => prev.filter((it) => !gone.has(it._id)));
      }
      await track(api.deleteBoard(boardId));
    } catch (e) {
      if (e instanceof AuthError) onAuthErrorRef.current();
      throw e;
    }
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

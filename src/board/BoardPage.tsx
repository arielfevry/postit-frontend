import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { useBoard } from './useBoard';
import { clearStoredUser, getStoredUser } from './user';
import type { CanvasItem, ContentPatch, NewItem, NoteVariant, User, Viewport } from './types';
import {
  fetchYouTubeTitle,
  fileToDataUrl,
  fitSize,
  isTypingTarget,
  looksLikeImageUrl,
  measureImage,
  parseYouTubeId,
} from './utils';
import Canvas from './components/Canvas';
import type { CanvasHandle } from './components/Canvas';
import Toolbar, { NOTE_COLORS, STICKERS } from './components/Toolbar';
import RemindersPanel from './components/RemindersPanel';
import TopBar from './components/TopBar';
import SettingsModal from './components/SettingsModal';
import AddMediaModal from './components/AddMediaModal';
import SignInGate from './components/SignInGate';
import 'bootstrap/dist/css/bootstrap.min.css';
import './board.css';

export interface BoardPageProps {
  /** Board to open. If omitted, it's read from a /board/:id URL; with no id a new board is created. */
  boardId?: string;
  /** Called by the home button and after the board is deleted. Defaults to navigating to "/". */
  onHome?: () => void;
}

const goHomeDefault = () => window.location.assign('/');

function boardIdFromPath(): string | null {
  const m = window.location.pathname.match(/^\/board\/([a-f\d]{24})\/?$/i);
  return m ? m[1] : null;
}

/* ================================================================== */
/*  Entry: makes sure there's a user and a board id, then shows it    */
/* ================================================================== */

export default function BoardPage({ boardId: boardIdProp, onHome = goHomeDefault }: BoardPageProps) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [boardId, setBoardId] = useState<string | null>(boardIdProp ?? boardIdFromPath());
  const [createError, setCreateError] = useState<string | null>(null);
  const creating = useRef(false);

  useEffect(() => {
    if (boardIdProp) setBoardId(boardIdProp);
  }, [boardIdProp]);

  // No id in the URL: create a fresh board (handy until the dashboard links here).
  useEffect(() => {
    if (!user || boardId || creating.current) return;
    creating.current = true;
    api
      .createBoard('Untitled board', user.id)
      .then(({ board }) => {
        window.history.replaceState(null, '', `/board/${board._id}`);
        setBoardId(board._id);
      })
      .catch((e: Error) => setCreateError(e.message))
      .finally(() => {
        creating.current = false;
      });
  }, [user, boardId]);

  if (!user) return <SignInGate onSignedIn={setUser} />;
  if (createError) return <BoardMessage title="Couldn’t create a board" detail={createError} onHome={onHome} />;
  if (!boardId) return <BoardMessage title="Setting up your board…" spinner />;

  return (
    <BoardView
      key={boardId}
      boardId={boardId}
      user={user}
      onHome={onHome}
      onSignOut={() => {
        clearStoredUser();
        setUser(null);
      }}
    />
  );
}

function BoardMessage({
  title,
  detail,
  spinner,
  onHome,
}: {
  title: string;
  detail?: string;
  spinner?: boolean;
  onHome?: () => void;
}) {
  return (
    <div className="pb-app pb-message">
      <div className="pb-card pb-message__card">
        {spinner && <div className="spinner-border spinner-border-sm mb-3" role="status" aria-hidden="true" />}
        <h1 className="fs-6 fw-semibold mb-1">{title}</h1>
        {detail && <p className="small text-body-secondary mb-3">{detail}</p>}
        {onHome && (
          <div className="d-flex gap-2 justify-content-center">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => window.location.reload()}>
              Try again
            </button>
            <button type="button" className="btn btn-dark btn-sm" onClick={onHome}>
              Go home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  The board itself                                                   */
/* ================================================================== */

type ModalKind = 'settings' | 'image' | 'video' | null;

const vpKey = (id: string) => `postit:viewport:${id}`;

function loadViewport(boardId: string): Viewport | null {
  try {
    const raw = localStorage.getItem(vpKey(boardId));
    if (!raw) return null;
    const v = JSON.parse(raw) as Viewport;
    return Number.isFinite(v.x) && Number.isFinite(v.y) && v.zoom > 0 ? v : null;
  } catch {
    return null;
  }
}

const jitter = (n: number) => Math.round((Math.random() - 0.5) * n);

interface ViewProps {
  boardId: string;
  user: User;
  onHome: () => void;
  onSignOut: () => void;
}

function BoardView({ boardId, user, onHome, onSignOut }: ViewProps) {
  const b = useBoard(boardId, user);
  const { board, canvasItems, reminders, maxZ } = b;

  const savedViewport = useRef(loadViewport(boardId));
  const [viewport, setViewport] = useState<Viewport>(savedViewport.current ?? { x: 120, y: 80, zoom: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);

  const selected = canvasItems.find((i) => i._id === selectedId) ?? null;

  // First visit to a board with content: fit it in view.
  const didFit = useRef(false);
  useEffect(() => {
    if (b.loadState !== 'ready' || didFit.current) return;
    didFit.current = true;
    if (!savedViewport.current && canvasItems.length) canvasRef.current?.fit();
  }, [b.loadState, canvasItems.length]);

  // Remember where this viewer was looking on this board.
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(vpKey(boardId), JSON.stringify(viewport));
      } catch {
        /* ignore */
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [boardId, viewport]);

  // Leave the board once it has been deleted.
  useEffect(() => {
    if (b.loadState !== 'deleted') return;
    try {
      localStorage.removeItem(vpKey(boardId));
    } catch {
      /* ignore */
    }
    onHome();
  }, [b.loadState, boardId, onHome]);

  /* ---------- creating ---------- */

  /** Top-left for a new w×h element: centred on `at` or on the visible area. */
  const placeAt = useCallback((w: number, h: number, at?: { x: number; y: number }) => {
    const c = at ?? canvasRef.current?.center() ?? { x: 0, y: 0 };
    const spread = at ? 0 : 160;
    return { x: Math.round(c.x - w / 2 + jitter(spread)), y: Math.round(c.y - h / 2 + jitter(spread)) };
  }, []);

  const create = useCallback(
    async (item: NewItem, opts: { edit?: boolean } = {}) => {
      const created = await b.addItem(item);
      if (created && created.type !== 'checklist') {
        setSelectedId(created._id);
        if (opts.edit) setEditingId(created._id);
      }
      return created;
    },
    [b],
  );

  const addNote = useCallback(
    (variant: NoteVariant, at?: { x: number; y: number }, text = '') => {
      const w = variant === 'sticky' ? 200 : 240;
      const h = variant === 'sticky' ? 200 : 260;
      return create(
        {
          type: 'text',
          content: {
            ...placeAt(w, h, at),
            w,
            h,
            rotation: jitter(4),
            z: maxZ + 1,
            variant,
            color: NOTE_COLORS[0],
            text,
          },
        },
        { edit: !text },
      );
    },
    [create, placeAt, maxZ],
  );

  const addImage = useCallback(
    async (src: string, width: number, height: number, caption = '', at?: { x: number; y: number }) => {
      const { w, h } = fitSize(width, height, 300);
      const frameH = h + (caption ? 34 : 0) + 20; // photo border + caption strip
      await create({
        type: 'image',
        content: { ...placeAt(w + 20, frameH, at), w: w + 20, h: frameH, rotation: jitter(5), z: maxZ + 1, src, caption },
      });
    },
    [create, placeAt, maxZ],
  );

  const addImageFromUrl = useCallback(
    async (url: string, caption = '', at?: { x: number; y: number }) => {
      const size = await measureImage(url);
      if (!size) throw new Error('That image couldn’t be loaded. Check the link points straight to an image.');
      await addImage(url, size.width, size.height, caption, at);
    },
    [addImage],
  );

  const addImageFromFile = useCallback(
    async (file: File, caption = '', at?: { x: number; y: number }) => {
      const { src, width, height } = await fileToDataUrl(file);
      await addImage(src, width, height, caption, at);
    },
    [addImage],
  );

  const addVideo = useCallback(
    async (url: string, at?: { x: number; y: number }) => {
      const videoId = parseYouTubeId(url);
      if (!videoId) throw new Error('That doesn’t look like a YouTube video link.');
      const w = 340;
      const h = 262;
      const created = await create({
        type: 'link',
        content: { ...placeAt(w, h, at), w, h, rotation: 0, z: maxZ + 1, url, videoId, title: '' },
      });
      if (created) {
        const title = await fetchYouTubeTitle(videoId);
        if (title) b.updateItem(created._id, { title });
      }
    },
    [b, create, placeAt, maxZ],
  );

  const addSticker = useCallback(
    (emoji: string, at?: { x: number; y: number }) =>
      create({
        type: 'sticker',
        content: { ...placeAt(110, 110, at), w: 110, h: 110, rotation: jitter(16), z: maxZ + 1, emoji },
      }),
    [create, placeAt, maxZ],
  );

  /* ---------- editing ---------- */

  const change = b.updateItem;

  const bringToFront = useCallback(
    (id: string) => {
      const it = canvasItems.find((i) => i._id === id);
      if (it && it.content.z < maxZ) change(id, { z: maxZ + 1 });
      else if (it && canvasItems.filter((i) => i.content.z === maxZ).length > 1) change(id, { z: maxZ + 1 });
    },
    [canvasItems, maxZ, change],
  );

  const sendToBack = useCallback(
    (id: string) => {
      const minZ = canvasItems.reduce((m, i) => Math.min(m, i.content.z), Infinity);
      change(id, { z: Math.min(0, minZ) - 1 });
    },
    [canvasItems, change],
  );

  const duplicate = useCallback(
    (item: CanvasItem) => {
      const content = { ...item.content, x: item.content.x + 28, y: item.content.y + 28, z: maxZ + 1 };
      create({ type: item.type, content } as NewItem);
    },
    [create, maxZ],
  );

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    b.removeItem(selectedId);
    setSelectedId(null);
    setEditingId(null);
  }, [b, selectedId]);

  const handleChange = useCallback((id: string, patch: ContentPatch) => change(id, patch), [change]);

  /* ---------- keyboard shortcuts ---------- */
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyHandler.current = (e: KeyboardEvent) => {
      if (modal || isTypingTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        removeSelected();
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      } else if (mod && key === 'd' && selected) {
        e.preventDefault();
        duplicate(selected);
      } else if (e.key === 'Enter' && selected?.type === 'text') {
        e.preventDefault();
        setEditingId(selected._id);
      } else if (selected && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        change(selected._id, { x: selected.content.x + dx, y: selected.content.y + dy });
      } else if (e.key === ']' && selected) bringToFront(selected._id);
      else if (e.key === '[' && selected) sendToBack(selected._id);
      else if (e.key === '!' || (e.shiftKey && e.code === 'Digit1')) canvasRef.current?.fit();
      else if (!mod && !e.altKey) {
        if (key === 'n') addNote('sticky');
        else if (key === 'p') addNote('paper');
        else if (key === 'i') setModal('image');
        else if (key === 'y') setModal('video');
        else if (key === 's') addSticker(STICKERS[Math.floor(Math.random() * STICKERS.length)]);
        else if (key === '=' || key === '+') canvasRef.current?.zoomBy(1.2);
        else if (key === '-') canvasRef.current?.zoomBy(1 / 1.2);
      }
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------- paste images / links / text onto the board ---------- */
  const pasteHandler = useRef<(e: ClipboardEvent) => void>(() => {});
  useEffect(() => {
    pasteHandler.current = (e: ClipboardEvent) => {
      if (modal || isTypingTarget(e.target) || b.loadState !== 'ready') return;
      const data = e.clipboardData;
      if (!data) return;
      const file = [...data.files].find((f) => f.type.startsWith('image/'));
      const text = data.getData('text/plain').trim();
      const report = (err: Error) => b.reportError(err.message);
      if (file) {
        e.preventDefault();
        addImageFromFile(file).catch(report);
      } else if (text) {
        e.preventDefault();
        if (parseYouTubeId(text) && /youtu/.test(text)) addVideo(text).catch(report);
        else if (looksLikeImageUrl(text)) addImageFromUrl(text).catch(report);
        else addNote('sticky', undefined, text.slice(0, 2000));
      }
    };
  });
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => pasteHandler.current(e);
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  /* ---------- render ---------- */

  if (b.loadState === 'loading') return <BoardMessage title="Loading board…" spinner />;
  if (b.loadState === 'error' || !board)
    return <BoardMessage title="Couldn’t open this board" detail={b.error ?? undefined} onHome={onHome} />;

  const openReminders = reminders.filter((r) => !r.content.done).length;

  return (
    <div className="pb-app pb-board">
      <TopBar
        user={user}
        title={board.title}
        saving={b.saving}
        openReminders={openReminders}
        onHome={onHome}
        onSettings={() => setModal('settings')}
        onRename={(title) => b.updateBoard({ title })}
        onToggleReminders={() => setRemindersOpen((o) => !o)}
        onSignOut={onSignOut}
      />

      <Toolbar
        selected={selected}
        zoom={viewport.zoom}
        onAddNote={(v) => addNote(v)}
        onAddImage={() => setModal('image')}
        onAddVideo={() => setModal('video')}
        onAddSticker={(s) => addSticker(s)}
        onColor={(color) => selected && change(selected._id, { color })}
        onFront={() => selected && bringToFront(selected._id)}
        onBack={() => selected && sendToBack(selected._id)}
        onDuplicate={() => selected && duplicate(selected)}
        onStraighten={() => selected && change(selected._id, { rotation: 0 })}
        onDelete={removeSelected}
        onZoomIn={() => canvasRef.current?.zoomBy(1.2)}
        onZoomOut={() => canvasRef.current?.zoomBy(1 / 1.2)}
        onFit={() => canvasRef.current?.fit()}
      />

      <main className="pb-stage">
        <Canvas
          ref={canvasRef}
          items={canvasItems}
          background={board.background_image}
          viewport={viewport}
          onViewport={setViewport}
          selectedId={selectedId}
          editingId={editingId}
          onSelect={(id) => {
            setSelectedId(id);
            if (id !== editingId) setEditingId(null);
          }}
          onChange={handleChange}
          onStartEdit={(id) => {
            setSelectedId(id);
            setEditingId(id);
          }}
          onStopEdit={() => setEditingId(null)}
          onBringToFront={bringToFront}
          onCreateNoteAt={(p) => addNote('sticky', p)}
          onDropFiles={(files, p) =>
            files.forEach((f, i) =>
              addImageFromFile(f, '', { x: p.x + i * 30, y: p.y + i * 30 }).catch((e: Error) => b.reportError(e.message)),
            )
          }
        />
        {b.error && (
          <div className="pb-toast alert alert-danger alert-dismissible py-2 mb-0" role="alert">
            <span className="small">{b.error}</span>
            <button type="button" className="btn-close" aria-label="Dismiss" onClick={b.clearError} />
          </div>
        )}
      </main>

      <RemindersPanel
        className={remindersOpen ? 'is-open' : ''}
        reminders={reminders}
        onAdd={(text, due) => b.addItem({ type: 'checklist', content: { text, done: false, due } })}
        onUpdate={change}
        onDelete={(id) => b.removeItem(id)}
      />
      {remindersOpen && <div className="pb-scrim d-xl-none" onClick={() => setRemindersOpen(false)} />}

      {modal === 'settings' && (
        <SettingsModal
          board={board}
          itemCount={canvasItems.length + reminders.length}
          onClose={() => setModal(null)}
          onSave={(patch) => b.updateBoard(patch)}
          onDelete={b.deleteBoard}
        />
      )}
      {modal === 'image' && (
        <AddMediaModal
          kind="image"
          onClose={() => setModal(null)}
          onSubmitUrl={(url, caption) => addImageFromUrl(url, caption)}
          onSubmitFile={(file, caption) => addImageFromFile(file, caption)}
        />
      )}
      {modal === 'video' && (
        <AddMediaModal kind="video" onClose={() => setModal(null)} onSubmitUrl={(url) => addVideo(url)} />
      )}
    </div>
  );
}

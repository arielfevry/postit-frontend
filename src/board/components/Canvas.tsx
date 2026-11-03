import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CSSProperties, DragEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { CanvasItem, ContentPatch, Viewport } from '../types';
import { backgroundClass, clamp } from '../utils';
import CanvasElement from './CanvasElement';

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3;

export interface CanvasHandle {
  /** Board coordinates at the centre of what's currently visible. */
  center: () => { x: number; y: number };
  zoomBy: (factor: number) => void;
  /** Zoom and pan so every item is in view. */
  fit: () => void;
}

interface Props {
  items: CanvasItem[];
  background: string;
  viewport: Viewport;
  onViewport: (vp: Viewport) => void;
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: ContentPatch) => void;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
  onBringToFront: (id: string) => void;
  onCreateNoteAt: (point: { x: number; y: number }) => void;
  onDropFiles: (files: File[], point: { x: number; y: number }) => void;
}

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(props, ref) {
  const { items, background, viewport, onViewport, selectedId, editingId } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  // Keep the latest viewport available to the native wheel listener.
  const vpRef = useRef(viewport);
  const onViewportRef = useRef(onViewport);
  useEffect(() => {
    vpRef.current = viewport;
    onViewportRef.current = onViewport;
  });

  const toBoard = (clientX: number, clientY: number) => {
    const r = rootRef.current?.getBoundingClientRect();
    const vp = vpRef.current;
    return {
      x: (clientX - (r?.left ?? 0) - vp.x) / vp.zoom,
      y: (clientY - (r?.top ?? 0) - vp.y) / vp.zoom,
    };
  };

  const zoomAround = (factor: number, sx: number, sy: number) => {
    const vp = vpRef.current;
    const zoom = clamp(vp.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const k = zoom / vp.zoom;
    onViewportRef.current({ zoom, x: sx - (sx - vp.x) * k, y: sy - (sy - vp.y) * k });
  };

  useImperativeHandle(ref, () => ({
    center: () => {
      const r = rootRef.current!.getBoundingClientRect();
      return toBoard(r.left + r.width / 2, r.top + r.height / 2);
    },
    zoomBy: (factor) => {
      const r = rootRef.current!.getBoundingClientRect();
      zoomAround(factor, r.width / 2, r.height / 2);
    },
    fit: () => {
      const r = rootRef.current!.getBoundingClientRect();
      if (!items.length) {
        onViewportRef.current({ x: r.width / 2, y: r.height / 2, zoom: 1 });
        return;
      }
      const minX = Math.min(...items.map((i) => i.content.x));
      const minY = Math.min(...items.map((i) => i.content.y));
      const maxX = Math.max(...items.map((i) => i.content.x + i.content.w));
      const maxY = Math.max(...items.map((i) => i.content.y + i.content.h));
      const pad = 60;
      const zoom = clamp(
        Math.min((r.width - pad * 2) / (maxX - minX), (r.height - pad * 2) / (maxY - minY)),
        MIN_ZOOM,
        1.25,
      );
      onViewportRef.current({
        zoom,
        x: r.width / 2 - ((minX + maxX) / 2) * zoom,
        y: r.height / 2 - ((minY + maxY) / 2) * zoom,
      });
    },
  }));

  // Wheel: scroll pans, Ctrl/Cmd + wheel (and trackpad pinch) zooms.
  // Registered natively because React's wheel listener is passive.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLTextAreaElement && !e.ctrlKey) return; // let notes scroll
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        zoomAround(Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top);
      } else {
        const vp = vpRef.current;
        const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
        const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
        onViewportRef.current({ ...vp, x: vp.x - dx, y: vp.y - dy });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* ---------- pan by dragging empty space (or middle-click anywhere) ---------- */
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const onEmpty = e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('pb-world');
    if (e.button === 1 || (e.button === 0 && onEmpty)) {
      e.preventDefault();
      if (e.button === 0) {
        props.onSelect(null);
        if (editingId) props.onStopEdit();
      }
      pan.current = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.classList.add('is-panning');
    }
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const p = pan.current;
    if (!p) return;
    onViewport({ ...viewport, x: p.vx + e.clientX - p.x, y: p.vy + e.clientY - p.y });
  };
  const endPan = (e: ReactPointerEvent<HTMLDivElement>) => {
    pan.current = null;
    e.currentTarget.classList.remove('is-panning');
  };

  const onDoubleClick = (e: ReactMouseEvent) => {
    const onEmpty = e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('pb-world');
    if (onEmpty) props.onCreateNoteAt(toBoard(e.clientX, e.clientY));
  };

  const onDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) e.preventDefault();
  };
  const onDrop = (e: DragEvent) => {
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    props.onDropFiles(files, toBoard(e.clientX, e.clientY));
  };

  const isPreset = !background || background.startsWith('preset:');
  const surfaceStyle = {
    '--pb-zoom': viewport.zoom,
    '--pb-bg-x': `${viewport.x}px`,
    '--pb-bg-y': `${viewport.y}px`,
    ...(isPreset ? {} : { backgroundImage: `url("${background.replace(/"/g, '%22')}")` }),
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={`pb-surface ${backgroundClass(background)}`}
      style={surfaceStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onDoubleClick={onDoubleClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      role="application"
      aria-label="Board canvas"
    >
      <div
        className="pb-world"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
      >
        {items.map((item) => (
          <CanvasElement
            key={item._id}
            item={item}
            zoom={viewport.zoom}
            selected={selectedId === item._id}
            editing={editingId === item._id}
            onSelect={props.onSelect}
            onChange={props.onChange}
            onStartEdit={props.onStartEdit}
            onStopEdit={props.onStopEdit}
            onBringToFront={props.onBringToFront}
          />
        ))}
      </div>
      {items.length === 0 && (
        <div className="pb-empty">
          <p className="mb-1 fw-semibold">This board is empty</p>
          <p className="mb-0 small">
            Use the toolbar on the left, double-click to drop a sticky note, or paste an image or YouTube link.
          </p>
        </div>
      )}
    </div>
  );
});

export default Canvas;

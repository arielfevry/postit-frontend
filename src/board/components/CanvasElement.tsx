import { useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { CanvasItem, ContentPatch, Frame } from '../types';
import { HANDLES, normaliseAngle, resizeFrame } from '../utils';
import type { Handle } from '../utils';
import NoteBody from './items/NoteBody';
import ImageBody from './items/ImageBody';
import VideoBody from './items/VideoBody';
import StickerBody from './items/StickerBody';

interface Props {
  item: CanvasItem;
  zoom: number;
  selected: boolean;
  editing: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: ContentPatch) => void;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
  onBringToFront: (id: string) => void;
}

type Gesture =
  | { kind: 'move'; startX: number; startY: number; frame: Frame; moved: boolean }
  | { kind: 'resize'; handle: Handle; startX: number; startY: number; frame: Frame }
  | { kind: 'rotate'; cx: number; cy: number; startAngle: number; frame: Frame };

const DRAG_THRESHOLD = 3;

// Images and stickers keep their proportions by default; Shift flips that.
const KEEPS_ASPECT: Record<CanvasItem['type'], boolean> = {
  text: false,
  image: true,
  link: false,
  sticker: true,
};

const MIN_SIZE: Record<CanvasItem['type'], number> = { text: 80, image: 40, link: 200, sticker: 32 };

function setInteracting(on: boolean) {
  document.body.classList.toggle('pb-interacting', on);
}

export default function CanvasElement({
  item,
  zoom,
  selected,
  editing,
  onSelect,
  onChange,
  onStartEdit,
  onStopEdit,
  onBringToFront,
}: Props) {
  const gesture = useRef<Gesture | null>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const { x, y, w, h, rotation, z } = item.content;

  const frameOf = (): Frame => ({ x, y, w, h, rotation, z });

  const capture = (e: ReactPointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setInteracting(true);
  };

  /* ---------- move ---------- */
  const onBodyPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || editing) return; // middle-click falls through to pan the canvas
    e.stopPropagation();
    onSelect(item._id);
    gesture.current = { kind: 'move', startX: e.clientX, startY: e.clientY, frame: frameOf(), moved: false };
    capture(e);
  };

  /* ---------- resize ---------- */
  const onHandlePointerDown = (handle: Handle) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    gesture.current = { kind: 'resize', handle, startX: e.clientX, startY: e.clientY, frame: frameOf() };
    capture(e);
  };

  /* ---------- rotate ---------- */
  const onRotatePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !elRef.current) return;
    e.stopPropagation();
    const r = elRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const startAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    gesture.current = { kind: 'rotate', cx, cy, startAngle, frame: frameOf() };
    capture(e);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'move') {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (!g.moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        g.moved = true;
        onBringToFront(item._id);
      }
      onChange(item._id, { x: Math.round(g.frame.x + dx / zoom), y: Math.round(g.frame.y + dy / zoom) });
    } else if (g.kind === 'resize') {
      const keep = KEEPS_ASPECT[item.type] !== e.shiftKey;
      const next = resizeFrame(
        g.frame,
        g.handle,
        (e.clientX - g.startX) / zoom,
        (e.clientY - g.startY) / zoom,
        keep,
        MIN_SIZE[item.type],
      );
      onChange(item._id, {
        x: Math.round(next.x),
        y: Math.round(next.y),
        w: Math.round(next.w),
        h: Math.round(next.h),
      });
    } else {
      const angle = (Math.atan2(e.clientY - g.cy, e.clientX - g.cx) * 180) / Math.PI;
      let next = normaliseAngle(g.frame.rotation + angle - g.startAngle);
      if (e.shiftKey) next = Math.round(next / 15) * 15;
      else if (Math.abs(next) < 3) next = 0; // gentle snap back to straight
      onChange(item._id, { rotation: next });
    }
  };

  // pointer capture is released automatically on pointerup/cancel
  const endGesture = () => {
    if (!gesture.current) return;
    gesture.current = null;
    setInteracting(false);
  };

  // Handles capture the pointer themselves; their events bubble up to these.
  const gestureHandlers = { onPointerMove, onPointerUp: endGesture, onPointerCancel: endGesture };

  const onDoubleClick = (e: ReactMouseEvent) => {
    e.stopPropagation();
    if (item.type === 'text') onStartEdit(item._id);
  };

  let body: ReactNode;
  switch (item.type) {
    case 'text':
      body = (
        <NoteBody
          content={item.content}
          editing={editing}
          onText={(text) => onChange(item._id, { text })}
          onDone={onStopEdit}
        />
      );
      break;
    case 'image':
      body = <ImageBody content={item.content} />;
      break;
    case 'link':
      body = <VideoBody content={item.content} selected={selected} />;
      break;
    case 'sticker':
      body = <StickerBody content={item.content} />;
      break;
  }

  return (
    <div
      ref={elRef}
      className={`pb-el pb-el--${item.type}${selected ? ' is-selected' : ''}${editing ? ' is-editing' : ''}`}
      style={{ left: x, top: y, width: w, height: h, transform: `rotate(${rotation}deg)`, zIndex: z }}
      onPointerDown={onBodyPointerDown}
      onDoubleClick={onDoubleClick}
      data-item-id={item._id}
      {...gestureHandlers}
    >
      {body}
      {selected && !editing && (
        <>
          <div className="pb-el__outline" />
          {(Object.keys(HANDLES) as Handle[]).map((hd) => (
            <div
              key={hd}
              className={`pb-handle pb-handle--${hd}`}
              onPointerDown={onHandlePointerDown(hd)}
            />
          ))}
          <div className="pb-rotate-stem" />
          <div
            className="pb-rotate"
            title="Drag to rotate (Shift snaps to 15°)"
            onPointerDown={onRotatePointerDown}
          />
        </>
      )}
    </div>
  );
}

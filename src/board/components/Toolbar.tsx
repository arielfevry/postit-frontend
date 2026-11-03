import { useEffect, useRef, useState } from 'react';
import type { CanvasItem } from '../types';
import Icon from './Icon';
import type { IconName } from './Icon';

export const NOTE_COLORS = ['#fff3c4', '#ffd6a5', '#ffc8dd', '#cde7ff', '#d3f4d0', '#e7dcff', '#ffffff'];

export const STICKERS = [
  '⭐', '❤️', '🔥', '✅', '❗', '❓', '💡', '📌',
  '🎉', '👍', '👀', '🚀', '🎵', '📷', '☕', '🍕',
  '😀', '😎', '🤔', '😭', '🥳', '🙌', '💯', '🌈',
];

type Popover = 'sticker' | 'color' | null;

interface Props {
  selected: CanvasItem | null;
  zoom: number;
  onAddNote: (variant: 'sticky' | 'paper') => void;
  onAddImage: () => void;
  onAddVideo: () => void;
  onAddSticker: (emoji: string) => void;
  onColor: (color: string) => void;
  onFront: () => void;
  onBack: () => void;
  onDuplicate: () => void;
  onStraighten: () => void;
  onDelete: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

function ToolButton({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
  active,
  danger,
}: {
  icon: IconName;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`pb-tool${active ? ' is-active' : ''}${danger ? ' pb-tool--danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-tip={shortcut ? `${label}  ·  ${shortcut}` : label}
    >
      <Icon name={icon} />
    </button>
  );
}

export default function Toolbar(props: Props) {
  const { selected } = props;
  const [popover, setPopover] = useState<Popover>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // close popovers on outside click / Escape
  useEffect(() => {
    if (!popover) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPopover(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPopover(null);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [popover]);

  const toggle = (p: Popover) => setPopover((cur) => (cur === p ? null : p));
  const isStickyNote = selected?.type === 'text' && selected.content.variant === 'sticky';

  return (
    <div className="pb-toolbar" ref={rootRef} role="toolbar" aria-label="Board tools" aria-orientation="vertical">
      <div className="pb-toolbar__scroll">
      <div className="pb-toolbar__group">
        <ToolButton icon="sticky" label="Sticky note" shortcut="N" onClick={() => props.onAddNote('sticky')} />
        <ToolButton icon="paper" label="Paper note" shortcut="P" onClick={() => props.onAddNote('paper')} />
        <ToolButton icon="image" label="Image" shortcut="I" onClick={props.onAddImage} />
        <ToolButton icon="video" label="YouTube video" shortcut="Y" onClick={props.onAddVideo} />
        <ToolButton
          icon="sticker"
          label="Sticker"
          shortcut="S"
          onClick={() => toggle('sticker')}
          active={popover === 'sticker'}
        />
      </div>

      <div className="pb-toolbar__group">
        <ToolButton
          icon="palette"
          label={isStickyNote ? 'Note colour' : 'Note colour (select a sticky note)'}
          onClick={() => toggle('color')}
          disabled={!isStickyNote}
          active={popover === 'color'}
        />
        <ToolButton icon="front" label="Bring to front" shortcut="]" onClick={props.onFront} disabled={!selected} />
        <ToolButton icon="back" label="Send to back" shortcut="[" onClick={props.onBack} disabled={!selected} />
        <ToolButton icon="duplicate" label="Duplicate" shortcut="Ctrl+D" onClick={props.onDuplicate} disabled={!selected} />
        <ToolButton
          icon="rotate"
          label="Straighten"
          onClick={props.onStraighten}
          disabled={!selected || selected.content.rotation === 0}
        />
        <ToolButton icon="trash" label="Delete" shortcut="Del" onClick={props.onDelete} disabled={!selected} danger />
      </div>

      <div className="pb-toolbar__group">
        <ToolButton icon="zoomIn" label="Zoom in" shortcut="Ctrl+scroll" onClick={props.onZoomIn} />
        <span className="pb-toolbar__zoom" aria-live="polite">
          {Math.round(props.zoom * 100)}%
        </span>
        <ToolButton icon="zoomOut" label="Zoom out" onClick={props.onZoomOut} />
        <ToolButton icon="fit" label="Fit everything" shortcut="Shift+1" onClick={props.onFit} />
      </div>
      </div>

      {popover === 'sticker' && (
        <div className="pb-popover" role="dialog" aria-label="Choose a sticker">
          <div className="pb-popover__title">Stickers</div>
          <div className="pb-sticker-grid">
            {STICKERS.map((s) => (
              <button
                key={s}
                type="button"
                className="pb-sticker-pick"
                onClick={() => {
                  props.onAddSticker(s);
                  setPopover(null);
                }}
                aria-label={`Add ${s} sticker`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {popover === 'color' && isStickyNote && (
        <div className="pb-popover pb-popover--color" role="dialog" aria-label="Note colour">
          <div className="pb-popover__title">Note colour</div>
          <div className="d-flex flex-wrap gap-2">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`pb-swatch${selected.content.color === c ? ' is-active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => props.onColor(c)}
                aria-label={`Colour ${c}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

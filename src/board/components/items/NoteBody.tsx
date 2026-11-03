import { useEffect, useRef } from 'react';
import type { NoteContent } from '../../types';

interface Props {
  content: NoteContent;
  editing: boolean;
  onText: (text: string) => void;
  onDone: () => void;
}

export default function NoteBody({ content, editing, onText, onDone }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      const el = ref.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  const style = content.variant === 'sticky' ? { backgroundColor: content.color } : undefined;

  return (
    <div className={`pb-note pb-note--${content.variant}`} style={style}>
      <span className="pb-tape" aria-hidden="true" />
      {content.variant === 'paper' && <span className="pb-tape pb-tape--corner" aria-hidden="true" />}
      {editing ? (
        <textarea
          ref={ref}
          className="pb-note__input"
          value={content.text}
          placeholder="Write something…"
          onChange={(e) => onText(e.target.value)}
          onBlur={onDone}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
      ) : (
        <div className="pb-note__text">
          {content.text || <span className="pb-note__placeholder">Double-click to write</span>}
        </div>
      )}
    </div>
  );
}

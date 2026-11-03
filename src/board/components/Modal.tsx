import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'lg';
}

/** Bootstrap-styled modal rendered by React (no Bootstrap JS needed). */
export default function Modal({ title, onClose, children, footer, size }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const first = dialogRef.current?.querySelector<HTMLElement>('[autofocus], input, select, textarea, button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="pb-modal-root">
      <div className="modal-backdrop fade show" />
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onPointerDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className={`modal-dialog modal-dialog-centered${size ? ` modal-${size}` : ''}`} ref={dialogRef}>
          <div className="modal-content pb-modal">
            <div className="modal-header">
              <h2 className="modal-title fs-6 pb-caps">{title}</h2>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

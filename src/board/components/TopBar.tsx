import { useEffect, useRef, useState } from 'react';
import type { User } from '../types';
import Icon from './Icon';

interface Props {
  user: User;
  title: string;
  saving: boolean;
  openReminders: number;
  onHome: () => void;
  onSettings: () => void;
  onRename: (title: string) => void;
  onToggleReminders: () => void;
  onSignOut: () => void;
}

export default function TopBar(props: Props) {
  const { user, title } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  const commit = () => {
    setEditing(false);
    const t = draft.trim();
    if (t && t !== title) props.onRename(t);
    else setDraft(title);
  };

  const initial = (user.name.trim()[0] ?? '?').toUpperCase();

  return (
    <header className="pb-top">
      <nav className="pb-card pb-nav" aria-label="Board navigation">
        <button type="button" className="pb-nav__btn pb-nav__brand" onClick={props.onHome}>
          <Icon name="home" size={16} />
          <span>POST IT!</span>
        </button>
        <button type="button" className="pb-nav__btn" onClick={props.onSettings}>
          <Icon name="settings" size={16} />
          <span>Settings</span>
        </button>
      </nav>

      <div className="pb-card pb-title">
        {editing ? (
          <input
            className="pb-title__input"
            value={draft}
            maxLength={80}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                setDraft(title);
                setEditing(false);
              }
            }}
            aria-label="Board title"
          />
        ) : (
          <button
            type="button"
            className="pb-title__text"
            onClick={() => {
              setDraft(title);
              setEditing(true);
            }}
            title="Rename board"
          >
            {title}
          </button>
        )}
        <span className={`pb-save${props.saving ? ' is-saving' : ''}`} aria-live="polite">
          {props.saving ? 'Saving…' : 'Saved'}
        </span>
      </div>

      <div className="pb-top__right">
        <button
          type="button"
          className="pb-card pb-reminder-toggle d-xl-none"
          onClick={props.onToggleReminders}
          aria-label="Show reminders"
        >
          <Icon name="bell" size={16} />
          {props.openReminders > 0 && <span className="pb-reminder-toggle__count">{props.openReminders}</span>}
        </button>
        <div className="pb-user" ref={menuRef}>
          <button
            type="button"
            className="pb-card pb-user__btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="pb-user__hello">
              Hello <strong>{user.name}</strong>
            </span>
            <span className="pb-avatar" aria-hidden="true">
              {initial}
            </span>
          </button>
          {menuOpen && (
            <div className="dropdown-menu dropdown-menu-end show pb-user__menu" role="menu">
              <div className="dropdown-header small text-truncate">{user.email}</div>
              <button type="button" className="dropdown-item d-flex align-items-center gap-2" onClick={props.onSignOut} role="menuitem">
                <Icon name="logout" size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ContentPatch, ReminderItem } from '../types';
import { todayISO } from '../utils';
import Icon from './Icon';

interface Props {
  reminders: ReminderItem[];
  onAdd: (text: string, due: string | null) => void;
  onUpdate: (id: string, patch: ContentPatch) => void;
  onDelete: (id: string) => void;
  className?: string;
}

function formatDue(due: string): string {
  const [y, m, d] = due.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function RemindersPanel({ reminders, onAdd, onUpdate, onDelete, className = '' }: Props) {
  const [text, setText] = useState('');
  const [due, setDue] = useState('');
  const [showDue, setShowDue] = useState(false);
  const today = todayISO();

  const sorted = [...reminders].sort((a, b) => {
    if (a.content.done !== b.content.done) return a.content.done ? 1 : -1;
    const ad = a.content.due ?? '9999';
    const bd = b.content.due ?? '9999';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (a.createdAt ?? '') < (b.createdAt ?? '') ? -1 : 1;
  });
  const openCount = reminders.filter((r) => !r.content.done).length;
  const doneCount = reminders.length - openCount;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onAdd(t, due || null);
    setText('');
    setDue('');
    setShowDue(false);
  };

  return (
    <aside className={`pb-reminders ${className}`} aria-label="Reminders">
      <div className="pb-card pb-card--header d-flex align-items-center justify-content-between">
        <span className="pb-caps">Reminders</span>
        <span className="badge rounded-pill text-bg-dark">{openCount}</span>
      </div>

      <div className="pb-card pb-reminders__list">
        {sorted.length === 0 ? (
          <p className="text-body-secondary small mb-0 py-2">Nothing yet. Add your first reminder below.</p>
        ) : (
          <ul className="list-unstyled mb-0">
            {sorted.map((r) => {
              const overdue = !r.content.done && r.content.due !== null && r.content.due < today;
              return (
                <li key={r._id} className={`pb-reminder${r.content.done ? ' is-done' : ''}`}>
                  <input
                    className="form-check-input mt-0 flex-shrink-0"
                    type="checkbox"
                    id={`rem-${r._id}`}
                    checked={r.content.done}
                    onChange={(e) => onUpdate(r._id, { done: e.target.checked })}
                  />
                  <label className="pb-reminder__text" htmlFor={`rem-${r._id}`}>
                    {r.content.text}
                    {r.content.due && (
                      <span className={`pb-reminder__due${overdue ? ' is-overdue' : ''}`}>
                        <Icon name="calendar" size={12} /> {overdue ? 'Overdue · ' : ''}
                        {formatDue(r.content.due)}
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    className="pb-icon-btn"
                    onClick={() => onDelete(r._id)}
                    aria-label={`Delete reminder: ${r.content.text}`}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form className="pb-reminders__form" onSubmit={submit}>
          <div className="input-group input-group-sm">
            <input
              className="form-control"
              placeholder="Add a reminder…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="New reminder"
              maxLength={200}
            />
            <button
              type="button"
              className={`btn btn-outline-secondary${showDue || due ? ' active' : ''}`}
              onClick={() => setShowDue((s) => !s)}
              aria-label="Set a due date"
              title="Due date"
            >
              <Icon name="calendar" size={14} />
            </button>
            <button type="submit" className="btn btn-dark" disabled={!text.trim()} aria-label="Add reminder">
              <Icon name="plus" size={14} />
            </button>
          </div>
          {showDue && (
            <input
              type="date"
              className="form-control form-control-sm mt-2"
              value={due}
              min={today}
              onChange={(e) => setDue(e.target.value)}
              aria-label="Due date"
            />
          )}
        </form>

        {doneCount > 0 && (
          <button
            type="button"
            className="btn btn-link btn-sm p-0 mt-2 text-body-secondary"
            onClick={() => reminders.filter((r) => r.content.done).forEach((r) => onDelete(r._id))}
          >
            Clear {doneCount} completed
          </button>
        )}
      </div>
    </aside>
  );
}

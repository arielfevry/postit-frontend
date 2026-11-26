import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError, AuthError } from '../api';
import type { Board, User } from '../types';
import Modal from './Modal';

interface Props {
  board: Board;
  currentUser: User;
  onClose: () => void;
  /** a request came back 401: the token is missing, invalid or expired */
  onAuthError: () => void;
  /**
   * Only passed to the owner of the board.
   * For everyone else, the button is disabled with a note.
   */
  onGrantAccess?: (user: User) => Promise<void>;
}

type Lookup =
  | { state: 'idle' }
  | { state: 'searching' }
  | { state: 'found'; user: User }
  | { state: 'not-found'; email: string }
  | { state: 'error'; message: string };

const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export default function ShareModal({ board, currentUser, onClose, onAuthError, onGrantAccess }: Props) {
  const [email, setEmail] = useState('');
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' });
  const [granting, setGranting] = useState(false);
  const [granted, setGranted] = useState<string | null>(null);

  // everyone who can open the board: the owner plus userIds (which includes the owner)
  const memberIds = new Set([...(board.userIds ?? []), ...(board.ownerId ? [board.ownerId] : [])].map(String));
  const others = [...memberIds].filter((id) => id !== currentUser.id).length;

  const find = async (e: FormEvent) => {
    e.preventDefault();
    if (!looksLikeEmail(email)) return;
    setLookup({ state: 'searching' });
    setGranted(null);
    try {
      const { user } = await api.searchUserByEmail(email);
      setLookup({ state: 'found', user });
    } catch (err) {
      if (err instanceof AuthError) return onAuthError();
      if (err instanceof ApiError && err.status === 404) {
        setLookup({ state: 'not-found', email: email.trim() });
      } else if (err instanceof ApiError && err.status === 400 && /invalid user id/i.test(err.message)) {
        // the server doesn't have /api/users/search yet, so the request fell through to /api/users/:userId
        setLookup({ state: 'error', message: 'This service is currently unavailable.' });
      } else {
        setLookup({ state: 'error', message: (err as Error).message });
      }
    }
  };

  const grant = async (user: User) => {
    if (!onGrantAccess) return;
    setGranting(true);
    try {
      await onGrantAccess(user);
      setGranted(user.id);
    } catch (err) {
      if (err instanceof AuthError) return onAuthError();
      setLookup({ state: 'error', message: (err as Error).message });
    } finally {
      setGranting(false);
    }
  };

  const found = lookup.state === 'found' ? lookup.user : null;
  const isSelf = !!found && found.id === currentUser.id;
  const hasAccess = !!found && (memberIds.has(found.id) || granted === found.id);

  return (
    <Modal
      title="Share board"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
          Done
        </button>
      }
    >
      <p className="small text-body-secondary mb-3">
        Give someone with a PostIt! account access to edit <strong className="text-body">{board.title}</strong>.
      </p>

      <form onSubmit={find} noValidate>
        <label htmlFor="pb-share-email" className="form-label small fw-semibold">
          Their email
        </label>
        <div className="input-group">
          <input
            id="pb-share-email"
            type="email"
            className="form-control"
            placeholder="name@example.com"
            value={email}
            autoFocus
            autoComplete="off"
            onChange={(e) => {
              setEmail(e.target.value);
              if (lookup.state !== 'searching') setLookup({ state: 'idle' });
            }}
          />
          <button
            type="submit"
            className="btn btn-dark"
            disabled={!looksLikeEmail(email) || lookup.state === 'searching'}
          >
            {lookup.state === 'searching' ? 'Finding…' : 'Find'}
          </button>
        </div>
      </form>

      <div className="pb-share-result" aria-live="polite">
        {found && (
          <div className="pb-share-person">
            <span className="pb-avatar" aria-hidden="true">
              {(found.name.trim()[0] ?? '?').toUpperCase()}
            </span>
            <div className="pb-share-person__who">
              <div className="fw-semibold text-truncate">{found.name}</div>
              <div className="small text-body-secondary text-truncate">{found.email}</div>
            </div>
            {isSelf ? (
              <span className="small text-body-secondary flex-shrink-0">That’s you</span>
            ) : hasAccess ? (
              <span className="badge text-bg-light border flex-shrink-0">Has access</span>
            ) : (
              <button
                type="button"
                className="btn btn-dark btn-sm flex-shrink-0"
                disabled={!onGrantAccess || granting}
                onClick={() => grant(found)}
              >
                {granting ? 'Sharing…' : 'Give edit access'}
              </button>
            )}
          </div>
        )}
        {found && !isSelf && !hasAccess && !onGrantAccess && (
          <p className="small text-body-secondary mt-2 mb-0">
            Only the board's owner can add users.
          </p>
        )}
        {lookup.state === 'not-found' && (
          <p className="small mb-0">
            Unable to find a PostIt! account for <strong>{lookup.email}</strong>.
          </p>
        )}
        {lookup.state === 'error' && <div className="alert alert-danger py-2 small mb-0">{lookup.message}</div>}
      </div>

      <hr />
      <div className="small text-body-secondary">
        {others === 0
          ? 'Only you have access to this board.'
          : `You and ${others} other ${others === 1 ? 'person' : 'people'} have access to this board.`}
      </div>
    </Modal>
  );
}

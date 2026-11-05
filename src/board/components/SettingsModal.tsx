import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Board } from '../types';
import { BACKGROUNDS } from '../utils';
import Modal from './Modal';

interface Props {
  board: Board;
  itemCount: number;
  onClose: () => void;
  onSave: (patch: Partial<Pick<Board, 'title' | 'background_image'>>) => void;
  /** Deletes every item, then the board. */
  onDelete: () => Promise<void>;
  /** Only the owner may rename, restyle or delete the board. */
  isOwner: boolean;
}

export default function SettingsModal({ board, itemCount, onClose, onSave, onDelete, isOwner }: Props) {
  const current = board.background_image || 'preset:cork';
  const isCustom = !current.startsWith('preset:');
  const [title, setTitle] = useState(board.title);
  const [bg, setBg] = useState(isCustom ? 'custom' : current);
  const [customUrl, setCustomUrl] = useState(isCustom ? current : '');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const background = bg === 'custom' ? customUrl.trim() : bg;
  const canSave = title.trim().length > 0 && (bg !== 'custom' || /^https?:\/\//.test(customUrl.trim()));

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const patch: Partial<Pick<Board, 'title' | 'background_image'>> = {};
    if (title.trim() !== board.title) patch.title = title.trim();
    if (background !== (board.background_image || 'preset:cork')) patch.background_image = background;
    if (Object.keys(patch).length) onSave(patch);
    onClose();
  };

  const doDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
    } catch (e) {
      setDeleteError((e as Error).message);
      setDeleting(false);
    }
  };

  return (
    <Modal
      title="Board settings"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="pb-settings-form" className="btn btn-dark btn-sm" disabled={!canSave || !isOwner}>
            Save changes
          </button>
        </>
      }
    >
      {!isOwner && (
        <div className="alert alert-secondary py-2 small">
          Only the board’s owner can change these settings or delete the board.
        </div>
      )}
      <form id="pb-settings-form" onSubmit={save}>
        <fieldset disabled={!isOwner} className="border-0 p-0 m-0">
        <div className="mb-3">
          <label htmlFor="pb-board-title" className="form-label small fw-semibold">
            Board title
          </label>
          <input
            id="pb-board-title"
            className="form-control"
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <fieldset className="mb-2">
          <legend className="form-label small fw-semibold">Background</legend>
          <div className="pb-bg-options">
            {BACKGROUNDS.map((b) => (
              <label key={b.key} className={`pb-bg-option${bg === b.key ? ' is-active' : ''}`}>
                <input
                  type="radio"
                  name="pb-bg"
                  className="visually-hidden"
                  value={b.key}
                  checked={bg === b.key}
                  onChange={() => setBg(b.key)}
                />
                <span className={`pb-bg-swatch pb-surface--${b.key.slice(7)}`} />
                <span className="small">{b.label}</span>
              </label>
            ))}
            <label className={`pb-bg-option${bg === 'custom' ? ' is-active' : ''}`}>
              <input
                type="radio"
                name="pb-bg"
                className="visually-hidden"
                value="custom"
                checked={bg === 'custom'}
                onChange={() => setBg('custom')}
              />
              <span
                className="pb-bg-swatch pb-bg-swatch--custom"
                style={customUrl ? { backgroundImage: `url("${customUrl.replace(/"/g, '%22')}")` } : undefined}
              />
              <span className="small">Image URL</span>
            </label>
          </div>
          {bg === 'custom' && (
            <input
              className="form-control form-control-sm mt-2"
              placeholder="https://…/background.jpg"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              aria-label="Background image URL"
            />
          )}
        </fieldset>
        </fieldset>
      </form>

      {isOwner && <hr />}

      {isOwner && (
        <>
          <div className="pb-danger">
            <div>
              <div className="fw-semibold small text-danger">Delete board</div>
              <div className="small text-body-secondary">
                Permanently removes this board and its {itemCount} item{itemCount === 1 ? '' : 's'}. This can’t be undone.
              </div>
            </div>
            {!confirming ? (
              <button type="button" className="btn btn-outline-danger btn-sm flex-shrink-0" onClick={() => setConfirming(true)}>
                Delete board
              </button>
            ) : (
              <div className="d-flex gap-2 flex-shrink-0">
                <button type="button" className="btn btn-light btn-sm" onClick={() => setConfirming(false)} disabled={deleting}>
                  Keep it
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={doDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            )}
          </div>
          {deleteError && <div className="alert alert-danger py-2 small mt-2 mb-0">{deleteError}</div>}
        </>
      )}
    </Modal>
  );
}

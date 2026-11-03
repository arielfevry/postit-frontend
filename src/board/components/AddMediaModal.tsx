import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { parseYouTubeId } from '../utils';
import Modal from './Modal';
import Icon from './Icon';

interface ImageProps {
  kind: 'image';
  onClose: () => void;
  onSubmitUrl: (url: string, caption: string) => Promise<void>;
  onSubmitFile: (file: File, caption: string) => Promise<void>;
}

interface VideoProps {
  kind: 'video';
  onClose: () => void;
  onSubmitUrl: (url: string) => Promise<void>;
}

/** "Add image" (upload or URL) and "Add YouTube video" dialogs. */
export default function AddMediaModal(props: ImageProps | VideoProps) {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isVideo = props.kind === 'video';
  const videoId = isVideo ? parseYouTubeId(url) : null;
  const valid = isVideo ? !!videoId : !!file || /^https?:\/\/\S+$/.test(url.trim());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (props.kind === 'video') await props.onSubmitUrl(url.trim());
      else if (file) await props.onSubmitFile(file, caption.trim());
      else await props.onSubmitUrl(url.trim(), caption.trim());
      props.onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isVideo ? 'Add YouTube video' : 'Add image'}
      onClose={props.onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={props.onClose}>
            Cancel
          </button>
          <button type="submit" form="pb-media-form" className="btn btn-dark btn-sm" disabled={!valid || busy}>
            {busy ? 'Adding…' : 'Add to board'}
          </button>
        </>
      }
    >
      <form id="pb-media-form" onSubmit={submit}>
        {isVideo ? (
          <>
            <label htmlFor="pb-yt-url" className="form-label small fw-semibold">
              YouTube link
            </label>
            <input
              id="pb-yt-url"
              className={`form-control${url && !videoId ? ' is-invalid' : ''}`}
              placeholder="https://youtu.be/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
            />
            <div className="invalid-feedback">That doesn’t look like a YouTube video link.</div>
            {videoId && (
              <img
                className="pb-yt-preview mt-3"
                src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                alt="Video thumbnail"
              />
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              className={`pb-dropzone${file ? ' has-file' : ''}`}
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="upload" size={22} />
              <span className="small">{file ? file.name : 'Choose an image from your computer'}</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="d-none"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setUrl('');
              }}
            />
            <div className="pb-or">or paste a link</div>
            <input
              className="form-control"
              placeholder="https://…/photo.jpg"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (e.target.value) setFile(null);
              }}
              aria-label="Image URL"
            />
            <label htmlFor="pb-img-caption" className="form-label small fw-semibold mt-3">
              Caption <span className="fw-normal text-body-secondary">(optional)</span>
            </label>
            <input
              id="pb-img-caption"
              className="form-control"
              value={caption}
              maxLength={120}
              onChange={(e) => setCaption(e.target.value)}
            />
          </>
        )}
        {error && <div className="alert alert-danger py-2 small mt-3 mb-0">{error}</div>}
      </form>
    </Modal>
  );
}

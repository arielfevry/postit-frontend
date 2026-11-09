import type { Frame } from './types';

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ---------------- YouTube ---------------- */

/** Pulls the 11-char video id out of any common YouTube URL form. */
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (/^[\w-]{11}$/.test(text)) return text;
  let url: URL;
  try {
    url = new URL(text.startsWith('http') ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\.|^music\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
      if (m) id = m[1];
    }
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

/** Best-effort title lookup through YouTube's oEmbed endpoint. */
export async function fetchYouTubeTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
    );
    if (!res.ok) return '';
    const data = (await res.json()) as { title?: string };
    return data.title ?? '';
  } catch {
    return '';
  }
}

/* ---------------- Images ---------------- */

export const looksLikeImageUrl = (s: string) =>
  /^(https?:\/\/\S+\.(png|jpe?g|gif|webp|avif|svg)(\?\S*)?|data:image\/)/i.test(s.trim());

/** Natural size of an image URL, or null if it fails to load. */
export function measureImage(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Largest data URL an image item can hold. The API accepts JSON bodies up to
 * Express's default 100kb, and every save sends the item's full content.
 */
export const MAX_IMAGE_DATA_URL = 80_000;

/**
 * Reads an uploaded image into a data URL small enough to store on the item:
 * it is downscaled and re-encoded, stepping quality and size down until it
 * fits MAX_IMAGE_DATA_URL. GIFs/SVGs are kept as-is (so GIFs still animate)
 * and must already be small enough.
 */
export async function fileToDataUrl(file: File): Promise<{ src: string; width: number; height: number }> {
  const tooBig = 'That image is too large to save on a board (max about 60 KB for GIFs and SVGs). Try a smaller file or paste an image link instead.';

  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read that file'));
      reader.readAsDataURL(file);
    });
    if (src.length > MAX_IMAGE_DATA_URL) throw new Error(tooBig);
    const size = (await measureImage(src)) ?? { width: 300, height: 300 };
    return { src, ...size };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That file couldn’t be read as an image.');
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process that image');

  try {
    // On a board, photos show at ~300px, so 900px is plenty even when zoomed in.
    for (const maxDim of [900, 700, 520, 400]) {
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.7, 0.58]) {
        const src = canvas.toDataURL('image/webp', quality);
        if (src.length <= MAX_IMAGE_DATA_URL) return { src, width: canvas.width, height: canvas.height };
      }
    }
  } finally {
    bitmap.close();
  }
  throw new Error('That image couldn’t be compressed enough to save. Try a smaller one or paste an image link.');
}

/** Fits a natural size into a box no larger than `max` on its long side. */
export function fitSize(width: number, height: number, max = 320) {
  const s = Math.min(1, max / Math.max(width, height));
  return { w: Math.round(width * s), h: Math.round(height * s) };
}

/* ---------------- Geometry ---------------- */

export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const HANDLES: Record<Handle, [number, number]> = {
  nw: [-1, -1],
  n: [0, -1],
  ne: [1, -1],
  e: [1, 0],
  se: [1, 1],
  s: [0, 1],
  sw: [-1, 1],
  w: [-1, 0],
};

/**
 * Resizes a rotated box from one of its handles. The handle's opposite
 * edge/corner stays put on screen, which is what makes resizing a rotated
 * element feel right. dx/dy are the pointer movement in board units.
 */
export function resizeFrame(
  start: Frame,
  handle: Handle,
  dx: number,
  dy: number,
  keepAspect: boolean,
  min = 40,
): Pick<Frame, 'x' | 'y' | 'w' | 'h'> {
  const [hx, hy] = HANDLES[handle];
  const t = (start.rotation * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);

  // pointer delta in the element's own (unrotated) axes
  const lx = dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;

  let w = start.w + hx * lx;
  let h = start.h + hy * ly;

  if (keepAspect) {
    const ratio = start.w / start.h;
    if (hx !== 0 && hy !== 0) {
      if (w / start.w > h / start.h) h = w / ratio;
      else w = h * ratio;
    } else if (hx !== 0) h = w / ratio;
    else w = h * ratio;
    const grow = Math.max(1, min / w, min / h);
    w *= grow;
    h *= grow;
  } else {
    w = Math.max(min, w);
    h = Math.max(min, h);
  }

  // shift the centre so the anchored side doesn't move
  const dcx = hx === 0 ? 0 : (hx * (w - start.w)) / 2;
  const dcy = hy === 0 ? 0 : (hy * (h - start.h)) / 2;
  const cx = start.x + start.w / 2 + dcx * cos - dcy * sin;
  const cy = start.y + start.h / 2 + dcx * sin + dcy * cos;

  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Normalises an angle to (-180, 180]. */
export function normaliseAngle(deg: number): number {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a <= -180) a += 360;
  return Math.round(a * 10) / 10;
}

/* ---------------- Board backgrounds ---------------- */

export const BACKGROUNDS = [
  { key: 'preset:cork', label: 'Cork' },
  { key: 'preset:metal', label: 'Brushed metal' },
  { key: 'preset:dots', label: 'Dot grid' },
  { key: 'preset:chalk', label: 'Chalkboard' },
] as const;

export function backgroundClass(bg: string): string {
  if (!bg) return 'pb-surface--cork';
  if (bg.startsWith('preset:')) return `pb-surface--${bg.slice(7)}`;
  return 'pb-surface--image';
}

/* ---------------- Misc ---------------- */

export const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

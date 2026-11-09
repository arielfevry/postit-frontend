import type { StickerContent } from '../../types';

export default function StickerBody({ content }: { content: StickerContent }) {
  return (
    <div className="pb-sticker" style={{ fontSize: Math.min(content.w, content.h) * 0.74 }}>
      <span>{content.emoji}</span>
    </div>
  );
}

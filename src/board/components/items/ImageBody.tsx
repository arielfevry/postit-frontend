import { useState } from 'react';
import type { ImageContent } from '../../types';

export default function ImageBody({ content }: { content: ImageContent }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="pb-photo">
      <span className="pb-tape" aria-hidden="true" />
      {failed ? (
        <div className="pb-photo__broken">Image couldn’t load</div>
      ) : (
        <img
          src={content.src}
          alt={content.caption || 'Board image'}
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
      {content.caption && <figcaption>{content.caption}</figcaption>}
    </figure>
  );
}

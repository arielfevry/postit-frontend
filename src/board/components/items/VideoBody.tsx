import type { VideoContent } from '../../types';

/**
 * YouTube embed card. Until the card is selected, a transparent cover sits over
 * the player so the first click selects/drags the card (like Obsidian canvas);
 * once selected, the player is interactive.
 */
export default function VideoBody({ content, selected }: { content: VideoContent; selected: boolean }) {
  return (
    <div className="pb-video">
      <div className="pb-video__player">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${content.videoId}?rel=0`}
          title={content.title || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
        {!selected && <div className="pb-video__cover" />}
      </div>
      <div className="pb-video__meta">
        <div className="pb-video__url">
          <span className="pb-yt-dot" aria-hidden="true" />
          <span className="text-truncate">youtu.be/{content.videoId}</span>
          <a
            className="pb-video__open"
            href={content.url}
            target="_blank"
            rel="noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            title="Open on YouTube"
          >
            Open ↗
          </a>
        </div>
        <div className="pb-video__title">{content.title || 'YouTube video'}</div>
      </div>
    </div>
  );
}

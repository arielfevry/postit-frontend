// Small stroke icon set drawn for the board, so the toolbar needs no icon font.
const PATHS = {
  home: 'M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-1.7 1l-.3 2h-4l-.3-2a7 7 0 0 1-1.7-1l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-3L3.2 9.3l2-3.4 1.9.7a7 7 0 0 1 1.7-1l.3-2h4l.3 2a7 7 0 0 1 1.7 1l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 3z',
  pointer: 'M5 3l14 7-6 2-2 6z',
  sticky: 'M4 4h16v10l-6 6H4zM14 20v-6h6',
  paper: 'M5 3h10l4 4v14l-2-1-2 1-2-1-2 1-2-1-2 1-2-1zM15 3v4h4M8 11h8M8 15h6',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9.5a1.5 1.5 0 1 0 0-.01',
  video: 'M2.5 7.5c0-1.7 1.3-3 3-3h13c1.7 0 3 1.3 3 3v9c0 1.7-1.3 3-3 3h-13c-1.7 0-3-1.3-3-3zM10 9v6l5-3z',
  sticker: 'M20 12a8 8 0 1 1-8-8M20 12l-8-8M20 12h-5a3 3 0 0 1-3-3V4M8.5 14.5c1.6 1.6 3.4 1.6 5 0M9 10h.01',
  palette:
    'M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.2-1.6-.4-1-.1-2.4 1.4-2.4H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10zM7.5 12h.01M9.5 7.5h.01M14.5 7.5h.01',
  front: 'M8 8h12v12H8zM4 16V4h12',
  back: 'M4 4h12v12H4zM20 8v12H8',
  duplicate: 'M8 8h12v12H8zM16 8V4H4v12h4',
  rotate: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  zoomIn: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4M8 11h6M11 8v6',
  zoomOut: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4M8 11h6',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-10',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  pencil: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3',
} as const;

export type IconName = keyof typeof PATHS;

interface Props {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export default function Icon({ name, size = 18, className, strokeWidth = 1.8 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

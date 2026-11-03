// Shapes shared by the board UI and the API.
// Items are stored with the existing Item model: { boardId, userId, type, content }.
// `content` is Mixed in Mongo, so each item type keeps its own fields there,
// including its position on the canvas (the Frame).

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Board {
  _id: string;
  title: string;
  /** "preset:cork" | "preset:metal" | "preset:dots" | "preset:chalk" | an image URL */
  background_image: string;
  userIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Position and transform of an element on the canvas, in board (world) units. */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  /** degrees, clockwise */
  rotation: number;
  z: number;
}

export type NoteVariant = 'sticky' | 'paper';

export interface NoteContent extends Frame {
  variant: NoteVariant;
  color: string;
  text: string;
}

export interface ImageContent extends Frame {
  src: string;
  caption: string;
}

export interface VideoContent extends Frame {
  url: string;
  videoId: string;
  title: string;
}

export interface StickerContent extends Frame {
  emoji: string;
}

export interface ReminderContent {
  text: string;
  done: boolean;
  /** yyyy-mm-dd or null */
  due: string | null;
}

interface BaseItem {
  _id: string;
  boardId: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

// Item model types: "text" = note, "link" = YouTube embed, "checklist" = reminder.
export type NoteItem = BaseItem & { type: 'text'; content: NoteContent };
export type ImageItem = BaseItem & { type: 'image'; content: ImageContent };
export type VideoItem = BaseItem & { type: 'link'; content: VideoContent };
export type StickerItem = BaseItem & { type: 'sticker'; content: StickerContent };
export type ReminderItem = BaseItem & { type: 'checklist'; content: ReminderContent };

export type CanvasItem = NoteItem | ImageItem | VideoItem | StickerItem;
export type AnyItem = CanvasItem | ReminderItem;
export type ItemType = AnyItem['type'];

/** Any subset of fields from any item content. Used for partial updates. */
export type ContentPatch = Partial<NoteContent & ImageContent & VideoContent & StickerContent & ReminderContent>;

export type NewItem =
  | { type: 'text'; content: NoteContent }
  | { type: 'image'; content: ImageContent }
  | { type: 'link'; content: VideoContent }
  | { type: 'sticker'; content: StickerContent }
  | { type: 'checklist'; content: ReminderContent };

export interface Viewport {
  /** screen offset of the board origin, in px */
  x: number;
  y: number;
  zoom: number;
}

export const isCanvasItem = (item: AnyItem): item is CanvasItem => item.type !== 'checklist';
export const isReminder = (item: AnyItem): item is ReminderItem => item.type === 'checklist';

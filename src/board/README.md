# Board

The PostIt! board page: a pannable, zoomable canvas with sticky notes, paper notes, images,
YouTube embeds and stickers that can be dragged, resized and rotated, plus a reminders list.
Built with React + TypeScript + Bootstrap 5.

## Using it

```jsx
import BoardPage from './board';

<BoardPage />                          // reads the id from /board/:id, creates a board at /board
<BoardPage boardId={id} onHome={fn} /> // controlled by a router
```

`App.jsx` currently renders it for any `/board…` URL. It expects the signed-in user in
`localStorage.user` (the `{ id, name, email }` object `/api/login` returns). If no user is found, it shows a small
stand-in sign-in form (`components/SignInGate.tsx`), which can be removed once the real login page stores the user the same way.

## Storage

Everything is saved with the existing `Item` model; position, size, rotation and stacking order live in
`content`:

| On the board | `Item.type` | `content` |
|---|---|---|
| Sticky / paper note | `text` | `x y w h rotation z variant color text` |
| Image | `image` | `x y w h rotation z src caption` (uploads are downscaled data URLs) |
| YouTube video | `link` | `x y w h rotation z url videoId title` |
| Sticker | `sticker` | `x y w h rotation z emoji` |
| Reminder | `checklist` | `text done due` |

Board background is `Board.background_image`: `preset:cork|metal|dots|chalk` or an image URL.

API (backend `routes/boards.js`): `GET/POST /api/boards`, `GET/PATCH/DELETE /api/boards/:id`,
`GET/POST /api/boards/:id/items`, `PATCH/DELETE /api/items/:id`. Item PATCHes send only the changed
`content` fields, and the server merges them into the stored content.

## Controls

| | |
|---|---|
| Pan | drag empty space, scroll, or middle-click drag |
| Zoom | Ctrl/⌘ + scroll, pinch, toolbar, `+` / `-` |
| Fit everything | `Shift+1` |
| New sticky / paper note | `N` / `P`, or double-click empty space |
| Image / YouTube / sticker | `I` / `Y` / `S` |
| Edit a note | double-click it or press `Enter`; `Esc` to finish |
| Resize | corner/edge handles. Images and stickers keep their proportions (`Shift` toggles this) |
| Rotate | the round handle (`Shift` snaps to 15°) |
| Nudge | arrow keys (`Shift` = 10px) |
| Front / back | `]` / `[` |
| Duplicate / delete | `Ctrl+D` / `Delete` |
| Paste | an image, a YouTube link, an image URL, or text (text becomes a note) |
| Drop | image files onto the canvas |

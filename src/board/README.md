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

`App.jsx` currently renders it for any `/board…` URL.

### Signing in

`App.tsx` routes `/board/:boardId?` here, behind the login page's `RequireLogin`. After logging in, the
login page goes to `/board`, which creates a new blank board and switches the URL to `/board/<id>`.

The board uses the login page's session (`localStorage.user_data`, read with
`LoginAndRegistry/utils/session.ts`): `{ token, id, name }`. Every board and item request sends
`Authorization: Bearer <token>`.

If the session has no token, or the API answers 401 (an invalid or expired token; tokens last
`JWT_EXPIRES_IN`, 1 hour by default), the board clears the session and calls `onSignOut`, which defaults to
going to `/`, the login page. Signing out from the user menu does the same.

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

API used:

| | |
|---|---|
| Boards | `POST /api/boards`, `GET/PATCH/DELETE /api/boards/:boardId`. Only the owner can PATCH or DELETE |
| Items | `GET /api/items?boardId=`, `POST /api/items`, `PUT /api/items/:id`, `DELETE /api/items/:id`. The server takes the user from the token |

- `PUT /api/items/:id` replaces the whole `content`, so edits are batched for about 0.5s and the item's full
  content is sent. Saves for the same item run one at a time, in order.
- `DELETE /api/boards/:boardId` refuses a board that still has items, so deleting a board deletes all of its items
  (including reminders) first.
- The API accepts request bodies up to 100kb, so uploaded images are downscaled and re-encoded to under about
  80KB. GIFs and SVGs, which are kept as-is to stay animated, must already be that small. Linked images have no size limit.

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

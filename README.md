# Every Single Thing Becomes a Word

A standalone text work by Damon Zucconi, extracted from `reticular`.
Words are padded to equal length, then read down each column of letters:
`abc de` becomes `adbec ` (including the final space). Each whitespace character
separates a word; repeated spaces retain empty columns. Emoji and combining
characters stay intact.

## Local use

With Node.js 22 or newer:

```sh
npm run dev
```

Open http://localhost:5173. No install or build step is needed. Run `npm test`
for transformation regression tests. Set `PORT` to use a different local port.

## Netlify

Import this directory's repository into Netlify. Leave the build command empty;
`netlify.toml` sets the publish directory to `public`. Alternatively, upload the
`public` directory for a manual deployment. The old page path redirects to `/`
when deployed using the repository configuration.

The deployed app is plain HTML, CSS, and JavaScript, with no runtime packages,
server, external fonts, or network requests for text processing. Ordinary edits
stay in the page; recording explicitly saves edits into the URL. Copy uses the clipboard on HTTPS or
localhost, with manual selection if clipboard access is unavailable.

The desktop layout gives the output two-thirds of the screen and the source
one-third, with controls below the source. The panels never overlap. On narrow
screens, output sits above the source field. Output can be selected directly, or copied with the Copy button.

Requires a modern browser with `Intl.Segmenter` support.

## Composition links

Use `?text=Every%20single%20thing%20becomes%20a%20word` to open a composition.
Add `&playback=1` to type the source text automatically, one visible character
in short bursts with changing pace, updating the braided output as it goes.
Word boundaries, punctuation, and newlines add thinking pauses. Occasional
nearby-key typos are visibly backspaced and corrected; the final text always
matches the link. Emoji and combining marks
are typed as whole characters. Editing the source stops playback; reloading
the link starts it again. `playback=0` or `playback=false` disables playback.

Encode source text with `encodeURIComponent` when constructing a link, so
newlines, ampersands, plus signs, and other special characters are preserved.
Linked text is part of the URL and may appear in browser history and hosting
access logs. Editing the composition does not change its URL unless recording is active.

## Recording your typing

Click **Record**, then type in the source field. Recording starts from whatever
text is already there; clear it first if you want a blank beginning. Click
**Stop** to finish, **Replay** to watch, or **Copy link** to share.

The URL saves after a 600 ms typing pause, with a checkpoint every two seconds
during continuous typing and an immediate save on Stop or Copy link. Compression
jobs run one at a time; unchanged recordings reuse their saved link. `recording` contains a versioned, compressed sequence of
edits and millisecond delays. Backspaces, deletions, replacements, pastes, undo,
and composition input are captured as text changes, including edits in the
middle of the text. Cursor-only moves are not recorded; replay places the caret
at each edit. The initial pause before your first edit is preserved.

Opening a recorded link replays the actual edits and timing, without simulated
mistakes or randomness. `playback=0` shows the final result immediately. Editing
during replay stops it. Clicking Record again starts a new recording from the
current text. Recorded links take precedence over `text` when both are present.

Compression uses the browser's built-in Compression Streams API (Deflate and
URL-safe Base64), with no server storage or dependencies. The recording includes
deleted text.

The link indicator shows the full URL size in bytes, whether edits are pending,
and whether the link is saved. It warns at 6,400 bytes and blocks URL updates
and Copy link above the app’s 8,000-byte budget. The previous valid URL remains
in the address bar; newer edits stay in memory and can still be replayed.
The size shown while edits are pending is the last measured size.

This is an app sharing limit, not a verified Netlify maximum or a guarantee for
every browser and link-sharing service. HTTP recommends support for at least
8,000-byte URIs: https://www.rfc-editor.org/rfc/rfc9110.html#section-4.1

With a mouse, controls fade in within roughly 80 pixels of the menu and fade out
when the pointer moves away. Keyboard focus also reveals them. Touch devices
use the **•••** disclosure; Escape closes it. Reduced-motion preferences disable
the fade transition.

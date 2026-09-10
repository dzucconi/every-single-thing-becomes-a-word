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
server, external fonts, or network requests for text processing. Text stays in
the page; it is not saved across reloads. Copy uses the clipboard on HTTPS or
localhost, with manual selection if clipboard access is unavailable.

The desktop layout retains the original overlapping fields: focus or hover over
the source field to bring it forward. On narrow screens, output sits above the
source field. Output can be selected directly, or copied with the Copy button.

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
access logs. Editing the composition does not change its URL.

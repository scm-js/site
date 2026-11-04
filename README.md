# scmjs.dev

The landing page for [scmJS](https://github.com/scm-js/scm-js): the logo, the buttons that
open the editor and the nightly, the download list, the plugin list and the privacy page.
There is no build step. What is committed is what is served.

| File | What it is |
| --- | --- |
| `index.html` | the landing page, with a small script that adds to it |
| `plugins.html` | the plugin list, read live from the registry |
| `privacy.html` | the privacy policy |
| `stats/` | the numbers page (`index.html`, `stats.js`, and `names.js`, the editor's names for units, hotkeys and dialogs) |
| `globe.js` | the turning wireframe mark and the starfield behind it, copied from the editor's `WireSphere.tsx` and `starfield.ts` |
| `styles.css` | the editor's own palette (`src/styles/tokens.css` there) |
| `logo.svg` | the flat mark, shown until `globe.js` runs and to readers without JavaScript |
| `favicon.svg` | the same mark with a square behind it |
| `images/` | `editor.webp`, the editor picture from the guide, and `og.jpg`, the 1200×630 link preview |
| `ko/` | the Korean copies of `index.html`, `plugins.html` and `stats/index.html` (see below) |
| `header.js` | the top bar's two live items: which game data this browser holds, and the scmjs.dev account |
| `lang.js` | remembers the language picked in the top bar, and offers the Korean page once to a browser that asks for Korean |
| `scripts/check-translations.mjs` | checks each Korean page against its English one |
| `robots.txt`, `sitemap.xml` | for search engines |
| `CNAME`, `.nojekyll` | GitHub Pages settings: the custom domain, and no Jekyll pass |

A new page goes in `sitemap.xml` and gets its own `<link rel="canonical">`.

The site and the editor at `scmjs.dev/editor/` share one origin. That is how `header.js`
can read what the editor keeps in the browser: the game data stamps in the browser's
private file storage, and the session the editor's scmjs.dev plugin keeps in
`localStorage`. Signing in or out in the top bar does the same in the editor. A
signed-out visitor's page view asks the server nothing.

## Deploying

Settings ▸ Pages ▸ Deploy from a branch, `main` at `/`. A push is a deploy.

DNS for the apex is one CNAME to `scm-js.github.io`. The zone is on Cloudflare, which
flattens the apex CNAME into A records. Keep the record DNS-only (grey cloud) so GitHub
can issue the certificate.

## Download links

Every link on the page is fixed. The stable downloads use GitHub's
`/releases/latest/download/<name>` redirect, which goes to the newest release that is not
a prerelease. The buttons never need updating and never land on a nightly. The nightly
links name the `nightly` tag, a single prerelease whose files are replaced each night.

The redirect only works with fixed file names. That is why the editor's
`electron-builder.yml` keeps the version out of the asset names. **The file names on this
page and the `artifactName` fields in the editor must change together, or the downloads
break.**

The script at the bottom of `index.html` is optional. It puts the version and date next
to the launch buttons (one anonymous request each to the releases API, which allows 60 an
hour per IP) and marks the table rows for the visitor's platform. Both fail quietly, and
the page reads correctly without them.

## The globe and the stars

`globe.js` is the drawing from the editor's About dialog and splash screen, ported from
`src/components/ui/WireSphere.tsx` and `src/components/splash/starfield.ts` with only the
types removed. It is a copy because this site has no build step and should not depend on
the editor's bundle. It holds still for readers who asked for reduced motion, and stops
while the tab is hidden or the hero has scrolled off.

The stars are one full-width canvas (`#stars`) across the top of the page, drawn in the
same animation loop as the globe and masked away above the launch buttons. `plugins.html`
does not load the script. Readers without JavaScript see the pink gradient on `body`.

## The plugins page

`plugins.html` fetches `scm-js/registry`'s `index.json` from raw.githubusercontent.com
and shows a card per plugin. It is the same index the editor's **Plugins ▸ Browse
Plugins…** reads, so the two match. If the fetch fails, the page says so and links to the
registry.

The index does not record two things:

- Which plugins are on by default. That list is in the editor's
  `src/plugins/defaults.ts` (`DEFAULT_REMOTE_PLUGINS`) and is copied into the `DEFAULTS`
  array in this page's script. Change both together.
- Icon addresses. A manifest's `icon` is usually a file beside it, so the page builds
  `raw.githubusercontent.com/<owner>/<repo>/<commit>/<icon>` from the entry's `repo` and
  `commit`, as the editor's loader does. An emoji is used as it is, and an icon that fails
  to load falls back to the app mark.

## The numbers page

`stats/index.html` reads `api.scmjs.dev/v1/stats` and draws it: the tilesets and sizes of
maps made and opened, edits by layer, undo, units placed, hotkeys, dialogs, the hours people
edit in, map versions, languages and plugins. The server has already added the numbers up
and left out anything too few people sent (ai-server, `src/stats/public.ts`); the page only
draws what it is given. Until the server has `stats.public.enabled` on, it answers 404 and
the page says no numbers are published yet. `?server=http://localhost:<port>` points the page
at a local ai-server.

The counts carry ids (a unit's number, a dialog's id), never names. `stats/names.js` holds
the names the page shows for them, in English and Korean, taken from the editor's own
tables and its `src/i18n/ko.json`. When the editor renames something, regenerate that file
from the editor rather than editing it by hand. An id the file does not know is shown as
the id.

The chart colours are darker steps of the site's gold and teal, checked for colour-blind
separation on the page's dark surfaces. Every chart has a table view under it.

## The Korean pages

`ko/index.html`, `ko/plugins.html` and `ko/stats/index.html` are hand-kept copies of the
English pages. They have the same markup, links, file names and scripts, with the words in
Korean. They are real pages, so search engines index them, and the first two work without
JavaScript (the numbers page needs it to read the numbers). Each pair names the other with
`<link rel="alternate" hreflang>`, English is the `x-default`, and every Korean address is
in the sitemap.

**A change to an English page needs the same change in its Korean copy.**
`node scripts/check-translations.mjs` fails when a pair disagrees on an outside address
(above all the download file names) or on an element id the scripts write into. It
cannot check the words.

The language switch in the top bar shows the other language's name. Nothing redirects.
On the English page, `lang.js` shows a one-line offer of the Korean page to a browser
whose languages include Korean. A click on either language, or closing the offer, is
remembered. A page without a Korean copy has no `hreflang="ko"` link and offers nothing.

These stay in English on the Korean pages, and the Korean footer marks links to them
with `(영문)`:

- each plugin's name, description and tags (the registry is English only)
- the docs site
- the privacy page

Where the Korean pages use words the editor also uses, they take the editor's own Korean
(`src/i18n/ko.json` there), for example 플러그인 찾아보기, 장식물, 로케이션 and
도움말 ▸ 버그 신고 내용 복사.

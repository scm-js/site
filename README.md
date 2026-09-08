# scmjs.dev

The landing page for [scmJS](https://github.com/scm-js/scm-js) — the logo, the two launch
buttons and the download list. No build step: what is committed is what is served.

| | |
| --- | --- |
| `index.html` | the landing page, and the script that enhances it |
| `plugins.html` | the plugin list, read live from the registry |
| `globe.js` | the turning wireframe mark and the starfield behind it — a plain-JS copy of the editor's `WireSphere.tsx` and `starfield.ts` |
| `styles.css` | the editor's own palette (`src/styles/tokens.css` over there) |
| `logo.svg` | the flat mark: shown until `globe.js` runs, and for a reader with no JavaScript |
| `favicon.svg` | that same file with the square |
| `CNAME` | `scmjs.dev`, which is where a branch-served Pages site keeps its custom domain |
| `.nojekyll` | turns off the Jekyll pass such a site otherwise gets |

## Deploying

Settings ▸ Pages ▸ Deploy from a branch, `main` at `/`. A push is a deploy.

DNS for the apex is one CNAME to `scm-js.github.io`. A CNAME at a zone apex is illegal in
plain DNS — the root already carries SOA and NS records and a CNAME cannot sit beside them —
but the zone is on Cloudflare, which flattens the apex record and answers with A records, so
what goes on the wire is legal. Keep it DNS-only (grey cloud) so GitHub can issue the
certificate. Flattening follows GitHub if it ever renumbers the `185.199.108–111.153`
addresses those A records would otherwise pin. It is the same kind of record `docs` and the
editor's `editor` and `nightly.editor` sites already use, so nothing here collides with those.

## Why it is not an app

Every link on the page is fixed. The stable downloads are GitHub's
`/releases/latest/download/<name>` redirect, which resolves to the newest release that is
not a prerelease — so the buttons never need updating and never land on a nightly. That
redirect can only work against a fixed file name, which is why `electron-builder.yml` in
the editor keeps the version out of the asset names: **the file names on this page and the
`artifactName` fields over there are one thing, and changing either alone breaks the
downloads.** The nightly links name the `nightly` tag directly, that release being one
rolling prerelease whose assets are replaced in place.

`globe.js` is the same drawing the About dialog turns over the same sky the splash screen
drifts, ported out of the editor's `src/components/ui/WireSphere.tsx` and five functions of
`src/components/splash/starfield.ts` with only the types removed — same sphere, same fov, same
tumble, same stars, same pink. It is a copy and not a fetch because this site has no build step
and should not depend on the editor's bundle; the drawing does not change. It sits still for a
reader who asked for reduced motion, and stops while the tab is hidden.

The stars are one full-width canvas across the top of the page, drawn in the globe's own rAF loop
rather than a second one and masked away above the launch buttons: the sky is part of the hero,
not a backdrop for the downloads table. It is `#stars` in `index.html` and `.stars` in the
stylesheet, and its count comes from its own area, so the splash's density holds on a phone. The
loop stops when the hero scrolls off. `plugins.html` has no hero and does not load the script, so
it gets none of this. Under the whole thing is the pink `radial-gradient` on `body`, which is
what a reader with no JavaScript sees on its own.

The script at the bottom of `index.html` does two things, both optional: it puts the
version and date next to the launch buttons (one request each to the releases API,
anonymous, 60 an hour per IP) and marks the table rows matching the visitor's platform.
Both are caught on failure and the page reads correctly without either.

## The plugins page

`plugins.html` fetches `scm-js/registry`'s `index.json` from raw.githubusercontent (which
sends `access-control-allow-origin: *` and caches for five minutes) and renders a card per
plugin — the same index the editor's own **Plugins ▸ Browse Plugins…** reads, so the page
cannot drift from what the editor offers. A failed fetch says so and hands over the link
rather than leaving an empty page.

Two things the index does not carry:

- **Which plugins ship switched on.** That lives in the editor's `src/plugins/defaults.ts`
  (`DEFAULT_REMOTE_PLUGINS`), so the five repository names are written into the `DEFAULTS`
  array in this page's script. If that set ever changes, this is the line to edit.
- **Resolved icons.** A manifest's `icon` is usually `icon.svg`, a file beside the manifest,
  so the page builds `raw.githubusercontent.com/<owner>/<repo>/<commit>/<icon>` from the
  entry's own `repo` and `commit` — the same resolution the editor's loader does. An emoji is
  used as it stands, and anything that fails to load falls back to the app mark.

## Before the first numbered release

`releases/latest` answers 404 while `nightly` is the only release there is, so the stable
button keeps its written label and every link in the *Latest release* column 404s. Cutting
`v0.1.0` fixes both with nothing to change here.

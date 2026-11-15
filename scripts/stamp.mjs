// The site's stylesheets and scripts are kept by browsers for hours (Cloudflare sends them with a four-hour lifetime),
// while a page is kept for ten minutes. A page that changed with its stylesheet was then drawn with the old one. So
// every page names its own stylesheets and scripts with `?v=<stamp>`, and a change to any of them is followed by
//
//   node scripts/stamp.mjs
//
// which puts a new stamp (the time, to the minute) on every such address in every page. Nothing reads the stamp: it
// only makes the address new, so the file is fetched again. Outside addresses and the counting script are left alone.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const stamp = process.argv[2] ?? new Date().toISOString().slice(0, 16).replace(/[-T:]/g, "");
const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith(".html")) pages.push(path);
  }
})(root);

let changed = 0;
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  // A stylesheet or script of the site's own: no scheme, not the worker's counting script, any earlier stamp replaced.
  const out = html.replace(/\b(href|src)="((?!https?:|\/\/|\/_e\.js)[^"?#]+\.(?:css|js))(?:\?v=[^"]*)?"/g, (_, attr, path) => `${attr}="${path}?v=${stamp}"`);
  if (out !== html) { writeFileSync(page, out); changed++; }
}
console.log(`stamped ${stamp} in ${changed} of ${pages.length} pages`);

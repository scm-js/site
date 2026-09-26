// The Korean pages under ko/ are hand-kept copies of the English ones. This checks the part of
// them that must not drift: every outside address (above all the download file names, which
// are one thing with the editor's electron-builder.yml) and every id the scripts write into.
// Words are free to differ; links and ids are not.
//
//   node scripts/check-translations.mjs
//
// Exits 1 and names the difference when a pair disagrees.
import { readFileSync } from "node:fs";

const PAIRS = [
  ["index.html", "ko/index.html"],
  ["plugins.html", "ko/plugins.html"],
];

// Addresses that are meant to differ between the two: the page's own address and its
// language alternates, which each page states from its own side.
const OWN = /^https:\/\/scmjs\.dev\//;

function outside(html) {
  return [...html.matchAll(/\b(?:href|src)="(https?:[^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !OWN.test(u))
    .sort();
}
function ids(html) {
  return [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]).sort();
}
function diff(a, b) {
  const count = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
  const ca = count(a), cb = count(b), out = [];
  for (const k of new Set([...a, ...b])) {
    const d = (ca.get(k) || 0) - (cb.get(k) || 0);
    if (d > 0) out.push(`  only in English (${d}×): ${k}`);
    if (d < 0) out.push(`  only in Korean (${-d}×): ${k}`);
  }
  return out;
}

let failed = false;
for (const [en, ko] of PAIRS) {
  const a = readFileSync(en, "utf8"), b = readFileSync(ko, "utf8");
  const problems = [...diff(outside(a), outside(b)), ...diff(ids(a), ids(b))];
  if (problems.length) {
    failed = true;
    console.log(`${en} ↔ ${ko}:\n${problems.join("\n")}`);
  }
}
if (failed) process.exit(1);
console.log(`${PAIRS.length} pairs agree on their addresses and ids.`);

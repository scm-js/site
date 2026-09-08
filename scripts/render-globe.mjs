/**
 * The animation on the GitHub organisation's profile (github.com/scm-js), rendered.
 *
 * A profile README is markdown that GitHub sanitises: no script, no canvas, no stylesheet,
 * so `globe.js` cannot run there and the only thing that can move is an image file. This
 * draws the same globe frame by frame in a headless Chromium and writes an animated PNG.
 *
 *   npm i --no-save playwright        # not a dependency of the site: only this needs it
 *   npx playwright install chromium   # once
 *   node scripts/render-globe.mjs --out ../org/profile/globe.png
 *
 * It calls `globe.js` rather than redrawing the sphere, so the picture on GitHub is this
 * site's globe and cannot drift from it. Two departures, both for a file that has to loop:
 * the turn and the nod are put on one shared period so the last frame runs into the first
 * (on the page they are 18 s and 37 s and only meet after ten minutes), and the starfield
 * is drawn once from a seeded random and then held still, which is also what keeps the file
 * small — every frame after the first stores the globe's square alone, and the sky and the
 * glow around it are written once.
 *
 * The size is the whole design constraint: what a frame costs is the number of pixels in the
 * globe's square that moved, so at 880x280 with a 220px globe, 72 frames come to about a
 * megabyte and everything larger runs away from that. `--scale 2` writes the same picture at
 * two device pixels to the CSS pixel, which is sharper on a dense screen and four times the
 * square, so it wants half the frames or a smaller globe to stay reasonable.
 */
import { writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => { const at = args.indexOf(name); return at === -1 ? fallback : args[at + 1]; };
const OUT = resolve(process.cwd(), opt("--out", "globe.png"));
const BROWSER = opt("--browser", process.env.SCMJS_BROWSER ?? "");
const FRAMES = Number(opt("--frames", 72));
const SECONDS = Number(opt("--seconds", 6));
const SCALE = Number(opt("--scale", 1));

/** CSS pixels; the file is written at SCALE times this and shown at this width. */
const W = 880, H = 280, G = 220;
const BOX = { x: (W - G) / 2, y: (H - G) / 2, width: G, height: G };

const { chromium } = await import("playwright").catch(() => {
  console.error("playwright is not installed. Run: npm i --no-save playwright   (and npx playwright install chromium)");
  process.exit(1);
});

const browser = await chromium.launch({ ...(BROWSER ? { executablePath: BROWSER } : {}), args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
// globe.js paints once and starts no loop for a reader who asked for less motion, which is
// exactly what a renderer driving its own clock wants.
await page.emulateMedia({ reducedMotion: "reduce" });
await page.setContent(
  `<style>html,body{margin:0;background:#12151b}canvas{display:block}</style>` +
  `<canvas id="banner" width="${W * SCALE}" height="${H * SCALE}" style="width:${W}px;height:${H}px"></canvas>` +
  // globe.js draws into these two on load and then leaves them alone; they are here so it
  // finds a page shaped like the site's and hands over its drawing functions.
  `<canvas id="globe" hidden></canvas><canvas id="stars" hidden></canvas>`,
);
await page.addScriptTag({ path: resolve(root, "globe.js") });

await page.evaluate(({ W, H, BOX, SCALE }) => {
  const c = document.getElementById("banner").getContext("2d");
  c.scale(SCALE, SCALE);
  const g = window.scmGlobe;

  // The site's stars are placed with Math.random; seeded here so two runs of this script
  // produce the same sky and a re-render is an empty diff unless the drawing changed.
  let seed = 0x5c3d0b1;
  const real = Math.random;
  Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const stars = g.generateStars(Math.max(30, Math.round((W * H) / 8200)));
  Math.random = real;

  window.drawFrame = (turn) => {
    c.clearRect(0, 0, W, H);
    c.fillStyle = "#12151b";
    c.fillRect(0, 0, W, H);
    // The pink halo the site puts on <body>, sized to this strip rather than to a page.
    c.save();
    c.translate(W / 2, H * 0.42);
    c.scale(1, 0.62);
    const halo = c.createRadialGradient(0, 0, 0, 0, 0, W * 0.5);
    halo.addColorStop(0, "rgba(255,95,162,0.13)");
    halo.addColorStop(1, "rgba(255,95,162,0)");
    c.fillStyle = halo;
    c.fillRect(-W, -W, W * 2, W * 2);
    c.restore();
    // One still sky: the twinkle is a second animation and it would cost every pixel of the
    // strip in every frame, where the globe costs its own square.
    g.drawStars(c, W, H, 0, stars);
    c.save();
    c.translate(BOX.x, BOX.y);
    // One turn and one nod to the loop, so the file joins back onto itself.
    g.drawGlobe(c, BOX.width, BOX.height, turn * Math.PI * 2, 0.32 + 0.14 * Math.sin(turn * Math.PI * 2));
    c.restore();
  };
}, { W, H, BOX, SCALE });

const shots = [];
for (let i = 0; i < FRAMES; i++) {
  await page.evaluate((turn) => window.drawFrame(turn), i / FRAMES);
  // The first frame is the whole strip; the rest replace the globe's square in place.
  shots.push(await page.screenshot({ clip: i === 0 ? { x: 0, y: 0, width: W, height: H } : BOX }));
}
await browser.close();

/* ── the animation ──────────────────────────────────────────────────────────────
   An APNG is a PNG whose extra chunks describe the frames after the first: acTL says how
   many there are, an fcTL before each says where it goes and how long it stays, and fdAT
   carries a later frame's pixels in the format IDAT uses. Chromium's screenshots are
   encoded for speed rather than for size, so they are unpacked here and written again, in
   two passes that between them take about thirty times off the file.

   The first is the palette. The strip is a dark field, one pink hue and a halo, which is a
   palette's best case: 255 colours at a byte a pixel, and the eye cannot find the step.

   The second is that a frame stores only what moved. Every frame after the first is laid
   over what is already on screen rather than replacing it, so a pixel that quantises to the
   colour already there can be left transparent — and a wireframe turning in the middle of a
   still sky leaves most of its own square alone from one frame to the next. Those runs of
   one value are what deflate is best at. */

/** Chromium's screenshot: eight bits a channel, not interlaced, RGB or RGBA. */
function decode(buf) {
  let at = 8, w = 0, h = 0, channels = 0;
  const idat = [];
  while (at < buf.length) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString("ascii", at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error("unexpected screenshot format");
      channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0;
      if (!channels) throw new Error("unexpected screenshot colour type");
    } else if (type === "IDAT") idat.push(data);
    at += len + 12;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = out.subarray(y * stride, (y + 1) * stride);
    const up = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? row[i - channels] : 0;
      const b = up ? up[i] : 0;
      const c = up && i >= channels ? up[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[i] = v;
    }
  }
  return { w, h, channels, pixels: out };
}

const frames = shots.map(decode);

/* Median cut over a histogram of the colours actually drawn, six bits a channel: they sit in
   a narrow band of pink over near-black, so the boxes come out small and the halo comes back
   without a visible step. Index 0 is kept aside to mean "whatever was already here". */

const BITS = 6, LEVELS = 1 << BITS, BINS = LEVELS ** 3;
const bin = (r, g, b) => ((r >> (8 - BITS)) << (BITS * 2)) | ((g >> (8 - BITS)) << BITS) | (b >> (8 - BITS));
const counts = new Uint32Array(BINS);
const sums = new Float64Array(BINS * 3);

for (const f of frames) {
  for (let i = 0; i < f.pixels.length; i += f.channels) {
    const k = bin(f.pixels[i], f.pixels[i + 1], f.pixels[i + 2]);
    counts[k]++;
    sums[k * 3] += f.pixels[i]; sums[k * 3 + 1] += f.pixels[i + 1]; sums[k * 3 + 2] += f.pixels[i + 2];
  }
}

const used = [];
for (let k = 0; k < BINS; k++) if (counts[k]) used.push(k);

const axis = (b, i) => (i === 0 ? b >> (BITS * 2) : i === 1 ? (b >> BITS) & (LEVELS - 1) : b & (LEVELS - 1));
let boxes = [used];
while (boxes.length < 255) {
  // Split the box whose colours are spread furthest, weighted by how much of the picture
  // they cover: a wide box nobody looks at is not worth a palette entry.
  let pick = -1, best = 0, along = 0;
  boxes.forEach((box, at) => {
    if (box.length < 2) return;
    let n = 0;
    for (const k of box) n += counts[k];
    for (let i = 0; i < 3; i++) {
      let lo = LEVELS, hi = -1;
      for (const k of box) { const v = axis(k, i); if (v < lo) lo = v; if (v > hi) hi = v; }
      const score = (hi - lo) * Math.cbrt(n);
      if (score > best) { best = score; pick = at; along = i; }
    }
  });
  if (pick < 0) break;
  const box = boxes[pick].slice().sort((x, y) => axis(x, along) - axis(y, along));
  let total = 0;
  for (const k of box) total += counts[k];
  let half = 0, cut = 0;
  while (cut < box.length - 1 && half < total / 2) half += counts[box[cut++]];
  boxes.splice(pick, 1, box.slice(0, cut), box.slice(cut));
}

const colours = boxes.map((box) => {
  let n = 0, r = 0, g = 0, b = 0;
  for (const k of box) { n += counts[k]; r += sums[k * 3]; g += sums[k * 3 + 1]; b += sums[k * 3 + 2]; }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
});
// Ordered dark to light, so that neighbouring colours have neighbouring indices and a
// gradient reads as a slope rather than as noise to the compressor.
colours.sort((p, q) => (p[0] + p[1] * 2 + p[2]) - (q[0] + q[1] * 2 + q[2]));
const palette = [[0, 0, 0], ...colours];

/** Nearest palette entry for a colour, worked out once per bin and then remembered. */
const nearest = new Int16Array(BINS).fill(-1);
function index(r, g, b) {
  const k = bin(r, g, b);
  if (nearest[k] >= 0) return nearest[k];
  let best = 1, bestD = Infinity;
  for (let i = 1; i < palette.length; i++) {
    const dr = r - palette[i][0], dg = g - palette[i][1], db = b - palette[i][2];
    const d = dr * dr * 2 + dg * dg * 4 + db * db;
    if (d < bestD) { bestD = d; best = i; }
  }
  return (nearest[k] = best);
}

/* An 8x8 ordered dither, nudging each pixel by less than the gap between two palette entries
   before it is matched. Without it the halo comes back as a set of rings. It costs nothing in
   the frames that follow: the pattern belongs to the position rather than to the frame, so a
   pixel that has not moved still quantises to what is already on screen. */
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];
const DITHER = 6;
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

const indices = (f, ox = 0, oy = 0) => {
  const out = new Uint8Array(f.w * f.h);
  for (let y = 0, at = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++, at++) {
      const i = at * f.channels;
      const d = (BAYER[(((y + oy) & 7) << 3) | ((x + ox) & 7)] / 64 - 0.5) * DITHER;
      out[at] = index(clamp(f.pixels[i] + d), clamp(f.pixels[i + 1] + d), clamp(f.pixels[i + 2] + d));
    }
  }
  return out;
};

/** How far a pixel may drift from what is on screen before the frame has to redraw it. */
const TOLERANCE = 300;
function same(a, b) {
  if (a === b) return true;
  const dr = palette[a][0] - palette[b][0], dg = palette[a][1] - palette[b][1], db = palette[a][2] - palette[b][2];
  return dr * dr * 2 + dg * dg * 4 + db * db <= TOLERANCE;
}

/** Rows of palette indices, each behind a filter byte of 0, deflated. */
function deflateRows(idx, w, h) {
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) raw.set(idx.subarray(y * w, (y + 1) * w), y * (w + 1) + 1);
  return deflateSync(raw, { level: 9, memLevel: 9 });
}

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(CRC(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

const delay = Math.round((SECONDS * 1000) / FRAMES);

function fcTL(seq, w, h, x, y, blend) {
  const d = Buffer.alloc(26);
  d.writeUInt32BE(seq, 0);
  d.writeUInt32BE(w, 4); d.writeUInt32BE(h, 8);
  d.writeUInt32BE(x, 12); d.writeUInt32BE(y, 16);
  d.writeUInt16BE(delay, 20); d.writeUInt16BE(1000, 22);
  d[24] = 0;     // dispose: leave the frame in place for the next one to draw over
  d[25] = blend; // 0 replaces what is under it, 1 draws over it
  return chunk("fcTL", d);
}

const head = Buffer.alloc(13);
head.writeUInt32BE(frames[0].w, 0);
head.writeUInt32BE(frames[0].h, 4);
head[8] = 8; head[9] = 3; // eight bits a pixel, indexed

const actl = Buffer.alloc(8);
actl.writeUInt32BE(FRAMES, 0);
actl.writeUInt32BE(0, 4); // play forever

const strip = indices(frames[0]);
const parts = [
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", head),
  chunk("PLTE", Buffer.from(palette.flat())),
  chunk("tRNS", Buffer.from([0])), // index 0, and only that one, is see-through
  chunk("acTL", actl),
  fcTL(0, frames[0].w, frames[0].h, 0, 0, 0),
  chunk("IDAT", deflateRows(strip, frames[0].w, frames[0].h)),
];

// What the globe's square looks like now, carried from frame to frame so each one can be
// written as the difference from it.
const rx = BOX.x * SCALE, ry = BOX.y * SCALE, rw = BOX.width * SCALE, rh = BOX.height * SCALE;
const shown = new Uint8Array(rw * rh);
for (let y = 0; y < rh; y++) shown.set(strip.subarray((ry + y) * frames[0].w + rx, (ry + y) * frames[0].w + rx + rw), y * rw);

let seq = 1, moved = 0;
for (let i = 1; i < FRAMES; i++) {
  // The square is cut out of the middle of the strip, so the dither pattern has to be read
  // from where it sits there rather than from the square's own corner.
  const idx = indices(frames[i], rx, ry);
  for (let at = 0; at < idx.length; at++) {
    if (same(idx[at], shown[at])) idx[at] = 0;
    else { shown[at] = idx[at]; moved++; }
  }
  parts.push(fcTL(seq++, rw, rh, rx, ry, 1));
  const data = deflateRows(idx, rw, rh);
  const body = Buffer.alloc(4 + data.length);
  body.writeUInt32BE(seq++, 0);
  data.copy(body, 4);
  parts.push(chunk("fdAT", body));
}
parts.push(chunk("IEND", Buffer.alloc(0)));

const file = Buffer.concat(parts);
writeFileSync(OUT, file);
console.log(
  `${OUT}  ${frames[0].w}×${frames[0].h}, ${FRAMES} frames over ${SECONDS}s, ` +
  `${(moved / ((FRAMES - 1) * rw * rh) * 100).toFixed(0)}% of the square moves a frame, ` +
  `${(file.length / 1024).toFixed(0)} KB`,
);

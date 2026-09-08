/**
 * The app mark as the About dialog draws it, over the splash screen's own sky: a pink wireframe
 * globe turning on its own rAF loop, with drifting stars behind it.
 *
 * A plain-JavaScript copy of scm-js/scm-js's src/components/ui/WireSphere.tsx and five of the
 * functions those two draw with out of src/components/splash/starfield.ts — the same sphere (16
 * rings, 24 segments), the same tighter-than-the-splash fov, the same slow tumble, the same
 * twinkling drift, the same colours. The types are the only thing taken out. It is a copy rather
 * than a fetch because this site has no build step and nothing here should depend on the editor's
 * bundle; the drawing does not change.
 *
 * logo.svg stays in the markup for anyone without JavaScript, the pink glow behind the hero is
 * CSS and stands on its own, and the whole thing sits still for a reader who asked for reduced
 * motion.
 */
(function () {
  var host = document.getElementById("globe");
  var sky = document.getElementById("stars");
  var ctx = host && host.getContext ? host.getContext("2d") : null;
  var sctx = sky && sky.getContext ? sky.getContext("2d") : null;
  if (!ctx && !sctx) return;

  /* ── starfield.ts ───────────────────────────────────────── */

  var PINK = "255,95,162";
  var PINK_HI = "255,190,220";
  var PINK_DIM = "180,60,110";

  function rotY(v, a) {
    return { x: v.x * Math.cos(a) + v.z * Math.sin(a), y: v.y, z: -v.x * Math.sin(a) + v.z * Math.cos(a) };
  }
  function rotX(v, a) {
    return { x: v.x, y: v.y * Math.cos(a) - v.z * Math.sin(a), z: v.y * Math.sin(a) + v.z * Math.cos(a) };
  }

  function generateStars(count) {
    var stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.3 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0008 + Math.random() * 0.003,
        bright: 0.3 + Math.random() * 0.7,
      });
    }
    return stars;
  }

  /** Twinkling stars with a very slow horizontal parallax and a cross glint on the brightest. */
  function drawStars(c, cw, ch, el, stars) {
    var starDrift = el * 0.000008;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var flicker = 0.5 + 0.5 * Math.sin(el * s.speed + s.phase);
      var a = s.bright * (0.4 + 0.6 * flicker);
      var sx = ((s.x + starDrift * (0.5 + s.bright)) % 1.05) * cw;
      var sy = s.y * ch;
      c.fillStyle = "rgba(" + PINK_HI + "," + a + ")";
      c.beginPath();
      c.arc(sx, sy, s.r, 0, Math.PI * 2);
      c.fill();
      if (s.r > 1.0 && a > 0.5) {
        c.strokeStyle = "rgba(" + PINK_HI + "," + a * 0.3 + ")";
        c.lineWidth = 0.5;
        var gl = s.r * 3;
        c.beginPath();
        c.moveTo(sx - gl, sy); c.lineTo(sx + gl, sy);
        c.moveTo(sx, sy - gl); c.lineTo(sx, sy + gl);
        c.stroke();
      }
    }
  }

  function buildSphere(rings, segs, r) {
    var verts = [], edges = [], i, j;
    for (i = 0; i <= rings; i++) {
      var phi = (Math.PI * i) / rings;
      for (j = 0; j < segs; j++) {
        var th = (2 * Math.PI * j) / segs;
        verts.push({ x: r * Math.sin(phi) * Math.cos(th), y: r * Math.cos(phi), z: r * Math.sin(phi) * Math.sin(th) });
      }
    }
    for (i = 0; i <= rings; i++) {
      for (j = 0; j < segs; j++) {
        var cur = i * segs + j;
        edges.push([cur, i * segs + ((j + 1) % segs)]);
        if (i < rings) edges.push([cur, cur + segs]);
      }
    }
    return { verts: verts, edges: edges, rings: rings, segs: segs };
  }

  function projectSphere(sphere, cx, cy, fov, ay, ax) {
    return sphere.verts.map(function (v) {
      var p = rotX(rotY(v, ay), ax);
      var z = p.z + 4;
      return { x: cx + (p.x * fov) / z, y: cy + (p.y * fov) / z, d: z };
    });
  }

  function drawSphereGlow(c, cx, cy, r) {
    var g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(" + PINK + ",0.12)");
    g.addColorStop(0.5, "rgba(" + PINK_DIM + ",0.04)");
    g.addColorStop(1, "transparent");
    c.fillStyle = g;
    c.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  /** Every edge faded by depth so the far half reads as behind, then the equator retraced brighter. */
  function drawSphereWire(c, sphere, pts, lineWidth) {
    c.lineWidth = lineWidth;
    for (var i = 0; i < sphere.edges.length; i++) {
      var pa = pts[sphere.edges[i][0]], pb = pts[sphere.edges[i][1]];
      var depth = (pa.d + pb.d) / 2;
      var alpha = Math.max(0.02, Math.min(0.45, 0.95 - (depth - 2.75) / 2.2));
      c.strokeStyle = "rgba(" + PINK + "," + alpha + ")";
      c.beginPath();
      c.moveTo(pa.x, pa.y);
      c.lineTo(pb.x, pb.y);
      c.stroke();
    }
    var eq = (sphere.rings >> 1) * sphere.segs;
    c.strokeStyle = "rgba(" + PINK_HI + ",0.35)";
    c.lineWidth = lineWidth * 1.5;
    c.beginPath();
    for (var j = 0; j <= sphere.segs; j++) {
      var p = pts[eq + (j % sphere.segs)];
      if (j === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
    }
    c.stroke();
  }

  /* ── the two drawings ───────────────────────────────────── */

  /** Match the backing store to the element's CSS box at device resolution, and clear it. */
  function fit(canvas, c) {
    var cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return null;
    var dpr = window.devicePixelRatio || 1;
    var w = Math.round(cw * dpr), h = Math.round(ch * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, cw, ch);
    return { w: cw, h: ch };
  }

  // The splash spreads 120 stars over a whole window; this strip is a band across the top of the
  // page, so the count comes from its own area at about that density — a phone gets a sky rather
  // than a crowd. Built once: the coordinates are fractions, so a resize just re-places them.
  var stars = null;

  function paintStars(el) {
    if (!sctx) return;
    var box = fit(sky, sctx);
    if (!box) return;
    if (!stars) stars = generateStars(Math.max(30, Math.min(120, Math.round((box.w * box.h) / 8200))));
    drawStars(sctx, box.w, box.h, el, stars);
  }

  var SPHERE = buildSphere(16, 24, 1.15);

  /** The globe at a given attitude, filling a box of its own: the drawing, with no page in it. */
  function drawGlobe(c, w, h, ay, ax) {
    // A tighter fov than the splash's, so the globe fills its box rather than floating in it.
    var cx = w / 2, cy = h / 2, fov = Math.min(w, h) * 1.55;
    drawSphereGlow(c, cx, cy, Math.min(w, h) * 0.5);
    drawSphereWire(c, SPHERE, projectSphere(SPHERE, cx, cy, fov, ay, ax), 0.7);
  }

  // Slow tumble: mostly spin, with a gentle nod so it never looks like a flat disc.
  function spin(el) { return el * 0.00035; }
  function nod(el) { return 0.32 + 0.14 * Math.sin(el * 0.00017); }

  function paintGlobe(el) {
    if (!ctx) return;
    var box = fit(host, ctx);
    if (!box) return;
    drawGlobe(ctx, box.w, box.h, spin(el), nod(el));
  }

  function paint(el) {
    paintStars(el);
    paintGlobe(el);
  }

  // The animation on the GitHub organisation's profile is rendered from these, by
  // scripts/render-globe.mjs, so that picture is this globe rather than a copy that drifts
  // from it. Nothing on the page reads them.
  window.scmGlobe = { drawGlobe: drawGlobe, drawStars: drawStars, generateStars: generateStars, spin: spin, nod: nod };

  if (ctx) {
    var fallback = document.querySelector(".globe-fallback");
    if (fallback) fallback.remove();
    host.hidden = false;
  }
  if (sctx) sky.hidden = false;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    // Still, but still drawn. The sky is sized in percentages, so unlike the globe it does need
    // repainting when the window changes shape.
    paint(0);
    window.addEventListener("resize", function () { paint(0); });
    return;
  }

  // rAF does not run in a hidden tab, but the elapsed time would still march on and the globe
  // would jump on return; counting frames' own deltas keeps the turn continuous.
  var raf = 0, last = 0, el = 0, onScreen = true;

  function frame(t) {
    if (last) el += Math.min(t - last, 100);
    last = t;
    paint(el);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (raf || document.hidden || !onScreen) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });

  // Both drawings live in the hero. Once it has scrolled off there is nothing to paint, and a
  // reader on the downloads table should not be paying for a canvas above them.
  var hero = document.querySelector(".hero");
  if (hero && window.IntersectionObserver) {
    new window.IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) start(); else stop();
    }).observe(hero);
  }

  start();
})();

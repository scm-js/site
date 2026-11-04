/*
 * The public numbers page (stats/index.html and ko/stats/index.html): reads
 * api.scmjs.dev/v1/stats and draws it. Everything the server sends has already been added up
 * and thinned out there (ai-server, src/stats/public.ts): a value fewer than ten people sent is
 * not in it, every count is rounded to two figures, and nothing is from today. This file only
 * draws what it is given.
 *
 * Every name shown comes from names.js or the tables below; an id the server sends that this
 * page does not know is shown as the id, written with textContent like every other value.
 */
(function () {
  var ko = document.documentElement.lang === "ko";
  var LOCALE = ko ? "ko-KR" : "en-US";
  var N = window.STATS_NAMES || { units: [], commands: {}, dialogs: {} };
  var pick = function (pair) { return pair ? (ko ? pair[1] || pair[0] : pair[0]) : null; };

  var T = ko
    ? {
        loading: "숫자를 불러오는 중…",
        failed: "지금은 숫자를 불러올 수 없습니다. 잠시 뒤 다시 시도하세요.",
        off: "아직 공개된 숫자가 없습니다.",
        last30: "최근 30일",
        all: "{date}부터",
        through: "{from} – {to} (UTC), 매시간 갱신",
        made: "만든 맵",
        opened: "연 맵",
        share: "{n}%",
        empty: "아직 보여 줄 만큼 사람이 많지 않습니다.",
        table: "숫자로 보기",
        other: "기타",
        tilesetGap: "{name}은(는) 사람들이 여는 맵의 {opened}%, 새로 만드는 맵의 {made}%입니다.",
        tilesetSame: "가장 많이 쓰는 지형은 {name}입니다.",
        sizeTop: "가장 흔한 크기는 {size}이고, 정사각형이 아닌 맵이 {odd}%입니다.",
        sizeMade: "만든 맵",
        sizeOpened: "연 맵",
        sizeLegend: "적음 → 많음",
        sizeCell: "{size}: {n}",
        layerTop: "편집의 {n}%가 {layer} 레이어에서 이루어집니다.",
        mirrored: "지형 편집 중 대칭을 켠 비율",
        undo: "편집 100번마다 되돌리기",
        redo: "편집 100번마다 다시 실행",
        undoLine: "편집 100번마다 {undo}번 되돌립니다.",
        unitTop: "가장 많이 배치된 전투 유닛은 {name}입니다.",
        unitsAll: "모든 유닛",
        unitsFight: "전투 유닛만",
        keyShare: "단축키로 실행한 명령의 비율",
        keyLine: "명령의 {n}%를 메뉴가 아닌 단축키로 실행합니다.",
        dialogLine: "가장 많이 여는 대화 상자는 {top}이고, 목록에서 가장 적은 것은 {least}입니다.",
        hourLine: "가장 바쁜 시간은 UTC {h}시입니다.",
        hourAxis: "시 (UTC)",
        hourCell: "UTC {h}시: {n}",
        versionMade: "만든 맵",
        versionOpened: "연 맵",
        name: "이름",
        count: "수",
        hero: { people: "하루 평균 사용자", edits: "편집", made: "새로 만든 맵", opened: "연 맵", saved: "저장", units: "배치한 유닛", tested: "맵 테스트", replays: "연 리플레이" },
        sizeOnly: "가장 흔한 크기는 {size}입니다.",
        hourLocal: "가장 바쁜 시간은 UTC {h}시, 지금 계신 곳 시간으로 {local}입니다.",
        undoOf: "편집 100번마다",
        hotkey: "단축키",
        menu: "메뉴",
        pluginsSame: "모두 같은 수의 사람이 실행했으므로 아직 순위가 없습니다.",
      }
    : {
        loading: "Loading the numbers…",
        failed: "The numbers could not be read just now. Try again in a moment.",
        off: "No numbers are published yet.",
        last30: "Last 30 days",
        all: "Since {date}",
        through: "{from} – {to} (UTC), updated every hour",
        made: "Made",
        opened: "Opened",
        share: "{n}%",
        empty: "Not enough people yet to show this.",
        table: "As a table",
        other: "Other",
        tilesetGap: "{name} is {opened}% of the maps people open and {made}% of the maps they start.",
        tilesetSame: "The most used tileset is {name}.",
        sizeTop: "The most common size is {size}, and {odd}% of maps aren't square.",
        sizeMade: "Made",
        sizeOpened: "Opened",
        sizeLegend: "Fewer → more",
        sizeCell: "{size}: {n}",
        layerTop: "{n}% of edits are on the {layer} layer.",
        mirrored: "Terrain edits made with a mirror on",
        undo: "Undos for every 100 edits",
        redo: "Redos for every 100 edits",
        undoLine: "For every 100 edits, {undo} are undone.",
        unitTop: "The most placed fighting unit is the {name}.",
        unitsAll: "All units",
        unitsFight: "Fighting units",
        keyShare: "Commands run from a hotkey",
        keyLine: "{n}% of commands are run from a hotkey rather than the menu.",
        dialogLine: "{top} is the dialog opened most; {least} is the least opened that shows up here.",
        hourLine: "The busiest hour is {h}:00 UTC.",
        hourAxis: "Hour (UTC)",
        hourCell: "{h}:00 UTC: {n}",
        versionMade: "Made",
        versionOpened: "Opened",
        name: "Name",
        count: "Count",
        hero: { people: "People a day, on average", edits: "Edits", made: "Maps made", opened: "Maps opened", saved: "Saves", units: "Units placed", tested: "Test Map launches", replays: "Replays opened" },
        sizeOnly: "The most common size is {size}.",
        hourLocal: "The busiest hour is {h}:00 UTC, {local} where you are.",
        undoOf: "in every 100 edits",
        hotkey: "Hotkey",
        menu: "Menu",
        pluginsSame: "Each ran for the same number of people, so there is no ranking yet.",
      };

  var TILESETS = {
    badlands: ["Badlands", "배드랜드"], platform: ["Space Platform", "우주 플랫폼"], install: ["Installation", "인스톨레이션"],
    ashworld: ["Ashworld", "애쉬월드"], jungle: ["Jungle World", "정글"], desert: ["Desert", "사막"], ice: ["Ice", "얼음"], twilight: ["Twilight", "트와일라잇"],
  };
  var LAYERS = {
    terrain: ["Terrain", "지형"], doodads: ["Doodads", "장식물"], units: ["Units", "유닛"], sprites: ["Sprites", "스프라이트"],
    locations: ["Locations", "로케이션"], fog: ["Fog of War", "전장의 안개"], clipboard: ["Cut / Copy / Paste", "잘라내기 / 복사 / 붙여넣기"],
    triggers: ["Triggers", "트리거"], settings: ["Settings", "설정"],
  };
  var MODES = { isom: ["Isometric", "아이소메트릭"], rect: ["Rectangular", "사각형"], tile: ["Tile", "타일"], blend: ["Blend", "블렌드"] };
  var MIRRORS = {
    h: ["Left ↔ right", "왼쪽 ↔ 오른쪽"], v: ["Top ↔ bottom", "위 ↔ 아래"], hv: ["Four-way mirror", "4방향 대칭"], rot180: ["Turn 180°", "180° 회전"],
    rot90: ["Turn 90°", "90° 회전"], diag: ["Diagonal", "대각선"], adiag: ["Anti-diagonal", "반대 대각선"],
  };
  var VERSIONS = {
    original: ["Original", "오리지널"], hybrid: ["Hybrid", "하이브리드"], broodwar: ["Brood War", "브루드 워"],
    remasteredHybrid: ["Remastered hybrid", "리마스터 하이브리드"], remastered: ["Remastered", "리마스터"],
  };
  var EXTS = { scm: [".scm", ".scm"], scx: [".scx", ".scx"], chk: [".chk", ".chk"] };
  // Turrets, missiles, larvae, eggs, critters, the map revealer and the like: placed, but not an army.
  var NOT_FIGHTING = [4, 6, 13, 14, 15, 18, 24, 26, 31, 33, 35, 36, 40, 59, 73, 85, 89, 90, 91, 92, 93, 94, 95, 96, 97, 101, 105];

  var languageNames = (function () {
    try { return new Intl.DisplayNames([LOCALE], { type: "language" }); } catch (e) { return null; }
  })();

  function fill(text, params) {
    return text.replace(/\{(\w+)\}/g, function (_, k) { return params[k] == null ? "" : String(params[k]); });
  }
  var numberFormat = new Intl.NumberFormat(LOCALE);
  var compactFormat = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });
  function count(n) { return n >= 10000 ? compactFormat.format(n) : numberFormat.format(n); }
  function day(iso) {
    return new Date(iso + "T00:00:00Z").toLocaleDateString(LOCALE, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  }

  function nameOf(kind, key) {
    if (key === "other") return T.other;
    if (kind === "tileset") return pick(TILESETS[key]) || key;
    if (kind === "layer") return pick(LAYERS[key]) || key;
    if (kind === "mode") return pick(MODES[key]) || key;
    if (kind === "mirror") return pick(MIRRORS[key]) || key;
    if (kind === "version") return pick(VERSIONS[key]) || key;
    if (kind === "ext") return pick(EXTS[key]) || key;
    if (kind === "unit") return pick(N.units[Number(key)]) || "#" + key;
    if (kind === "command") return pick(N.commands[key]) || key;
    if (kind === "dialog") return pick(N.dialogs[key]) || key;
    if (kind === "language") return (languageNames && languageNames.of(key)) || key;
    if (kind === "plugin") return key.replace(/^plugin-/, "");
    return key;
  }

  /* ── Small DOM helpers: every value goes in as text ────────── */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  var SVG = "http://www.w3.org/2000/svg";
  function svg(tag, attrs) {
    var e = document.createElementNS(SVG, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function entries(breakdown) {
    return Object.keys(breakdown || {}).map(function (k) { return [k, breakdown[k]]; }).sort(function (a, b) {
      // "Other" last, whatever its size: it is many small values, not one.
      if (a[0] === "other") return 1;
      if (b[0] === "other") return -1;
      return b[1] - a[1];
    });
  }
  function named(list) { return list.filter(function (e) { return e[0] !== "other"; }); }
  function sum(list) { return list.reduce(function (s, e) { return s + e[1]; }, 0); }
  function pct(n, whole) { return whole > 0 ? Math.round((n / whole) * 100) : 0; }
  function empty() { return el("p", "st-empty", T.empty); }

  /* ── Motion: bars grow, numbers count, once each panel is in view ── */

  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var seen = typeof WeakSet === "function" ? new WeakSet() : null;

  /** Sizes go in as data-w / data-h and numbers as data-count, and are applied here. */
  function play(box) {
    box.querySelectorAll("[data-w]").forEach(function (e) { e.style.width = e.getAttribute("data-w"); });
    box.querySelectorAll("[data-h]").forEach(function (e) { e.style.height = e.getAttribute("data-h"); });
    box.querySelectorAll("[data-on]").forEach(function (e, i) {
      if (still) e.classList.add("is-on");
      else setTimeout(function () { e.classList.add("is-on"); }, 12 * i);
    });
    box.querySelectorAll("[data-count]").forEach(function (e) {
      var to = Number(e.getAttribute("data-count")), shown = e.getAttribute("data-text");
      if (still || !(to > 0)) { e.textContent = shown; return; }
      var t0 = 0;
      (function step(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / 1100);
        e.textContent = k < 1 ? count(Math.round(to * (1 - Math.pow(1 - k, 3)))) : shown;
        if (k < 1) requestAnimationFrame(step);
      })(performance.now());
    });
  }
  var watcher = !still && window.IntersectionObserver
    ? new window.IntersectionObserver(function (list) {
        list.forEach(function (x) {
          if (!x.isIntersecting) return;
          watcher.unobserve(x.target);
          if (seen) seen.add(x.target);
          play(x.target);
        });
      }, { rootMargin: "0px 0px -8% 0px" })
    : null;
  /** A panel already seen plays again at once on a redraw (the bars start from nothing). */
  function reveal(box) {
    if (!watcher || (seen && seen.has(box))) {
      requestAnimationFrame(function () { requestAnimationFrame(function () { play(box); }); });
    } else watcher.observe(box);
  }

  var tip = el("div", "st-tip");
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.appendChild(tip);
  function tipFor(target, value, label) {
    function show() {
      tip.textContent = "";
      tip.appendChild(el("strong", null, value));
      if (label) tip.appendChild(el("span", null, label));
      tip.hidden = false;
      var r = target.getBoundingClientRect();
      var w = tip.offsetWidth;
      tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
      tip.style.top = window.scrollY + r.top - tip.offsetHeight - 8 + "px";
    }
    function hide() { tip.hidden = true; }
    target.addEventListener("pointerenter", show);
    target.addEventListener("pointerleave", hide);
    target.addEventListener("focus", show);
    target.addEventListener("blur", hide);
  }

  /** The table view every chart has, behind a disclosure: the numbers without the picture. */
  function tableOf(rows, headings) {
    var d = el("details", "st-table");
    d.appendChild(el("summary", null, T.table));
    var t = el("table");
    var head = el("tr");
    headings.forEach(function (h) { head.appendChild(el("th", null, h)); });
    t.appendChild(head);
    rows.forEach(function (r) {
      var tr = el("tr");
      r.forEach(function (c, i) { tr.appendChild(el(i === 0 ? "th" : "td", null, c)); });
      t.appendChild(tr);
    });
    d.appendChild(t);
    return d;
  }

  function rail(cls, width) {
    var r = el("span", "st-bar-rail");
    var b = el("span", cls);
    b.setAttribute("data-w", width + "%");
    r.appendChild(b);
    return r;
  }

  /**
   * Ranked bars, one colour: the rank, the name, the bar on a faint rail, the value at its end.
   * `columns` lays a long list out in two, reading down the first and then the second.
   */
  function bars(list, kind, opts) {
    opts = opts || {};
    if (!list.length) return empty();
    var box = el("div", "st-bars" + (opts.rank ? "" : " no-rank"));
    var whole = opts.whole || sum(list);
    var max = list.reduce(function (m, e) { return Math.max(m, e[1]); }, 0);
    var rows = el("div", "st-bars-rows");
    if (opts.columns && list.length > 8) {
      rows.className = "st-bars-rows is-two";
      rows.style.gridTemplateRows = "repeat(" + Math.ceil(list.length / 2) + ", auto)";
    }
    list.forEach(function (e, i) {
      var label = nameOf(kind, e[0]);
      var value = opts.asShare ? fill(T.share, { n: pct(e[1], whole) }) : count(e[1]);
      var row = el("div", "st-bar-row");
      if (opts.rank) row.appendChild(el("span", "st-rank", e[0] === "other" ? "" : String(i + 1).padStart(2, "0")));
      row.appendChild(el("span", "st-bar-name", label));
      var track = el("span", "st-bar-track");
      track.appendChild(rail("st-bar", Math.max(1.5, (e[1] / max) * 100)));
      track.appendChild(el("span", "st-bar-value", value));
      row.appendChild(track);
      rows.appendChild(row);
    });
    box.appendChild(rows);
    box.appendChild(tableOf(list.map(function (e) { return [nameOf(kind, e[0]), count(e[1]), fill(T.share, { n: pct(e[1], whole) })]; }), [T.name, T.count, "%"]));
    return box;
  }

  /** Two series side by side per name — made in gold, opened in teal — as shares of each. */
  function pairedBars(made, opened, kind) {
    var keys = {};
    entries(made).concat(entries(opened)).forEach(function (e) { keys[e[0]] = true; });
    var madeWhole = sum(entries(made)), openedWhole = sum(entries(opened));
    var list = Object.keys(keys).map(function (k) {
      // null, not 0, when a side does not list it: too few people to show, which is not none.
      return [k, made[k] == null ? null : pct(made[k], madeWhole), opened[k] == null ? null : pct(opened[k], openedWhole)];
    }).sort(function (a, b) {
      if (a[0] === "other") return 1;
      if (b[0] === "other") return -1;
      return (b[1] || 0) + (b[2] || 0) - ((a[1] || 0) + (a[2] || 0));
    });
    if (!list.length) return { box: empty(), list: list };
    var box = el("div", "st-bars no-rank");
    var legend = el("div", "st-legend");
    [["st-key-made", T.made], ["st-key-opened", T.opened]].forEach(function (k) {
      var item = el("span", "st-legend-item");
      item.appendChild(el("span", "st-key " + k[0]));
      item.appendChild(document.createTextNode(k[1]));
      legend.appendChild(item);
    });
    box.appendChild(legend);
    var max = list.reduce(function (m, e) { return Math.max(m, e[1], e[2]); }, 1);
    list.forEach(function (e) {
      var row = el("div", "st-bar-row st-pair");
      row.appendChild(el("span", "st-bar-name", nameOf(kind, e[0])));
      var track = el("span", "st-bar-track");
      [["st-bar is-made", e[1]], ["st-bar is-opened", e[2]]].forEach(function (b) {
        var line = el("span", "st-pair-line");
        line.appendChild(rail(b[0], b[1] > 0 ? Math.max(1.5, (b[1] / max) * 100) : 0));
        line.appendChild(el("span", "st-bar-value", b[1] == null ? "–" : fill(T.share, { n: b[1] })));
        track.appendChild(line);
      });
      row.appendChild(track);
      box.appendChild(row);
    });
    var cell = function (n) { return n == null ? "–" : fill(T.share, { n: n }); };
    box.appendChild(tableOf(list.map(function (e) { return [nameOf(kind, e[0]), cell(e[1]), cell(e[2])]; }), [T.name, T.made, T.opened]));
    return { box: box, list: list };
  }

  /**
   * Each size drawn to scale inside a 256 × 256 frame, the largest map there is, with a faint
   * grid every 32 tiles: a row of minimaps, most used first.
   */
  function sizeMaps(breakdown) {
    var all = entries(breakdown);
    var cells = all.filter(function (e) { return /^\d+x\d+$/.test(e[0]); }).slice(0, 7);
    if (!cells.length) return empty();
    var whole = sum(all);
    var box = el("div");
    var grid = el("div", "st-minimaps");
    var other = all.filter(function (e) { return e[0] === "other"; })[0];
    cells.concat(other ? [other] : []).forEach(function (e, i) {
      var isOther = e[0] === "other";
      var card = el("div", "st-minimap" + (i === 0 && !isOther ? " is-top" : "") + (isOther ? " is-other" : ""));
      var pic = svg("svg", { viewBox: "0 0 100 100", "aria-hidden": "true" });
      pic.appendChild(svg("rect", { class: "st-frame", x: 1, y: 1, width: 98, height: 98, rx: 2 }));
      var w = 96, h = 96;
      if (!isOther) {
        var p = e[0].split("x").map(Number);
        w = Math.max(4, (Math.min(256, p[0]) / 256) * 96);
        h = Math.max(4, (Math.min(256, p[1]) / 256) * 96);
      } else { w = 56; h = 56; }
      var x = 50 - w / 2, y = 50 - h / 2;
      if (!isOther) {
        var p2 = e[0].split("x").map(Number);
        for (var gx = 32; gx < p2[0]; gx += 32) { var lx = x + (gx / p2[0]) * w; pic.appendChild(svg("line", { class: "st-map-grid", x1: lx, y1: y, x2: lx, y2: y + h })); }
        for (var gy = 32; gy < p2[1]; gy += 32) { var ly = y + (gy / p2[1]) * h; pic.appendChild(svg("line", { class: "st-map-grid", x1: x, y1: ly, x2: x + w, y2: ly })); }
      }
      pic.appendChild(svg("rect", { class: "st-map", x: x, y: y, width: w, height: h, rx: 1.5 }));
      card.appendChild(pic);
      card.appendChild(el("span", "st-minimap-size", isOther ? T.other : e[0].replace("x", " × ")));
      var share = el("span", "st-minimap-share", fill(T.share, { n: pct(e[1], whole) }));
      share.appendChild(el("small", null, count(e[1])));
      card.appendChild(share);
      card.tabIndex = 0;
      card.setAttribute("aria-label", (isOther ? T.other : e[0].replace("x", " × ")) + ": " + fill(T.share, { n: pct(e[1], whole) }));
      grid.appendChild(card);
    });
    box.appendChild(grid);
    box.appendChild(tableOf(all.map(function (e) { return [e[0] === "other" ? T.other : e[0].replace("x", " × "), count(e[1]), fill(T.share, { n: pct(e[1], whole) })]; }), [T.name, T.count, "%"]));
    return box;
  }

  /** People editing in each UTC hour: 24 columns, the busiest in gold. */
  function hoursChart(hours, busiest) {
    var box = el("div", "st-hours-box");
    var shown = (hours || []).filter(function (h) { return h != null; });
    if (!shown.length) return empty();
    var max = Math.max.apply(null, shown);
    var cols = el("div", "st-hours");
    hours.forEach(function (n, h) {
      var col = el("span", "st-hour" + (h === busiest ? " is-top" : ""));
      var bar = el("span", "st-hour-bar");
      bar.setAttribute("data-h", n ? Math.max(2, (n / max) * 100) + "%" : "0");
      col.appendChild(bar);
      if (n) {
        col.tabIndex = 0;
        col.setAttribute("aria-label", fill(T.hourCell, { h: h, n: count(n) }));
        tipFor(col, count(n), fill(T.hourCell, { h: h, n: "" }).replace(/:\s*$/, ""));
      }
      cols.appendChild(col);
    });
    box.appendChild(cols);
    var axis = el("div", "st-hours-axis");
    [0, 3, 6, 9, 12, 15, 18, 21].forEach(function (h) {
      var t = el("span", null, String(h).padStart(2, "0"));
      // Under the middle of its column, so the labels line up with the bars.
      t.style.left = ((h + 0.5) / 24) * 100 + "%";
      axis.appendChild(t);
    });
    box.appendChild(axis);
    box.appendChild(el("p", "note", T.hourAxis));
    box.appendChild(tableOf(hours.map(function (n, h) { return [h + ":00", n == null ? "–" : count(n)]; }), [T.hourAxis, T.count]));
    return box;
  }

  /** A big number with its label: gold when it is the panel's point, quieter beside it. */
  function big(value, label, small, suffix) {
    var b = el("div", "st-big" + (small ? " is-small" : "") + (value == null ? " is-empty" : ""));
    var v = el("span", "st-big-value", value == null ? "–" : value);
    if (value != null && suffix) v.appendChild(el("small", null, suffix));
    b.appendChild(v);
    b.appendChild(el("span", "st-big-label", label));
    return b;
  }

  /** A headline number for the row under the hero; it counts up from nothing when shown. */
  function heroNum(label, n) {
    var t = el("div", "st-hero-num");
    var v = el("span", "st-hero-value", count(0));
    v.setAttribute("data-count", String(n));
    v.setAttribute("data-text", count(n));
    t.appendChild(v);
    t.appendChild(el("span", "st-hero-label", label));
    return t;
  }

  /** "Ctrl+Shift+S" as three keycaps. */
  function combo(keys) {
    var c = el("span", "st-combo");
    (keys || "").split("+").filter(Boolean).forEach(function (k) { c.appendChild(el("kbd", "st-cap", k)); });
    return c;
  }

  /* ── The page ───────────────────────────────────────────── */

  var root = document.getElementById("stats");
  var status = document.getElementById("stats-status");
  var filters = document.getElementById("stats-filters");
  var picker = document.getElementById("stats-window");
  var range = document.getElementById("stats-range");

  function slot(id) {
    var s = document.getElementById(id);
    s.textContent = "";
    return s;
  }
  /** The headline sentence, its numbers and names in gold. Every part goes in as text. */
  function headline(id, text, params) {
    var h = document.getElementById(id);
    h.textContent = "";
    if (!text) return;
    var at = 0;
    text.replace(/\{(\w+)\}/g, function (m, k, i) {
      h.appendChild(document.createTextNode(text.slice(at, i)));
      h.appendChild(el("strong", null, params[k] == null ? "" : String(params[k])));
      at = i + m.length;
      return m;
    });
    h.appendChild(document.createTextNode(text.slice(at)));
  }

  function draw(stats, which) {
    var w = stats.windows[which];
    range.textContent = fill(T.through, { from: day(w.from), to: day(w.to) });

    // The headline numbers: only those with enough people behind them, the rest wait.
    var tiles = slot("st-tiles");
    // The server sends each day's people added up (the visitor code changes daily, so nothing
    // can say two days' visits are one person's); over the days counted that is a daily average.
    var first = stats.since && stats.since > w.from ? stats.since : w.from;
    var days = Math.round((Date.parse(w.to) - Date.parse(first)) / 86400000) + 1;
    [
      [T.hero.people, days > 0 ? Math.round(w.people / days) : null],
      [T.hero.edits, w.totals.edits],
      [T.hero.made, w.totals.made],
      [T.hero.opened, w.totals.opened],
      [T.hero.saved, w.totals.saved],
      // Below the threshold the server sends 0 and no breakdown: not enough people yet, not none.
      [T.hero.units, w.units.total > 0 ? w.units.total : null],
      [T.hero.tested, w.totals.tested],
      [T.hero.replays, w.totals.replays],
    ].forEach(function (x) { if (x[1] != null && x[1] > 0) tiles.appendChild(heroNum(x[0], x[1])); });
    reveal(tiles);

    // 1. Made vs opened.
    var pair = pairedBars(w.made.tileset, w.opened.tileset, "tileset");
    slot("st-tilesets").appendChild(pair.box);
    // A gap only between tilesets shown on both sides: one missing from the made list has too
    // few people behind it to show, which is not the same as none.
    var both = pair.list.filter(function (e) { return e[0] !== "other" && w.made.tileset[e[0]] != null && w.opened.tileset[e[0]] != null; });
    var gap = both.slice().sort(function (a, b) { return Math.abs(b[1] - b[2]) - Math.abs(a[1] - a[2]); })[0];
    var topOpened = named(entries(w.opened.tileset))[0] || named(entries(w.made.tileset))[0];
    if (gap && Math.abs(gap[1] - gap[2]) >= 5) headline("st-tilesets-line", T.tilesetGap, { name: nameOf("tileset", gap[0]), made: gap[1], opened: gap[2] });
    else headline("st-tilesets-line", topOpened ? T.tilesetSame : "", { name: topOpened && nameOf("tileset", topOpened[0]) });

    // 2. Sizes, made or opened.
    var sizeSlot = slot("st-sizes");
    var sizeTabs = el("div", "st-tabs");
    var sizeBody = el("div");
    function sizes(which2) {
      sizeBody.textContent = "";
      sizeBody.appendChild(sizeMaps(w[which2].size));
      var list = named(entries(w[which2].size)).filter(function (e) { return /^\d+x\d+$/.test(e[0]); });
      var odd = list.filter(function (e) { var p = e[0].split("x"); return p[0] !== p[1]; });
      var all = sum(entries(w[which2].size));
      if (!list.length) headline("st-sizes-line", "");
      // Only a share of named sizes: "other" may hide any shape.
      else if (odd.length) headline("st-sizes-line", T.sizeTop, { size: list[0][0].replace("x", " × "), odd: pct(sum(odd), all) });
      else headline("st-sizes-line", T.sizeOnly, { size: list[0][0].replace("x", " × ") });
    }
    var firstSizes = named(entries(w.made.size)).length ? "made" : "opened";
    [["made", T.sizeMade], ["opened", T.sizeOpened]].forEach(function (s2) {
      var b = el("button", "st-tab", s2[1]);
      b.type = "button";
      b.setAttribute("aria-pressed", s2[0] === firstSizes ? "true" : "false");
      b.addEventListener("click", function () {
        sizeTabs.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        sizes(s2[0]);
      });
      sizeTabs.appendChild(b);
    });
    sizeSlot.appendChild(sizeTabs);
    sizeSlot.appendChild(sizeBody);
    sizes(firstSizes);

    // 3. Where the work goes.
    var layers = entries(w.edits.layer);
    slot("st-layers").appendChild(bars(layers, "layer", { asShare: true, rank: true }));
    slot("st-modes").appendChild(bars(entries(w.edits.terrainMode), "mode", { asShare: true }));
    var mirrorSlot = slot("st-mirror");
    var mirrors = entries(w.edits.mirror);
    if (w.edits.mirrored == null && !mirrors.length) mirrorSlot.appendChild(empty());
    else {
      mirrorSlot.appendChild(big(w.edits.mirrored == null ? null : fill(T.share, { n: Math.round(w.edits.mirrored * 100) }), T.mirrored, true));
      if (mirrors.length) mirrorSlot.appendChild(bars(mirrors, "mirror", { asShare: true }));
    }
    var topLayer = named(layers)[0];
    headline("st-layers-line", topLayer ? T.layerTop : "", { n: topLayer && pct(topLayer[1], sum(layers)), layer: topLayer && nameOf("layer", topLayer[0]) });

    // 4. Undo: a hundred edits, the ones undone lit.
    var undo = slot("st-undo");
    if (w.undoPer100 == null) undo.appendChild(empty());
    else {
      var u = el("div", "st-undo");
      var dots = el("div", "st-dots");
      dots.setAttribute("aria-hidden", "true");
      for (var d = 0; d < 100; d++) {
        var dot = el("span", "st-dot");
        if (d < Math.min(100, w.undoPer100)) dot.setAttribute("data-on", "");
        dots.appendChild(dot);
      }
      u.appendChild(dots);
      var nums = el("div", "st-big-col");
      nums.appendChild(big(numberFormat.format(w.undoPer100), T.undoOf, false));
      var redo = big(w.redoPer100 == null ? null : numberFormat.format(w.redoPer100), T.redo, true);
      redo.style.marginTop = "18px";
      nums.appendChild(redo);
      u.appendChild(nums);
      undo.appendChild(u);
    }
    headline("st-undo-line", w.undoPer100 == null ? "" : T.undoLine, { undo: w.undoPer100 });

    // 5. Units.
    var units = entries(w.units.byUnit);
    var fighting = units.filter(function (e) { var id = Number(e[0]); return e[0] !== "other" && id < 106 && NOT_FIGHTING.indexOf(id) === -1; });
    var unitSlot = slot("st-units");
    var a = el("div", "st-col"), b2 = el("div", "st-col");
    a.appendChild(el("h3", null, T.unitsAll));
    a.appendChild(bars(named(units).slice(0, 10), "unit", { rank: true }));
    b2.appendChild(el("h3", null, T.unitsFight));
    b2.appendChild(bars(fighting.slice(0, 10), "unit", { rank: true }));
    unitSlot.appendChild(a);
    unitSlot.appendChild(b2);
    headline("st-units-line", fighting.length ? T.unitTop : "", { name: fighting.length && nameOf("unit", fighting[0][0]) });

    // 6. Keyboard: one bar split between hotkeys and the menu, then the keys themselves.
    var keySlot = slot("st-keys");
    var share = w.keyboard.share == null ? null : Math.round(w.keyboard.share * 100);
    var cmds = named(entries(w.keyboard.commands)).slice(0, 6);
    if (share == null && !cmds.length) keySlot.appendChild(empty());
    if (share != null) {
      var split = el("div", "st-split");
      var part = el("span", "st-split-part");
      part.setAttribute("data-w", share + "%");
      split.appendChild(part);
      keySlot.appendChild(split);
      var lg = el("div", "st-split-legend");
      var l1 = el("span"); l1.appendChild(el("strong", null, fill(T.share, { n: share }))); l1.appendChild(document.createTextNode(" " + T.hotkey));
      var l2 = el("span"); l2.appendChild(document.createTextNode(T.menu + " ")); l2.appendChild(el("strong", null, fill(T.share, { n: 100 - share })));
      lg.appendChild(l1);
      lg.appendChild(l2);
      keySlot.appendChild(lg);
    }
    if (cmds.length) {
      var caps = el("div", "st-keycaps");
      cmds.forEach(function (e) {
        var row = el("div", "st-keyrow");
        row.appendChild(combo(N.keys && N.keys[e[0]]));
        row.appendChild(el("span", "st-keyrow-name", nameOf("command", e[0])));
        row.appendChild(el("span", "st-keyrow-value", count(e[1])));
        caps.appendChild(row);
      });
      keySlot.appendChild(caps);
      keySlot.appendChild(tableOf(entries(w.keyboard.commands).map(function (e) { return [nameOf("command", e[0]), count(e[1])]; }), [T.name, T.count]));
    }
    headline("st-keys-line", share == null ? "" : T.keyLine, { n: share });

    // 7. Dialogs: all of them, in two columns, so the least opened in the headline is in view.
    var dialogs = named(entries(w.dialogs));
    slot("st-dialogs").appendChild(bars(dialogs, "dialog", { rank: true, columns: true }));
    headline("st-dialogs-line", dialogs.length > 1 ? T.dialogLine : "", { top: dialogs.length && nameOf("dialog", dialogs[0][0]), least: dialogs.length && nameOf("dialog", dialogs[dialogs.length - 1][0]) });

    // 8. Hours, and the busiest one in the reader's own time.
    var busiest = (w.hours || []).reduce(function (best, n, h) { return n != null && (best < 0 || n > w.hours[best]) ? h : best; }, -1);
    slot("st-hours").appendChild(hoursChart(w.hours, busiest));
    if (busiest < 0) headline("st-hours-line", "");
    else {
      var at = new Date(Date.UTC(2026, 0, 1, busiest));
      var local = at.toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });
      if (at.getHours() === busiest && at.getMinutes() === 0) headline("st-hours-line", T.hourLine, { h: busiest });
      else headline("st-hours-line", T.hourLocal, { h: busiest, local: local });
    }

    // 9. Formats, languages, plugins.
    var versions = pairedBars(w.made.version, w.opened.version, "version");
    slot("st-versions").appendChild(versions.box);
    slot("st-exts").appendChild(bars(entries(w.opened.ext), "ext", { asShare: true }));
    slot("st-languages").appendChild(bars(entries(w.languages), "language", { asShare: true }));
    var plugins = named(entries(w.plugins));
    var pluginSlot = slot("st-plugins");
    var same = plugins.length > 1 && plugins.every(function (e) { return e[1] === plugins[0][1]; });
    if (same) {
      // Bars of one length say nothing; the names are still worth a look.
      var chips = el("div", "st-chips");
      plugins.forEach(function (e) { chips.appendChild(el("span", "st-chip", nameOf("plugin", e[0]))); });
      pluginSlot.appendChild(chips);
      pluginSlot.appendChild(el("p", "note", T.pluginsSame));
    } else pluginSlot.appendChild(bars(plugins.slice(0, 10), "plugin"));

    document.querySelectorAll("#stats .st-card").forEach(reveal);
  }

  // The server's address: api.scmjs.dev, or one named in ?server= when it is this machine (for
  // trying the page against a local ai-server).
  var server = "https://api.scmjs.dev";
  var asked = new URLSearchParams(location.search).get("server");
  if (asked && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(asked)) server = asked;

  status.textContent = T.loading;
  fetch(server + "/v1/stats")
    .then(function (r) {
      if (r.status === 404) return Promise.reject("off");
      return r.ok ? r.json() : Promise.reject(r.status);
    })
    .then(function (stats) {
      status.hidden = true;
      filters.hidden = false;
      root.hidden = false;
      var buttons = [["last30", T.last30], ["all", fill(T.all, { date: stats.since ? day(stats.since) : "" })]];
      buttons.forEach(function (b, i) {
        var btn = el("button", "st-tab", b[1]);
        btn.type = "button";
        btn.setAttribute("aria-pressed", i === 0 ? "true" : "false");
        btn.addEventListener("click", function () {
          picker.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === btn ? "true" : "false"); });
          root.classList.add("is-redrawing");
          draw(stats, b[0]);
          root.classList.remove("is-redrawing");
        });
        picker.appendChild(btn);
      });
      draw(stats, "last30");
    })
    .catch(function (why) {
      status.textContent = why === "off" ? T.off : T.failed;
    });
})();

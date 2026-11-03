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
        tiles: { people: "편집기 사용(사람·일)", made: "새로 만든 맵", opened: "연 맵", units: "배치한 유닛", tested: "맵 테스트", replays: "연 리플레이" },
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
      }
    : {
        loading: "Loading the numbers…",
        failed: "The numbers could not be read just now. Try again in a moment.",
        off: "No numbers are published yet.",
        last30: "Last 30 days",
        all: "Since {date}",
        through: "{from} – {to} (UTC), updated every hour",
        tiles: { people: "Person-days in the editor", made: "Maps made", opened: "Maps opened", units: "Units placed", tested: "Test Map launches", replays: "Replays opened" },
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
  function entries(breakdown) {
    return Object.keys(breakdown || {}).map(function (k) { return [k, breakdown[k]]; }).sort(function (a, b) {
      // "Other" last, whatever its size: it is many small values, not one.
      if (a[0] === "other") return 1;
      if (b[0] === "other") return -1;
      return b[1] - a[1];
    });
  }
  function sum(list) { return list.reduce(function (s, e) { return s + e[1]; }, 0); }
  function pct(n, whole) { return whole > 0 ? Math.round((n / whole) * 100) : 0; }

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

  /** Ranked bars, one colour: the name, the bar, the value at its tip. */
  function bars(list, kind, opts) {
    opts = opts || {};
    var box = el("div", "st-bars");
    if (!list.length) { box.appendChild(el("p", "dim", T.empty)); return box; }
    var whole = opts.whole || sum(list);
    var max = list.reduce(function (m, e) { return Math.max(m, e[1]); }, 0);
    list.forEach(function (e) {
      var label = nameOf(kind, e[0]);
      var value = opts.asShare ? fill(T.share, { n: pct(e[1], whole) }) : count(e[1]);
      var row = el("div", "st-bar-row");
      row.appendChild(el("span", "st-bar-name", label));
      var track = el("span", "st-bar-track");
      var bar = el("span", "st-bar");
      bar.style.width = Math.max(1, (e[1] / max) * 100) + "%";
      track.appendChild(bar);
      track.appendChild(el("span", "st-bar-value", value));
      row.appendChild(track);
      box.appendChild(row);
    });
    box.appendChild(tableOf(list.map(function (e) { return [nameOf(kind, e[0]), count(e[1]), fill(T.share, { n: pct(e[1], whole) })]; }), [T.name, T.count, "%"]));
    return box;
  }

  /** Two series side by side per name — made in gold, opened in teal — as shares of each. */
  function pairedBars(made, opened, kind) {
    var box = el("div", "st-bars");
    var keys = {};
    entries(made).concat(entries(opened)).forEach(function (e) { keys[e[0]] = true; });
    var madeWhole = sum(entries(made)), openedWhole = sum(entries(opened));
    var list = Object.keys(keys).map(function (k) {
      return [k, pct(made[k] || 0, madeWhole), pct(opened[k] || 0, openedWhole)];
    }).sort(function (a, b) {
      if (a[0] === "other") return 1;
      if (b[0] === "other") return -1;
      return b[1] + b[2] - (a[1] + a[2]);
    });
    if (!list.length) { box.appendChild(el("p", "dim", T.empty)); return box; }
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
      [["st-bar is-made", e[1], T.made], ["st-bar is-opened", e[2], T.opened]].forEach(function (b) {
        var line = el("span", "st-pair-line");
        var bar = el("span", b[0]);
        bar.style.width = (b[1] > 0 ? Math.max(1, (b[1] / max) * 100) : 0) + "%";
        line.appendChild(bar);
        line.appendChild(el("span", "st-bar-value", fill(T.share, { n: b[1] })));
        track.appendChild(line);
      });
      row.appendChild(track);
      box.appendChild(row);
    });
    box.appendChild(tableOf(list.map(function (e) { return [nameOf(kind, e[0]), fill(T.share, { n: e[1] }), fill(T.share, { n: e[2] })]; }), [T.name, T.made, T.opened]));
    return { box: box, list: list };
  }

  /** Width × height, one teal hue from faint to bright in five steps. */
  function sizeGrid(breakdown) {
    var box = el("div", "st-grid-box");
    var cells = entries(breakdown).filter(function (e) { return /^\d+x\d+$/.test(e[0]); });
    if (!cells.length) { box.appendChild(el("p", "dim", T.empty)); return box; }
    var ws = {}, hs = {}, at = {};
    cells.forEach(function (e) {
      var p = e[0].split("x");
      ws[p[0]] = true; hs[p[1]] = true; at[e[0]] = e[1];
    });
    var byNum = function (a, b) { return a - b; };
    var widths = Object.keys(ws).map(Number).sort(byNum), heights = Object.keys(hs).map(Number).sort(byNum);
    var max = cells.reduce(function (m, e) { return Math.max(m, e[1]); }, 0);
    var grid = el("div", "st-grid");
    grid.style.gridTemplateColumns = "auto repeat(" + widths.length + ", minmax(24px, 56px))";
    grid.appendChild(el("span", "st-grid-corner", "↓ × →"));
    widths.forEach(function (w) { grid.appendChild(el("span", "st-grid-head", String(w))); });
    heights.forEach(function (h) {
      grid.appendChild(el("span", "st-grid-head", String(h)));
      widths.forEach(function (w) {
        var key = w + "x" + h, n = at[key];
        var cell = el("span", "st-cell");
        if (n) {
          cell.className = "st-cell step-" + Math.min(5, Math.ceil((n / max) * 5));
          cell.tabIndex = 0;
          cell.setAttribute("aria-label", fill(T.sizeCell, { size: w + " × " + h, n: count(n) }));
          tipFor(cell, count(n), w + " × " + h);
        }
        grid.appendChild(cell);
      });
    });
    box.appendChild(grid);
    var legend = el("div", "st-ramp");
    legend.appendChild(el("span", null, T.sizeLegend));
    for (var i = 1; i <= 5; i++) legend.appendChild(el("span", "st-cell step-" + i));
    box.appendChild(legend);
    box.appendChild(tableOf(cells.map(function (e) { return [e[0].replace("x", " × "), count(e[1])]; }), [T.name, T.count]));
    return box;
  }

  /** People editing in each UTC hour: 24 columns. */
  function hoursChart(hours) {
    var box = el("div", "st-hours-box");
    var shown = (hours || []).filter(function (h) { return h != null; });
    if (!shown.length) { box.appendChild(el("p", "dim", T.empty)); return box; }
    var max = Math.max.apply(null, shown);
    var cols = el("div", "st-hours");
    hours.forEach(function (n, h) {
      var col = el("span", "st-hour");
      var bar = el("span", "st-hour-bar");
      bar.style.height = n ? Math.max(2, (n / max) * 100) + "%" : "0";
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
    [0, 6, 12, 18, 23].forEach(function (h) {
      var t = el("span", null, String(h));
      // Under the middle of its column, so the last label stays inside the chart.
      t.style.left = ((h + 0.5) / 24) * 100 + "%";
      axis.appendChild(t);
    });
    box.appendChild(axis);
    box.appendChild(el("p", "note", T.hourAxis));
    box.appendChild(tableOf(hours.map(function (n, h) { return [h + ":00", n == null ? "–" : count(n)]; }), [T.hourAxis, T.count]));
    return box;
  }

  function tile(label, value) {
    var t = el("div", "st-tile");
    t.appendChild(el("span", "st-tile-value", value == null ? "–" : value));
    t.appendChild(el("span", "st-tile-label", label));
    return t;
  }

  /* ── The page ───────────────────────────────────────────── */

  var root = document.getElementById("stats");
  var status = document.getElementById("stats-status");
  var picker = document.getElementById("stats-window");
  var range = document.getElementById("stats-range");

  function slot(id) {
    var s = document.getElementById(id);
    s.textContent = "";
    return s;
  }
  function headline(id, text) { document.getElementById(id).textContent = text || ""; }

  function draw(stats, which) {
    var w = stats.windows[which];
    range.textContent = fill(T.through, { from: day(w.from), to: day(w.to) });

    var tiles = slot("st-tiles");
    tiles.appendChild(tile(T.tiles.people, count(w.people)));
    tiles.appendChild(tile(T.tiles.made, w.totals.made == null ? null : count(w.totals.made)));
    tiles.appendChild(tile(T.tiles.opened, w.totals.opened == null ? null : count(w.totals.opened)));
    tiles.appendChild(tile(T.tiles.units, count(w.units.total)));
    tiles.appendChild(tile(T.tiles.tested, w.totals.tested == null ? null : count(w.totals.tested)));
    tiles.appendChild(tile(T.tiles.replays, w.totals.replays == null ? null : count(w.totals.replays)));

    // 1. Made vs opened.
    var pair = pairedBars(w.made.tileset, w.opened.tileset, "tileset");
    slot("st-tilesets").appendChild(pair.box || pair);
    var gaps = (pair.list || []).filter(function (e) { return e[0] !== "other"; });
    var gap = gaps.slice().sort(function (a, b) { return Math.abs(b[1] - b[2]) - Math.abs(a[1] - a[2]); })[0];
    headline("st-tilesets-line", gap ? (Math.abs(gap[1] - gap[2]) >= 5 ? fill(T.tilesetGap, { name: nameOf("tileset", gap[0]), made: gap[1], opened: gap[2] }) : fill(T.tilesetSame, { name: nameOf("tileset", gaps[0][0]) })) : "");

    // 2. Sizes.
    var sizeSlot = slot("st-sizes");
    var sizeTabs = el("div", "st-tabs");
    var sizeBody = el("div");
    [["made", T.sizeMade], ["opened", T.sizeOpened]].forEach(function (s, i) {
      var b = el("button", "st-tab", s[1]);
      b.type = "button";
      b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      b.addEventListener("click", function () {
        sizeTabs.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        sizeBody.textContent = "";
        sizeBody.appendChild(sizeGrid(w[s[0]].size));
      });
      sizeTabs.appendChild(b);
    });
    sizeSlot.appendChild(sizeTabs);
    sizeSlot.appendChild(sizeBody);
    sizeBody.appendChild(sizeGrid(w.made.size));
    var sizes = entries(w.made.size).filter(function (e) { return e[0] !== "other"; });
    var all = sum(entries(w.made.size));
    var odd = sizes.filter(function (e) { var p = e[0].split("x"); return p[0] !== p[1]; });
    headline("st-sizes-line", sizes.length ? fill(T.sizeTop, { size: sizes[0][0].replace("x", " × "), odd: pct(sum(odd), all) }) : "");

    // 3. Where the work goes.
    var layers = entries(w.edits.layer);
    slot("st-layers").appendChild(bars(layers, "layer", { asShare: true }));
    slot("st-modes").appendChild(bars(entries(w.edits.terrainMode), "mode", { asShare: true }));
    var mirrorSlot = slot("st-mirror");
    mirrorSlot.appendChild(tile(T.mirrored, w.edits.mirrored == null ? null : fill(T.share, { n: Math.round(w.edits.mirrored * 100) })));
    mirrorSlot.appendChild(bars(entries(w.edits.mirror), "mirror", { asShare: true }));
    var topLayer = layers.filter(function (e) { return e[0] !== "other"; })[0];
    headline("st-layers-line", topLayer ? fill(T.layerTop, { n: pct(topLayer[1], sum(layers)), layer: nameOf("layer", topLayer[0]) }) : "");

    // 4. Undo.
    var undo = slot("st-undo");
    undo.appendChild(tile(T.undo, w.undoPer100 == null ? null : numberFormat.format(w.undoPer100)));
    undo.appendChild(tile(T.redo, w.redoPer100 == null ? null : numberFormat.format(w.redoPer100)));
    headline("st-undo-line", w.undoPer100 == null ? "" : fill(T.undoLine, { undo: w.undoPer100 }));

    // 5. Units.
    var units = entries(w.units.byUnit);
    var fighting = units.filter(function (e) { var id = Number(e[0]); return e[0] !== "other" && id < 106 && NOT_FIGHTING.indexOf(id) === -1; });
    var unitSlot = slot("st-units");
    var a = el("div", "st-col"), b2 = el("div", "st-col");
    a.appendChild(el("h3", null, T.unitsAll));
    a.appendChild(bars(units.filter(function (e) { return e[0] !== "other"; }).slice(0, 10), "unit"));
    b2.appendChild(el("h3", null, T.unitsFight));
    b2.appendChild(bars(fighting.slice(0, 10), "unit"));
    unitSlot.appendChild(a);
    unitSlot.appendChild(b2);
    headline("st-units-line", fighting.length ? fill(T.unitTop, { name: nameOf("unit", fighting[0][0]) }) : "");

    // 6. Keyboard.
    var keySlot = slot("st-keys");
    keySlot.appendChild(tile(T.keyShare, w.keyboard.share == null ? null : fill(T.share, { n: Math.round(w.keyboard.share * 100) })));
    keySlot.appendChild(bars(entries(w.keyboard.commands).slice(0, 8), "command"));
    headline("st-keys-line", w.keyboard.share == null ? "" : fill(T.keyLine, { n: Math.round(w.keyboard.share * 100) }));

    // 7. Dialogs.
    var dialogs = entries(w.dialogs).filter(function (e) { return e[0] !== "other"; });
    slot("st-dialogs").appendChild(bars(dialogs.slice(0, 10), "dialog"));
    headline("st-dialogs-line", dialogs.length > 1 ? fill(T.dialogLine, { top: nameOf("dialog", dialogs[0][0]), least: nameOf("dialog", dialogs[dialogs.length - 1][0]) }) : "");

    // 8. Hours.
    slot("st-hours").appendChild(hoursChart(w.hours));
    var busiest = (w.hours || []).reduce(function (best, n, h) { return n != null && (best < 0 || n > w.hours[best]) ? h : best; }, -1);
    headline("st-hours-line", busiest >= 0 ? fill(T.hourLine, { h: busiest }) : "");

    // 9. Formats, languages, plugins.
    var versions = pairedBars(w.made.version, w.opened.version, "version");
    slot("st-versions").appendChild(versions.box || versions);
    slot("st-exts").appendChild(bars(entries(w.opened.ext), "ext", { asShare: true }));
    slot("st-languages").appendChild(bars(entries(w.languages), "language", { asShare: true }));
    slot("st-plugins").appendChild(bars(entries(w.plugins).slice(0, 10), "plugin"));
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
      status.className = "note";
      status.textContent = why === "off" ? T.off : T.failed;
    });
})();

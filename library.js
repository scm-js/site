/*
 * The account's maps and replays, on the library page and (the replays alone) on the Replays page.
 *
 * Everything is asked of the server as the signed-in account (header.js: `scmjsSite.call`), and
 * only once someone is signed in: a signed-out page view asks the server nothing. A row's
 * buttons fetch the file and open it in the editor or the play page (open.js: `go`), in this
 * tab where the browser's file storage can pass it along, in a new tab otherwise. Its
 * `Copy link` copies the item's link, making one first when it has none: a map's opens a copy
 * in the editor (`/editor/map/<token>`, as the editor's scmjs.dev plugin makes it), a
 * replay's opens the analysis (`/replay/<token>`).
 *
 * The library page also keeps files: a map or a replay dropped anywhere on it, or chosen with
 * `Add a file…`, is uploaded to the account (`POST /v1/maps`, `POST /v1/replays`) and put at
 * the top of its list, marked for a moment. A map goes up without the `meta` the editor
 * works out (scenario name, tileset, thumbnail): the server takes it without, and names it
 * by its file. Signed out, a drop says to sign in, and the file is kept once someone is.
 */
(function () {
  var site = (window.scmjsSite = window.scmjsSite || {});
  var $ = function (id) { return document.getElementById(id); };
  var ko = document.documentElement.lang === "ko";
  var T = ko
    ? {
        edit: "편집", play: "플레이", host: "방 만들기", analyse: "분석", link1: "링크 1개", linkN: "링크 {n}개", noLink: "없음",
        used: "{used} / {cap} 사용 중", failed: "보관함을 불러오지 못했습니다. 잠시 뒤 다시 시도하세요.",
        opening: "여는 중…", opened: "다른 탭에서 열렸습니다.", vs: "대",
        copy: "링크 복사", copied: "복사됨", making: "링크 만드는 중…", copyThis: "이 링크를 복사하세요:",
        linkFailed: "링크를 만들지 못했습니다. 잠시 뒤 다시 시도하세요.",
        dropHere: "놓으면 계정에 보관합니다.",
        keeping: "{name} 파일을 보관하는 중…", keepingPct: "{name} 파일을 보관하는 중… {pct}%",
        kept: "계정에 보관했습니다.", keptN: "파일 {n}개를 계정에 보관했습니다.", already: "이미 계정에 있는 리플레이입니다.",
        notFile: "{name} 파일은 맵이나 리플레이가 아닙니다. 보관함에는 .scm, .scx, .chk, .rep 파일을 보관할 수 있습니다.",
        notMap: "{name} 파일은 스타크래프트 맵으로 읽히지 않아 보관하지 않았습니다.",
        notReplay: "{name} 파일은 리플레이로 읽히지 않아 보관하지 않았습니다.",
        mapTooBig: "{name} 파일은 {size}입니다. 맵은 {max} MB까지 보관할 수 있습니다.",
        replayTooBig: "{name} 파일은 {size}입니다. 리플레이는 {max} MB까지 보관할 수 있습니다.",
        full: "계정 저장 공간이 부족해 {name} 파일을 보관하지 못했습니다{storage}. 에디터의 계정 메뉴에서 맵이나 리플레이를 지워 공간을 만드세요.",
        fullStorage: "({used} / {cap} 사용 중)",
        tooManyMaps: "계정에는 맵을 {n}개까지 보관할 수 있습니다. 에디터의 계정 메뉴에서 하나를 지운 뒤 다시 추가하세요.",
        tooManyReplays: "계정에는 리플레이를 {n}개까지 보관할 수 있습니다. 에디터의 계정 메뉴에서 하나를 지운 뒤 다시 추가하세요.",
        signIn: "{name} 파일을 계정에 보관하려면 위쪽 막대의 로그인 버튼으로 로그인하세요. 로그인하면 바로 보관합니다.",
        signInDrop: "파일을 보관하려면 먼저 위쪽 막대의 로그인 버튼으로 로그인하세요.",
        notKept: "{name} 파일을 보관하지 못했습니다. 잠시 뒤 다시 시도하세요.",
      }
    : {
        edit: "Edit", play: "Play", host: "Host", analyse: "Analyse", link1: "1 link", linkN: "{n} links", noLink: "none",
        used: "{used} of {cap} used", failed: "The library could not be read. Try again in a moment.",
        opening: "Opening…", opened: "Opened in the other tab.", vs: "vs",
        copy: "Copy link", copied: "Copied", making: "Making the link…", copyThis: "Copy this link:",
        linkFailed: "The link could not be made. Try again in a moment.",
        dropHere: "Drop it to keep it on your account.",
        keeping: "Keeping {name}…", keepingPct: "Keeping {name}… {pct}%",
        kept: "Kept on your account.", keptN: "Kept {n} files on your account.", already: "That replay was already on your account.",
        notFile: "{name} is not a map or a replay. The library keeps .scm, .scx, .chk and .rep files.",
        notMap: "{name} could not be read as a StarCraft map, so it was not kept.",
        notReplay: "{name} could not be read as a replay, so it was not kept.",
        mapTooBig: "{name} is {size}. A map can be at most {max} MB.",
        replayTooBig: "{name} is {size}. A replay can be at most {max} MB.",
        full: "There is no room on the account for {name}{storage}. Delete maps or replays from the editor's Account menu to make room.",
        fullStorage: " ({used} of {cap} used)",
        tooManyMaps: "An account keeps at most {n} maps. Delete one from the editor's Account menu, then add this again.",
        tooManyReplays: "An account keeps at most {n} replays. Delete one from the editor's Account menu, then add this again.",
        signIn: "Sign in with the button in the top bar to keep {name} on your account. It is kept as soon as you are signed in.",
        signInDrop: "Sign in with the button in the top bar first, and a file dropped here is kept on your account.",
        notKept: "{name} could not be kept. Try again in a moment.",
      };
  function fmt(text, params) {
    return text.replace(/\{(\w+)\}/g, function (m, k) { return params && params[k] !== undefined ? String(params[k]) : m; });
  }

  function make(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
  }
  function mb(n) {
    return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(0, Math.round(n / 1024)) + " KB";
  }
  function when(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(ko ? "ko-KR" : "en-US", { month: "short", day: "numeric", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
  }
  function clock(sec) {
    return Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2);
  }

  /** A button that opens `target` with a file fetched from `path`, saying how it goes in `says`. */
  function opener(label, cls, target, path, fallbackName, says, opts) {
    var b = make("button", "btn sm " + cls, label);
    b.type = "button";
    b.addEventListener("click", function () {
      says.textContent = T.opening;
      var files = site.bytes(path).then(function (f) { return [{ name: f.name || fallbackName, bytes: f.bytes }]; });
      site.go(target, files, {
        lobby: opts && opts.lobby,
        news: function (kind, message) { if (message) says.textContent = message; },
      }).then(
        function () { says.textContent = T.opened; },
        function (err) { says.textContent = err.message || String(err); }
      );
    });
    return b;
  }

  /* ── Links ─────────────────────────────────────────────── */

  /**
   * The address a link's token makes on this origin: a map's opens a copy of it in the editor,
   * a replay's opens it in the analysis. Against a server other than the usual one the link
   * names it, as the editor's links do (`?scmjs-server=`).
   */
  function address(kind, token) {
    var q = site.usualServer && !site.usualServer() ? "?" + new URLSearchParams({ "scmjs-server": site.server() }).toString() : "";
    return location.origin + (kind === "map" ? "/editor/map/" : "/replay/") + token + q;
  }

  function linksCell(td, n) {
    td.textContent = "";
    td.classList.toggle("is-none", !n);
    if (n) td.appendChild(make("span", "chip teal", n > 1 ? fmt(T.linkN, { n: n }) : T.link1));
    else td.textContent = T.noLink;
  }

  function writeClipboard(text) {
    try { return navigator.clipboard.writeText(text); } catch (e) { return Promise.reject(e); }
  }

  /**
   * `Copy link`: `find()` resolves with the link's address (making the link when there is
   * none). The button says `Copied` for a moment; where the clipboard is refused, the link is
   * shown in `says`, selected, to copy by hand.
   */
  function copier(says, find) {
    var b = make("button", "btn sm", T.copy);
    b.type = "button";
    var busy = false;
    var back = 0;
    b.addEventListener("click", function () {
      if (busy) return;
      busy = true;
      var slow = setTimeout(function () { says.textContent = T.making; }, 250);
      find().then(
        function (link) {
          clearTimeout(slow);
          says.textContent = "";
          return writeClipboard(link).then(
            function () {
              b.style.minWidth = b.offsetWidth + "px";
              b.textContent = T.copied;
              clearTimeout(back);
              back = setTimeout(function () { b.textContent = T.copy; b.style.minWidth = ""; }, 1600);
            },
            function () {
              says.textContent = T.copyThis + " ";
              var shown = says.appendChild(make("span", "mono row-link", link));
              try {
                var range = document.createRange();
                range.selectNodeContents(shown);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
              } catch (e) {}
            }
          );
        },
        function () {
          clearTimeout(slow);
          says.textContent = T.linkFailed;
        }
      ).then(function () { busy = false; });
    });
    return b;
  }

  /* ── Rows ──────────────────────────────────────────────── */

  function mapRow(m) {
    var tr = make("tr");
    tr.setAttribute("data-id", m.id);
    tr.setAttribute("data-text", (m.name + " " + (m.head && m.head.fileName || "")).toLowerCase());
    var name = tr.appendChild(make("td", "name", m.name));
    if (m.description) name.appendChild(make("small", "", m.description));
    tr.appendChild(make("td", "", m.head ? m.head.fileName + (m.head.sizeBytes ? " · " + mb(m.head.sizeBytes) : "") : ""));
    tr.appendChild(make("td", "mono", String(m.revisions)));
    var links = tr.appendChild(make("td"));
    linksCell(links, m.links);
    tr.appendChild(make("td", "", when(m.updatedAt)));
    var acts = tr.appendChild(make("td", "r"));
    var says = make("span", "row-says");
    var path = "/v1/maps/" + encodeURIComponent(m.id) + "/revisions/" + (m.head ? m.head.number : 1) + "/file";
    var file = (m.head && m.head.fileName) || m.name + ".scx";
    acts.appendChild(says);
    acts.appendChild(document.createTextNode(" "));
    acts.appendChild(opener(T.edit, "goldline", "editor", path, file, says));
    acts.appendChild(opener(T.play, "", "play", path, file, says));
    acts.appendChild(opener(T.host, "", "play", path, file, says, { lobby: true }));
    // A link to the version in the row: one the map has (to that revision, or following the
    // newest), or a new one to that revision, as the editor's Copy Link to This Map makes it.
    var token = null;
    acts.appendChild(copier(says, function () {
      if (token) return Promise.resolve(address("map", token));
      var id = encodeURIComponent(m.id);
      return site
        .call("/v1/maps/" + id)
        .then(function (r) {
          var head = r.map.head.number;
          var have = (r.map.linkList || []).filter(function (l) { return l.revision === null || l.revision === head; })[0];
          if (have) return { token: have.token, map: r.map };
          return site.call("/v1/maps/" + id + "/links", { method: "POST", json: { revision: head } }).then(function (made) {
            return { token: made.link.token, map: made.map };
          });
        })
        .then(function (got) {
          token = got.token;
          m.links = got.map.links;
          linksCell(links, m.links);
          return address("map", token);
        });
    }));
    return tr;
  }

  function replayRow(r) {
    var tr = make("tr");
    tr.setAttribute("data-id", r.id);
    var names = (r.players || []).map(function (p) { return p.name; }).join(" ");
    tr.setAttribute("data-text", (names + " " + r.mapName + " " + r.fileName + " " + r.matchup).toLowerCase());
    var game = tr.appendChild(make("td", "name"));
    // Teams in the order the header gives them, "vs" between two teams.
    var teams = {};
    var order = [];
    (r.players || []).forEach(function (p, i) {
      var key = p.team ? "t" + p.team : "s" + i;
      if (!teams[key]) { teams[key] = []; order.push(key); }
      teams[key].push(p);
    });
    order.forEach(function (key, i) {
      if (i) game.appendChild(make("span", "dim", " " + T.vs + " "));
      teams[key].forEach(function (p, j) {
        if (j) game.appendChild(document.createTextNode(", "));
        var race = String(p.race || "").charAt(0).toLowerCase();
        game.appendChild(make("span", "race " + (/[tzp]/.test(race) ? race : "r"), race.toUpperCase() || "?"));
        game.appendChild(document.createTextNode(p.name));
      });
    });
    if (r.note) game.appendChild(make("small", "", r.note));
    tr.appendChild(make("td", "", r.mapName));
    tr.appendChild(make("td", "mono", clock(r.durationSec || 0)));
    var links = tr.appendChild(make("td"));
    linksCell(links, (r.links || []).length);
    tr.appendChild(make("td", "", when(r.playedAt || r.uploadedAt)));
    var acts = tr.appendChild(make("td", "r"));
    var says = make("span", "row-says");
    acts.appendChild(says);
    acts.appendChild(document.createTextNode(" "));
    acts.appendChild(opener(T.analyse, "goldline", "editor", "/v1/replays/" + encodeURIComponent(r.id) + "/file", r.fileName || "replay.rep", says));
    // The replay's first link, or a new one.
    acts.appendChild(copier(says, function () {
      if (r.links && r.links.length) return Promise.resolve(address("replay", r.links[0].token));
      return site.call("/v1/replays/" + encodeURIComponent(r.id) + "/links", { method: "POST", json: {} }).then(function (made) {
        r.links = (made.replay && made.replay.links) || [made.link];
        linksCell(links, r.links.length);
        return address("replay", made.link.token);
      });
    }));
    return tr;
  }

  function fill(body, rows, none) {
    body.textContent = "";
    rows.forEach(function (tr) { body.appendChild(tr); });
    shown(body, none, rows.length);
  }
  function shown(body, none, count) {
    if (none) none.hidden = count > 0;
    var table = body.closest("table");
    if (table && none) table.hidden = count === 0;
  }

  var lists = { maps: [], replays: [] };
  var storage = null;
  function counts() {
    if ($("count-maps")) $("count-maps").textContent = String(lists.maps.length);
    if ($("count-replays")) $("count-replays").textContent = String(lists.replays.length);
  }
  function meter(st) {
    if (!st) return;
    storage = st;
    if (!$("meter") || !st.capBytes) return;
    $("meter").hidden = false;
    $("meter-text").textContent = fmt(T.used, { used: mb(st.usedBytes), cap: mb(st.capBytes) });
    $("meter-bar").style.width = Math.min(100, (st.usedBytes / st.capBytes) * 100).toFixed(1) + "%";
  }

  var held = []; // files dropped while signed out, kept once someone signs in
  var loading = null; // the lists, once asked; null signed out or after a failure
  function load() {
    if (loading) return loading;
    var maps = $("rows-maps") ? site.call("/v1/maps") : Promise.resolve(null);
    loading = Promise.all([maps, site.call("/v1/replays")]).then(
      function (got) {
        lists.replays = got[1].replays || [];
        if (got[0]) {
          lists.maps = got[0].maps || [];
          fill($("rows-maps"), lists.maps.map(mapRow), $("none-maps"));
          counts();
          meter(got[0].storage);
        }
        fill($("rows-replays"), lists.replays.slice(0, $("yours") ? 8 : lists.replays.length).map(replayRow), $("none-replays"));
        if ($("library")) $("library").hidden = false;
        if ($("yours")) $("yours").hidden = lists.replays.length === 0;
      },
      function (err) {
        loading = null;
        var out = $("signed-out");
        if (out) { out.hidden = false; out.textContent = T.failed; }
        throw err;
      }
    );
    return loading;
  }

  function account() {
    var inNow = !!site.account;
    if ($("signed-out")) $("signed-out").hidden = inNow;
    if (!inNow) {
      loading = null;
      if ($("library")) $("library").hidden = true;
      if ($("yours")) $("yours").hidden = true;
      if ($("meter")) $("meter").hidden = true;
      return;
    }
    load().then(function () {
      if (held.length) { var files = held; held = []; keepAll(files); }
    }, function () {});
  }
  document.addEventListener("scmjs:account", account);

  /* The two lists as tabs, and the search over whichever shows. */
  function show(which) {
    ["maps", "replays"].forEach(function (k) {
      $("tab-" + k).setAttribute("aria-selected", k === which ? "true" : "false");
      $("panel-" + k).hidden = k !== which;
    });
  }
  function unsearch() {
    if (!$("search").value) return;
    $("search").value = "";
    Array.prototype.forEach.call(document.querySelectorAll("#library tbody tr"), function (tr) { tr.hidden = false; });
  }
  var library = !!$("tab-maps");
  if (library) {
    $("tab-maps").addEventListener("click", function () { show("maps"); });
    $("tab-replays").addEventListener("click", function () { show("replays"); });
    if (location.hash === "#replays") show("replays");
    $("search").addEventListener("input", function () {
      var q = this.value.trim().toLowerCase();
      Array.prototype.forEach.call(document.querySelectorAll("#library tbody tr"), function (tr) {
        tr.hidden = !!q && tr.getAttribute("data-text").indexOf(q) < 0;
      });
    });
  }

  /* ── Keeping a file (the library page) ─────────────────── */

  var says = $("keep-says");
  /** The line above the list. `quiet` for progress and success; a refusal is said plainly. */
  function say(text, quiet) {
    if (!says) return;
    says.hidden = !text;
    says.textContent = text || "";
    says.classList.toggle("is-quiet", !!quiet);
  }

  /* The server's limits (ai-server `config.ts`: maps.maxMapMb, maps.maxReplayMb), checked here
     first so a file too large is not sent at all; the server says the same if they change. */
  var MAX_MB = { map: 16, replay: 8 };

  /** Words for a refusal from the server (`err.status`, `err.code`, `err.detail`: header.js). */
  function reason(err, kind, file) {
    var p = { name: file.name, size: mb(file.size), max: MAX_MB[kind] };
    var detail = String(err.detail || "");
    if (err.status === 401 || err.status === 403) return fmt(T.signIn, p);
    if (err.code === "storage_full" || err.status === 402) {
      // The server's own numbers where it gave them ("past its 250 MB of storage (249.9 MB used)"), else the meter's.
      var said = /past its ([\d.]+) MB of storage \(([\d.]+) MB used\)/.exec(detail);
      p.storage = said ? fmt(T.fullStorage, { used: said[2] + " MB", cap: said[1] + " MB" })
        : storage && storage.capBytes ? fmt(T.fullStorage, { used: mb(storage.usedBytes), cap: mb(storage.capBytes) }) : "";
      return fmt(T.full, p);
    }
    if (err.status === 400 || err.code === "invalid_input") {
      var many = /at most (\d+) (maps|replays)/.exec(detail);
      if (many) return fmt(many[2] === "maps" ? T.tooManyMaps : T.tooManyReplays, { n: many[1] });
      var max = /larger than ([\d.]+) MB/.exec(detail);
      if (max) { p.max = max[1]; return fmt(kind === "map" ? T.mapTooBig : T.replayTooBig, p); }
      return fmt(kind === "map" ? T.notMap : T.notReplay, p);
    }
    return fmt(T.notKept, p);
  }

  /** Puts a kept map or replay at the top of its list, shows its tab and marks the row. */
  function place(kind, item, st) {
    var key = kind === "map" ? "maps" : "replays";
    var body = $("rows-" + key);
    lists[key] = lists[key].filter(function (x) { return x.id !== item.id; });
    lists[key].unshift(item);
    Array.prototype.forEach.call(body.querySelectorAll("tr"), function (tr) {
      if (tr.getAttribute("data-id") === item.id) tr.remove();
    });
    var tr = (kind === "map" ? mapRow : replayRow)(item);
    body.insertBefore(tr, body.firstChild);
    shown(body, $("none-" + key), lists[key].length);
    counts();
    meter(st);
    unsearch();
    show(key);
    tr.classList.add("is-new");
    try { tr.scrollIntoView({ block: "nearest" }); } catch (e) {}
    setTimeout(function () {
      tr.classList.add("was-new");
      tr.classList.remove("is-new");
      setTimeout(function () { tr.classList.remove("was-new"); }, 1600);
    }, 3500);
  }

  /** Keeps one file on the account. Resolves with words to say when it is done, or rejects with them. */
  function keep(file) {
    var kind = site.kindOf(file.name);
    if (!kind) return Promise.reject(fmt(T.notFile, { name: file.name }));
    if (file.size > MAX_MB[kind] * 1048576) {
      return Promise.reject(fmt(kind === "map" ? T.mapTooBig : T.replayTooBig, { name: file.name, size: mb(file.size), max: MAX_MB[kind] }));
    }
    var form = new FormData();
    form.append("fileName", file.name);
    form.append("file", file, file.name);
    say(fmt(T.keeping, { name: file.name }), true);
    return load()
      .then(function () {
        return site.upload(kind === "map" ? "/v1/maps" : "/v1/replays", form, function (part) {
          say(fmt(part < 1 ? T.keepingPct : T.keeping, { name: file.name, pct: Math.floor(part * 100) }), true);
        });
      })
      .then(
        function (res) {
          place(kind, kind === "map" ? res.map : res.replay, res.storage);
          return res.existing ? T.already : T.kept;
        },
        function (err) { throw reason(err || {}, kind, file); }
      );
  }

  /** Keeps files one after the other, then says how it went: the first refusal, or that they are kept. */
  var queue = Promise.resolve();
  function keepAll(list) {
    var files = Array.prototype.slice.call(list || []);
    if (!files.length) return;
    if (!site.account) {
      var bad = files.filter(function (f) { return !site.kindOf(f.name); })[0];
      if (bad) return say(fmt(T.notFile, { name: bad.name }));
      held = files;
      return say(fmt(T.signIn, { name: files.map(function (f) { return f.name; }).join(", ") }));
    }
    queue = queue.then(function () {
      var kept = 0;
      var last = "";
      var refused = "";
      return files
        .reduce(function (chain, file) {
          return chain.then(function () {
            return keep(file).then(
              function (words) { kept++; last = words; },
              function (words) { if (!refused) refused = String(words); }
            );
          });
        }, Promise.resolve())
        .then(function () {
          say(refused || (kept > 1 ? fmt(T.keptN, { n: kept }) : last), !refused);
        });
    });
  }

  if (library) {
    var picker = document.body.appendChild(make("input"));
    picker.type = "file";
    picker.accept = ".scm,.scx,.chk,.rep";
    picker.multiple = true;
    picker.hidden = true;
    picker.addEventListener("change", function () {
      keepAll(picker.files);
      picker.value = "";
    });
    $("add-file").addEventListener("click", function () { picker.click(); });

    /* The whole page takes a drop. While a file is over it, the list is outlined and the line
       above it says what a drop does; leaving puts the line back as it was. */
    var depth = 0;
    var before = null;
    var hasFiles = function (e) {
      var types = e.dataTransfer && e.dataTransfer.types;
      return !!types && Array.prototype.indexOf.call(types, "Files") >= 0;
    };
    var over = function (yes) {
      document.body.classList.toggle("lib-dragging", yes);
      if (yes) {
        before = says && !says.hidden ? { text: says.textContent, quiet: says.classList.contains("is-quiet") } : null;
        say(site.account ? T.dropHere : T.signInDrop, !!site.account);
      } else if (before) say(before.text, before.quiet);
      else say("");
    };
    window.addEventListener("dragenter", function (e) {
      if (!hasFiles(e)) return;
      if (depth++ === 0) over(true);
    });
    window.addEventListener("dragleave", function () {
      if (!depth) return;
      depth = Math.max(0, depth - 1);
      if (!depth) over(false);
    });
    window.addEventListener("dragover", function (e) { if (hasFiles(e)) e.preventDefault(); });
    window.addEventListener("drop", function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      document.body.classList.remove("lib-dragging");
      before = null;
      say("");
      keepAll(e.dataTransfer.files);
    });
  }

  if (site.account) account();
})();

/*
 * What a visitor does with a map or a replay: the drop zone, the sheet that asks, and the
 * hand-over to the editor or the play page.
 *
 * A file goes to the other page in this tab (`send`): pages of one origin share the browser's
 * private file storage, so the file is left there, in the folder `scmjs-inbox`, and the browser
 * is sent to the editor or the play page at `?inbox`, which reads it and empties the inbox.
 * `meta.json` says who it is for and names the files; their bytes are beside it as `0`, `1`, ….
 * The editor's `services/inbox.ts` and the play page's `web/inbox.ts` read what this writes:
 * change the three together. Nothing is uploaded.
 *
 * So a dropped replay simply opens: it has one place to go. A dropped map is named on a sheet
 * that asks whether to edit it, play it or host it, and opens on the answer.
 *
 * Where the storage cannot be written (an old browser, a private window that refuses it), the
 * file is handed over the way `scmjs map open` does it instead (`handOver`): the other page is
 * opened in a new tab with `?handoff` in its address, says `scmjs.ready`, is posted
 * `scmjs.open` with the file, and answers `scmjs.taken`. A browser only lets a click open a
 * tab, so on that path the sheet's button is always what does it.
 *
 * Markup a page provides:
 *   [data-drop]            the drop zone (the whole page takes a drop too)
 *   [data-open-file]       a button that opens the file picker
 *   [data-paste-link]      a button that asks for a link
 *   [data-sheet]           an empty element the sheet is built in; the drop zone hides while it shows
 */
(function () {
  var site = (window.scmjsSite = window.scmjsSite || {});
  var ko = document.documentElement.lang === "ko";
  var T = ko
    ? {
        map: "맵",
        replay: "리플레이",
        other: "맵이나 리플레이 파일이 아닙니다. .scm, .scx, .chk, .rep 파일을 열 수 있습니다.",
        another: "다른 파일 선택",
        edit: "편집",
        editWhat: "에디터의 새 탭에서 엽니다.",
        editNeeds: "게임 파일 없이도 됩니다",
        play: "플레이",
        playWhat: "이 맵으로 게임을 준비합니다. 혼자, 또는 봇을 상대로.",
        playNeeds: "가지고 계신 스타크래프트가 필요합니다",
        host: "방 만들기",
        hostWhat: "대기실을 열고 보낼 링크를 받습니다.",
        hostNeeds: "가지고 계신 스타크래프트와 로그인이 필요합니다",
        analyse: "분석",
        analyseWhat: "빌드 오더, 전투, 그래프를 게임 화면과 함께 봅니다. 어느 순간에서든 이어서 플레이할 수 있습니다.",
        analyseNeeds: "게임 파일 없이도 됩니다. 있으면 더 많이 보입니다",
        opening: "여는 중…",
        again: "이 탭에서 열지 못했습니다. 버튼을 다시 누르면 새 탭에서 엽니다.",
        taken: "다른 탭에서 열렸습니다.",
        blocked: "브라우저가 새 탭을 막았습니다. 이 사이트의 팝업을 허용한 뒤 다시 누르세요.",
        closed: "탭이 닫혔습니다.",
        invite: "초대 링크",
        copy: "복사",
        copied: "복사됨",
        linkAsk: "scmjs.dev 링크를 붙여 넣으세요",
        linkGo: "열기",
        linkBad: "scmjs.dev의 맵, 리플레이, 게임 링크가 아닙니다.",
      }
    : {
        map: "Map",
        replay: "Replay",
        other: "That is not a map or a replay. This opens .scm, .scx, .chk and .rep files.",
        another: "Choose another file",
        edit: "Edit",
        editWhat: "Opens it in the editor, in a tab of its own.",
        editNeeds: "No game files needed",
        play: "Play",
        playWhat: "Sets up a game on it: alone, or against bots.",
        playNeeds: "Requires your own StarCraft",
        host: "Host",
        hostWhat: "Opens a lobby and gives you a link to send.",
        hostNeeds: "Requires your own StarCraft, and a sign-in",
        analyse: "Analyse",
        analyseWhat: "Build orders, fights and graphs beside the game's own picture. Play on from any moment.",
        analyseNeeds: "Works without game files; shows more with them",
        opening: "Opening…",
        again: "It could not be passed along in this tab. Press the button again to open it in a new tab.",
        taken: "Opened in the other tab.",
        blocked: "The browser blocked the new tab. Allow popups for this site and press the button again.",
        closed: "The tab was closed.",
        invite: "Invite link",
        copy: "Copy",
        copied: "Copied",
        linkAsk: "Paste a scmjs.dev link",
        linkGo: "Open",
        linkBad: "That is not a scmjs.dev link to a map, a replay or a game.",
      };

  function make(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text) el.textContent = text;
    return el;
  }
  function size(n) {
    return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  }

  /** "map", "replay" or null, from a file's name. */
  site.kindOf = function (name) {
    return /\.(scm|scx|chk)$/i.test(name) ? "map" : /\.rep$/i.test(name) ? "replay" : null;
  };

  /**
   * Hands files to the editor ("editor") or the play page ("play") in a new tab. Call it from a
   * click. `files` is `[{ name, bytes }]` or a promise of that (the tab is opened first, so a
   * fetch may still be on its way). `opts.lobby` opens a lobby on the play page;
   * `opts.news(kind, message)` hears "waiting", "invite" (message is the link) and "taken".
   * Resolves when the other page has taken the file; rejects with a reason in words.
   */
  site.handOver = function (target, files, opts) {
    opts = opts || {};
    var tab = window.open((target === "play" ? "/play/" : "/editor/") + "?handoff=1", "_blank");
    if (!tab) return Promise.reject(new Error(T.blocked));
    return new Promise(function (resolve, reject) {
      var list = null;
      var ready = false;
      var done = false;
      function post() {
        if (list && ready) tab.postMessage({ type: "scmjs.open", files: list, lobby: !!opts.lobby }, location.origin);
      }
      function stop() {
        done = true;
        window.removeEventListener("message", heard);
        clearInterval(watch);
      }
      function heard(e) {
        if (e.source !== tab || e.origin !== location.origin) return;
        var m = e.data || {};
        if (m.type === "scmjs.ready") { ready = true; post(); }
        else if (m.type === "scmjs.waiting") { if (opts.news) opts.news("waiting", String(m.message || "")); }
        else if (m.type === "scmjs.invite") { if (opts.news) opts.news("invite", String(m.link || "")); }
        else if (m.type === "scmjs.taken") { stop(); resolve(); }
        else if (m.type === "scmjs.error") { stop(); reject(new Error(String(m.message || ""))); }
      }
      window.addEventListener("message", heard);
      var watch = setInterval(function () {
        if (tab.closed && !done) { stop(); reject(new Error(T.closed)); }
      }, 700);
      Promise.resolve(files).then(
        function (got) { list = got; post(); },
        function (err) { stop(); try { tab.close(); } catch (e) {} reject(err); }
      );
    });
  };

  var INBOX = "scmjs-inbox";
  /* Whether files go by a new tab: where there is no storage to leave them in, or it failed once. */
  var newTab = !(navigator.storage && navigator.storage.getDirectory);

  /**
   * Leaves files for the editor ("editor") or the play page ("play") and goes there, in this
   * tab. `files` is `[{ name, bytes }]` or a promise of that. Rejects when the storage cannot be
   * written; on success the page is on its way out.
   */
  site.send = function (target, files, opts) {
    opts = opts || {};
    return Promise.resolve(files)
      .then(function (list) {
        return navigator.storage
          .getDirectory()
          .then(function (root) {
            return root
              .removeEntry(INBOX, { recursive: true })
              .catch(function () {})
              .then(function () { return root.getDirectoryHandle(INBOX, { create: true }); });
          })
          .then(function (dir) {
            function put(name, data) {
              return dir
                .getFileHandle(name, { create: true })
                .then(function (h) { return h.createWritable(); })
                .then(function (w) { return w.write(data).then(function () { return w.close(); }); });
            }
            var meta = { v: 1, at: Date.now(), target: target, lobby: !!opts.lobby, files: list.map(function (f) { return { name: f.name }; }) };
            return Promise.all(list.map(function (f, i) { return put(String(i), f.bytes); })).then(function () {
              // Written last: a reader that finds it finds the files too.
              return put("meta.json", JSON.stringify(meta));
            });
          });
      })
      .then(function () {
        location.href = (target === "play" ? "/play/" : "/editor/") + "?inbox=1";
        // The page is leaving; whoever waits on this hears nothing more.
        return new Promise(function () {});
      });
  };

  /**
   * Opens files in the editor or the play page: in this tab where the storage can be written,
   * in a new tab otherwise (then it must be called from a click). Rejects with words to show.
   */
  site.go = function (target, files, opts) {
    if (newTab) return site.handOver(target, files, opts);
    return site.send(target, files, opts).catch(function () {
      newTab = true;
      throw new Error(T.again);
    });
  };

  /* ── the sheet ─────────────────────────────────────────── */

  var sheet = document.querySelector("[data-sheet]");
  var zone = document.querySelector("[data-drop]");
  if (!sheet) return;

  var VERBS = {
    map: [
      { name: T.edit, what: T.editWhat, needs: T.editNeeds, target: "editor" },
      { name: T.play, what: T.playWhat, needs: T.playNeeds, target: "play" },
      { name: T.host, what: T.hostWhat, needs: T.hostNeeds, target: "play", lobby: true },
    ],
    replay: [{ name: T.analyse, what: T.analyseWhat, needs: T.analyseNeeds, target: "editor" }],
  };

  function close() {
    sheet.hidden = true;
    sheet.textContent = "";
    if (zone) zone.hidden = false;
  }

  /**
   * Shows what can be done with a file. `file` is `{ name, size, kind, bytes() }`: `bytes()`
   * returns the bytes or a promise of them, and is asked for only when a button is pressed.
   * With `go`, and where the file can be passed along in this tab, the first choice is taken
   * at once: a replay has one place to go, so it is not asked about.
   */
  site.offer = function (file, go) {
    sheet.textContent = "";
    var head = sheet.appendChild(make("div", "sheet-file"));
    var what = head.appendChild(make("div"));
    what.appendChild(make("b", "", file.name));
    what.appendChild(make("span", "", (file.kind === "map" ? T.map : T.replay) + (file.size ? " · " + size(file.size) : "") + (file.facts ? " · " + file.facts : "")));
    var back = head.appendChild(make("button", "btn sm ghost", T.another));
    back.type = "button";
    back.addEventListener("click", close);

    var verbs = sheet.appendChild(make("div", "verbs"));
    var says = sheet.appendChild(make("p", "sheet-says"));
    says.setAttribute("role", "status");
    says.hidden = true;
    function say(text, link) {
      says.hidden = false;
      says.textContent = text;
      if (!link) return;
      var row = says.appendChild(make("span", "linkrow"));
      var field = row.appendChild(make("input", "field"));
      field.readOnly = true;
      field.value = link;
      field.setAttribute("aria-label", T.invite);
      var copy = row.appendChild(make("button", "btn sm", T.copy));
      copy.type = "button";
      copy.addEventListener("click", function () {
        var done = function () { copy.textContent = T.copied; setTimeout(function () { copy.textContent = T.copy; }, 1200); };
        try { navigator.clipboard.writeText(link).then(done, function () { field.select(); }); } catch (e) { field.select(); }
      });
    }

    VERBS[file.kind].forEach(function (v, i) {
      var b = verbs.appendChild(make("button", "verb" + (i === 0 ? " is-first" : "")));
      b.type = "button";
      b.appendChild(make("b", "", v.name));
      b.appendChild(make("span", "", v.what));
      b.appendChild(make("em", "", v.needs));
      b.addEventListener("click", function () {
        say(T.opening);
        var files = Promise.resolve(file.bytes()).then(function (bytes) { return [{ name: file.name, bytes: bytes }]; });
        site
          .go(v.target, files, {
            lobby: v.lobby,
            news: function (kind, message) {
              if (kind === "invite") say(T.invite, message);
              else if (message) say(message);
            },
          })
          .then(
            function () { if (!v.lobby) say(T.taken); },
            function (err) { say(err.message || String(err)); }
          );
      });
    });

    if (zone) zone.hidden = true;
    sheet.hidden = false;
    sheet.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (go && !newTab) verbs.firstChild.click();
  };

  function note(text) {
    sheet.textContent = "";
    var head = sheet.appendChild(make("div", "sheet-file"));
    head.appendChild(make("div")).appendChild(make("span", "", text));
    var back = head.appendChild(make("button", "btn sm ghost", T.another));
    back.type = "button";
    back.addEventListener("click", close);
    if (zone) zone.hidden = true;
    sheet.hidden = false;
  }

  function take(files) {
    var file = files && files[0];
    if (!file) return;
    var kind = site.kindOf(file.name);
    if (!kind) return note(T.other);
    site.offer({
      name: file.name,
      size: file.size,
      kind: kind,
      bytes: function () { return file.arrayBuffer().then(function (b) { return new Uint8Array(b); }); },
    }, kind === "replay");
  }

  /* ── the drop zone, the picker, the link ───────────────── */

  var picker = document.body.appendChild(make("input"));
  picker.type = "file";
  picker.accept = ".scm,.scx,.chk,.rep";
  picker.hidden = true;
  picker.addEventListener("change", function () {
    take(picker.files);
    picker.value = "";
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-open-file]"), function (b) {
    b.addEventListener("click", function () { picker.click(); });
  });

  var depth = 0;
  function hasFiles(e) {
    var types = e.dataTransfer && e.dataTransfer.types;
    return !!types && Array.prototype.indexOf.call(types, "Files") >= 0;
  }
  window.addEventListener("dragenter", function (e) {
    if (!hasFiles(e)) return;
    depth++;
    if (zone) zone.classList.add("is-over");
  });
  window.addEventListener("dragleave", function () {
    depth = Math.max(0, depth - 1);
    if (!depth && zone) zone.classList.remove("is-over");
  });
  window.addEventListener("dragover", function (e) { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener("drop", function (e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    if (zone) zone.classList.remove("is-over");
    take(e.dataTransfer.files);
  });

  /* A link to something on the site: a map or replay link, a shared map, a game's invite. It is
     opened on the origin this page is on, so a link copied from scmjs.dev works on a stand-in. */
  function follow(text) {
    var url;
    try { url = new URL(text.trim(), location.origin); } catch (e) { return false; }
    var ours = url.hostname === location.hostname || /(^|\.)scmjs\.dev$/.test(url.hostname);
    var known = /^\/(editor\/(map|replay|share)\/[^/]+|replay\/[^/]+|play\/?$)/.test(url.pathname);
    if (!ours || !known || (/^\/play\/?$/.test(url.pathname) && !url.searchParams.has("game"))) return false;
    location.href = url.pathname + url.search + url.hash;
    return true;
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-paste-link]"), function (b) {
    b.addEventListener("click", function () {
      sheet.textContent = "";
      var head = sheet.appendChild(make("div", "sheet-file"));
      var row = head.appendChild(make("form", "linkrow"));
      var field = row.appendChild(make("input", "field"));
      field.placeholder = T.linkAsk;
      field.setAttribute("aria-label", T.linkAsk);
      var go = row.appendChild(make("button", "btn sm goldline", T.linkGo));
      go.type = "submit";
      var back = head.appendChild(make("button", "btn sm ghost", T.another));
      back.type = "button";
      back.addEventListener("click", close);
      var says = sheet.appendChild(make("p", "sheet-says"));
      says.hidden = true;
      row.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!follow(field.value)) { says.hidden = false; says.textContent = T.linkBad; }
      });
      if (zone) zone.hidden = true;
      sheet.hidden = false;
      field.focus();
    });
  });
})();

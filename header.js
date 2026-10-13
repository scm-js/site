/*
 * The top bar's two live items: what game data this browser holds, and the scmjs.dev
 * account. Both are optional — every page reads correctly without this file, and each item
 * simply stays out of the bar when what it needs is missing.
 *
 * The site and the editor (scmjs.dev/editor/) are one origin, so what the editor keeps is
 * here to read:
 *
 *  - Game data is in the browser's private file storage: `gamedata/stamp.json` for the
 *    game's own files, `gamedata-profiles/<id>/stamp.json` for a set kept beside them. A
 *    stamp says where a copy came from, which is all the label needs (the editor's
 *    `gamedata/copies.ts` is the same rule — keep the two in step). The item links to the
 *    editor's Game Data page, where copies are added and removed. Nothing is read but the
 *    stamps, and nothing leaves the browser.
 *  - The account is the session the scmjs.dev plugin keeps in localStorage. Signing in
 *    here is the plugin's own flow (a popup the server points at the provider, which posts
 *    the session back) and writes the session where the plugin reads it, so the editor is
 *    signed in too. Signing out clears it for both.
 */
(function () {
  var bar = document.querySelector(".topbar-links");
  if (!bar) return;
  var ko = document.documentElement.lang === "ko";
  var T = ko
    ? {
        none: "게임 데이터 없음",
        download: "에디터 그래픽",
        classic: "스타크래프트 1.16",
        remastered: "스타크래프트: 리마스터",
        both: "스타크래프트 1.16 + 리마스터",
        noneTitle: "이 브라우저에 스타크래프트 파일이 없습니다. 추가하려면 누르세요.",
        downloadTitle: "블리자드의 무료 다운로드로 받은 에디터용 그래픽입니다. 관리하려면 누르세요.",
        ownTitle: "가지고 계신 스타크래프트에서 가져온 파일이 이 브라우저에 있습니다. 관리하려면 누르세요.",
        signIn: "로그인",
        signInWith: "{name}(으)로 로그인",
        account: "계정",
        accountPage: "계정 페이지",
        signOut: "로그아웃",
        blocked: "브라우저가 로그인 창을 막았습니다. 이 사이트의 팝업을 허용한 뒤 다시 시도하세요.",
        failed: "로그인하지 못했습니다. 잠시 뒤 다시 시도하세요.",
      }
    : {
        none: "No game data",
        download: "Editor graphics",
        classic: "StarCraft 1.16",
        remastered: "StarCraft: Remastered",
        both: "StarCraft 1.16 + Remastered",
        noneTitle: "This browser holds none of StarCraft's files. Click to add them.",
        downloadTitle: "The editor's graphics, from Blizzard's free download. Click to manage them.",
        ownTitle: "Files from your own StarCraft are kept in this browser. Click to manage them.",
        signIn: "Sign in",
        signInWith: "Sign in with {name}",
        account: "Account",
        accountPage: "Account page",
        signOut: "Sign out",
        blocked: "The browser blocked the sign-in window. Allow popups for this site and try again.",
        failed: "The sign-in did not go through. Try again in a moment.",
      };

  var before = bar.querySelector(".lang-switch") || bar.querySelector(".topbar-cta");
  function add(el) {
    bar.insertBefore(el, before);
    return el;
  }
  function make(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text) el.textContent = text;
    return el;
  }

  /* ── Game data ─────────────────────────────────────────── */

  var REMASTERED = "StarCraft: Remastered";

  /** "download" | "classic" | "remastered" | "mod", from a stamp and the folder it was in. */
  function kindOf(stamp, profileId) {
    var from = String(stamp.from || "");
    var id = (stamp.profile && stamp.profile.id) || profileId;
    if (from.indexOf(REMASTERED) === 0 || id === "remastered") return "remastered";
    if (id && id !== "starcraft") return "mod";
    return /^https?:\/\//i.test(from) ? "download" : "classic";
  }

  function stampIn(dir) {
    return dir
      .getFileHandle("stamp.json")
      .then(function (h) { return h.getFile(); })
      .then(function (f) { return f.text(); })
      .then(JSON.parse)
      .catch(function () { return null; });
  }

  /** The kinds of copy this browser holds; rejects where the storage cannot be read. */
  function heldKinds() {
    return navigator.storage.getDirectory().then(function (root) {
      var kinds = [];
      var own = root
        .getDirectoryHandle("gamedata")
        .then(stampIn)
        .then(function (s) { if (s) kinds.push(kindOf(s, "starcraft")); })
        .catch(function () {});
      var sets = root
        .getDirectoryHandle("gamedata-profiles")
        .then(function (dir) {
          if (!dir.entries) return;
          var it = dir.entries();
          function next() {
            return it.next().then(function (r) {
              if (r.done) return;
              var handle = r.value[1];
              if (handle.kind !== "directory") return next();
              return stampIn(handle).then(function (s) {
                if (s) kinds.push(kindOf(s, r.value[0]));
                return next();
              });
            });
          }
          return next();
        })
        .catch(function () {});
      return Promise.all([own, sets]).then(function () { return kinds; });
    });
  }

  function showData(kinds) {
    var has = function (k) { return kinds.indexOf(k) >= 0; };
    var own = [];
    if (has("classic")) own.push(T.classic);
    if (has("remastered")) own.push(T.remastered);
    var state = own.length ? "own" : has("download") ? "download" : "none";
    var a = make("a", "topbar-data");
    a.href = "/editor/data";
    a.setAttribute("data-state", state);
    a.title = state === "own" ? T.ownTitle : state === "download" ? T.downloadTitle : T.noneTitle;
    a.appendChild(make("span", "topbar-data-dot"));
    a.appendChild(make("span", "topbar-data-label", state === "own" ? (own.length > 1 ? T.both : own[0]) : state === "download" ? T.download : T.none));
    // Before the account, whichever of the two is ready first.
    bar.insertBefore(a, bar.querySelector(".topbar-account") || before);
  }

  if (navigator.storage && navigator.storage.getDirectory) {
    heldKinds().then(showData, function () {});
  }

  /* ── Account ───────────────────────────────────────────── */

  var SETTINGS_KEY = "scmjs.plugin.scmjs-dev.settings";
  var DEFAULT_SERVER = "https://api.scmjs.dev";
  var AUTH_MESSAGE = "scmjs-ai-auth";

  function settings() {
    try {
      var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return s && typeof s === "object" ? s : {};
    } catch (e) {
      return null; // no storage: no account item at all
    }
  }
  function keep(patch) {
    var s = settings() || {};
    for (var k in patch) s[k] = patch[k];
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch (e) {}
  }
  function server() {
    var s = settings();
    return String((s && s.serverUrl) || DEFAULT_SERVER).replace(/\/+$/, "");
  }
  function call(path, init) {
    var s = settings();
    init = init || {};
    var headers = { Accept: "application/json" };
    if (s && s.session) headers.Authorization = "Bearer " + s.session;
    if (init.json) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(init.json);
    }
    init.headers = headers;
    return fetch(server() + path, init).then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    });
  }

  if (settings() === null) return;

  var wrap = add(make("div", "topbar-account"));
  var button = wrap.appendChild(make("button", "topbar-account-button"));
  button.type = "button";
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "false");
  var menu = wrap.appendChild(make("div", "topbar-account-menu"));
  menu.setAttribute("role", "menu");
  menu.hidden = true;

  function open(yes) {
    menu.hidden = !yes;
    button.setAttribute("aria-expanded", yes ? "true" : "false");
  }
  function item(tag, text) {
    var el = menu.appendChild(make(tag, "topbar-account-item", text));
    el.setAttribute("role", "menuitem");
    if (tag === "button") el.type = "button";
    return el;
  }
  function note(text) {
    menu.appendChild(make("p", "topbar-account-note", text));
    open(true);
  }

  var info = null; // the server's /v1/info, once asked
  function askInfo() {
    if (!info) info = call("/v1/info").catch(function (e) { info = null; throw e; });
    return info;
  }

  var listed = false; // the sign-in menu has been asked for
  function signedOut() {
    signedInNow = false;
    button.textContent = T.signIn;
    menu.textContent = "";
    listed = false;
  }
  /*
   * The server is asked which sign-ins it offers only when somebody goes for the button
   * (pointer over it, focus, or the click), so a page view by itself asks it nothing. The
   * providers are listed rather than the first one opened, because the sign-in window has
   * to be opened by a click itself — after a request it would be blocked.
   */
  function listProviders() {
    if (listed) return;
    listed = true;
    askInfo().then(function (i) {
      var providers = (i.accounts && i.accounts.providers) || [];
      menu.textContent = "";
      providers.forEach(function (p) {
        item("button", T.signInWith.replace("{name}", p.name)).addEventListener("click", function () { signIn(p.id); });
      });
      if (!providers.length) menu.appendChild(make("p", "topbar-account-note", T.failed));
    }, function () {
      // Said in the menu, for whoever opens it; the next approach asks again.
      listed = false;
      menu.textContent = "";
      menu.appendChild(make("p", "topbar-account-note", T.failed));
    });
  }

  function signedIn(account) {
    signedInNow = true;
    button.textContent = account.name || T.account;
    menu.textContent = "";
    var page = item("a", T.accountPage);
    page.href = server() + "/account";
    page.target = "_blank";
    page.rel = "noopener";
    askInfo().then(function (i) { if (i.accounts && i.accounts.accountUrl) page.href = i.accounts.accountUrl; }, function () {});
    item("button", T.signOut).addEventListener("click", function () {
      call("/v1/auth/logout", { method: "POST", json: {} }).catch(function () {});
      keep({ session: "" });
      open(false);
      signedOut();
    });
  }

  function signIn(provider) {
    var base = server();
    var popup = window.open("", "scmjs-signin", "width=540,height=720,popup=yes");
    if (!popup) return note(T.blocked);
    open(false);
    var done = false;
    function finish() {
      done = true;
      window.removeEventListener("message", heard);
      clearInterval(watch);
    }
    function heard(e) {
      if (e.origin !== new URL(base).origin) return;
      var m = e.data;
      if (!m || m.type !== AUTH_MESSAGE || typeof m.session !== "string" || !m.account) return;
      finish();
      keep({ session: m.session });
      signedIn(m.account);
    }
    window.addEventListener("message", heard);
    var watch = setInterval(function () { if (popup.closed && !done) finish(); }, 500);
    call("/v1/auth/start", { method: "POST", json: { provider: provider, returnOrigin: location.origin } }).then(
      function (r) { popup.location.href = r.url; },
      function () {
        finish();
        try { popup.close(); } catch (e) {}
        note(T.failed);
      }
    );
  }

  var signedInNow = false;
  function wanted() { if (!signedInNow) listProviders(); }
  button.addEventListener("pointerenter", wanted);
  button.addEventListener("focus", wanted);
  button.addEventListener("click", function () { wanted(); open(menu.hidden); });
  document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) open(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") open(false); });

  var s = settings();
  if (s.session) {
    button.textContent = T.account;
    call("/v1/account").then(
      function (r) {
        // A trial is a session with no sign-in behind it: the bar offers the sign-in.
        if (r.account && r.account.kind === "account") signedIn(r.account);
        else signedOut();
      },
      signedOut
    );
  } else {
    signedOut();
  }
})();

/*
 * The account's maps and replays, on the library page and (the replays alone) on the Replays page.
 *
 * Everything is asked of the server as the signed-in account (header.js: `scmjsSite.call`), and
 * only once someone is signed in: a signed-out page view asks the server nothing. A row's
 * buttons fetch the file and open it in the editor or the play page (open.js: `go`), in this
 * tab where the browser's file storage can pass it along, in a new tab otherwise.
 */
(function () {
  var site = (window.scmjsSite = window.scmjsSite || {});
  var $ = function (id) { return document.getElementById(id); };
  var ko = document.documentElement.lang === "ko";
  var T = ko
    ? {
        edit: "편집", play: "플레이", host: "방 만들기", analyse: "분석", link: "링크", links: "링크", noLink: "없음",
        used: "{used} / {cap} 사용 중", failed: "보관함을 불러오지 못했습니다. 잠시 뒤 다시 시도하세요.",
        opening: "여는 중…", opened: "다른 탭에서 열렸습니다.", vs: "대",
      }
    : {
        edit: "Edit", play: "Play", host: "Host", analyse: "Analyse", link: "link", links: "links", noLink: "none",
        used: "{used} of {cap} used", failed: "The library could not be read. Try again in a moment.",
        opening: "Opening…", opened: "Opened in the other tab.", vs: "vs",
      };

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

  function mapRow(m) {
    var tr = make("tr");
    tr.setAttribute("data-text", (m.name + " " + (m.head && m.head.fileName || "")).toLowerCase());
    var name = tr.appendChild(make("td", "name", m.name));
    if (m.description) name.appendChild(make("small", "", m.description));
    tr.appendChild(make("td", "", m.head ? m.head.fileName + (m.head.sizeBytes ? " · " + mb(m.head.sizeBytes) : "") : ""));
    tr.appendChild(make("td", "mono", String(m.revisions)));
    var links = tr.appendChild(make("td"));
    if (m.links) links.appendChild(make("span", "chip teal", m.links + " " + (m.links > 1 ? T.links : T.link)));
    else links.textContent = T.noLink;
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
    return tr;
  }

  function replayRow(r) {
    var tr = make("tr");
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
    if (r.links && r.links.length) links.appendChild(make("span", "chip teal", r.links.length + " " + (r.links.length > 1 ? T.links : T.link)));
    else links.textContent = T.noLink;
    tr.appendChild(make("td", "", when(r.playedAt || r.uploadedAt)));
    var acts = tr.appendChild(make("td", "r"));
    var says = make("span", "row-says");
    acts.appendChild(says);
    acts.appendChild(document.createTextNode(" "));
    acts.appendChild(opener(T.analyse, "goldline", "editor", "/v1/replays/" + encodeURIComponent(r.id) + "/file", r.fileName || "replay.rep", says));
    return tr;
  }

  function fill(body, rows, none) {
    body.textContent = "";
    rows.forEach(function (tr) { body.appendChild(tr); });
    if (none) none.hidden = rows.length > 0;
    var table = body.closest("table");
    if (table && none) table.hidden = rows.length === 0;
  }

  var asked = false;
  function load() {
    if (asked) return;
    asked = true;
    var maps = $("rows-maps") ? site.call("/v1/maps") : Promise.resolve(null);
    Promise.all([maps, site.call("/v1/replays")]).then(
      function (got) {
        var replays = got[1].replays || [];
        if (got[0]) {
          fill($("rows-maps"), (got[0].maps || []).map(mapRow), $("none-maps"));
          $("count-maps").textContent = String((got[0].maps || []).length);
          $("count-replays").textContent = String(replays.length);
          var st = got[0].storage;
          if (st && st.capBytes) {
            $("meter").hidden = false;
            $("meter-text").textContent = T.used.replace("{used}", mb(st.usedBytes)).replace("{cap}", mb(st.capBytes));
            $("meter-bar").style.width = Math.min(100, (st.usedBytes / st.capBytes) * 100).toFixed(1) + "%";
          }
        }
        fill($("rows-replays"), replays.slice(0, $("yours") ? 8 : replays.length).map(replayRow), $("none-replays"));
        if ($("library")) $("library").hidden = false;
        if ($("yours")) $("yours").hidden = replays.length === 0;
      },
      function () {
        asked = false;
        var out = $("signed-out");
        if (out) { out.hidden = false; out.textContent = T.failed; }
      }
    );
  }

  function account() {
    var inNow = !!site.account;
    if ($("signed-out")) $("signed-out").hidden = inNow;
    if (!inNow) {
      asked = false;
      if ($("library")) $("library").hidden = true;
      if ($("yours")) $("yours").hidden = true;
      if ($("meter")) $("meter").hidden = true;
      return;
    }
    load();
  }
  document.addEventListener("scmjs:account", account);
  if (site.account) account();

  /* The two lists as tabs, and the search over whichever shows. */
  if ($("tab-maps")) {
    var show = function (which) {
      ["maps", "replays"].forEach(function (k) {
        $("tab-" + k).setAttribute("aria-selected", k === which ? "true" : "false");
        $("panel-" + k).hidden = k !== which;
      });
    };
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
})();

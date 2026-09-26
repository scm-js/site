/*
 * The language choice, remembered. Two jobs, both optional — every page reads correctly
 * without this file:
 *
 *  - a click on a link carrying data-lang (the top bar's switch, and the offer below)
 *    remembers that language;
 *  - an English page, seen by a browser that asks for Korean by someone who has not chosen
 *    yet, offers the Korean page in one dismissable line. It never redirects: search
 *    engines and people who wanted English both get the page they asked for.
 *
 * The Korean page's address comes from the page's own <link rel="alternate" hreflang="ko">,
 * so a page with no Korean version offers nothing.
 */
(function () {
  var KEY = "scmjs-lang";

  function get() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }
  function set(v) {
    try {
      localStorage.setItem(KEY, v);
    } catch (e) {}
  }

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("a[data-lang]");
    if (a) set(a.getAttribute("data-lang"));
  });

  if (document.documentElement.lang !== "en" || get()) return;
  var alt = document.querySelector('link[rel="alternate"][hreflang="ko"]');
  if (!alt) return;
  var langs = navigator.languages || [navigator.language || ""];
  var wantsKo = false;
  for (var i = 0; i < langs.length; i++) if (/^ko\b/i.test(langs[i])) wantsKo = true;
  if (!wantsKo) return;

  var bar = document.createElement("div");
  bar.className = "lang-suggest";
  bar.lang = "ko";
  bar.innerHTML =
    '<span>이 페이지는 한국어로도 볼 수 있습니다.</span>' +
    '<a data-lang="ko" href="' + alt.getAttribute("href") + '">한국어로 보기</a>' +
    '<button type="button" aria-label="닫기">×</button>';
  bar.querySelector("button").addEventListener("click", function () {
    set("en");
    bar.remove();
  });
  var nav = document.querySelector(".topbar");
  if (nav) nav.insertAdjacentElement("afterend", bar);
})();

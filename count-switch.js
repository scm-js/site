// The privacy page's switch for the visit and feature counts: `scmjs.counting` set to "off"
// in this browser stops the counting script (`/_e.js`) on scmjs.dev, the editor's
// Preferences ▸ General ▸ Privacy writes the same entry. Shown only where the browser keeps
// anything, since otherwise there is nothing to switch.
(function () {
  var KEY = "scmjs.counting";
  var row = document.querySelector(".count-switch");
  var button = document.getElementById("count-switch");
  var state = document.getElementById("count-state");
  if (!row || !button || !state) return;
  var store;
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { return; }
  function show() {
    var off = store.getItem(KEY) === "off";
    button.textContent = off ? "Count this browser again" : "Stop counting this browser";
    state.textContent = off ? "Counting is off in this browser." : "Counting is on in this browser.";
  }
  button.addEventListener("click", function () {
    try {
      if (store.getItem(KEY) === "off") store.removeItem(KEY); else store.setItem(KEY, "off");
    } catch (e) { /* nothing to be done */ }
    show();
  });
  show();
  row.hidden = false;
})();

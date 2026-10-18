/* Light password gate, part 1 (runs in <head>, before the page is drawn).
   A device that has entered the password once keeps access for good: the unlock is stored in
   localStorage and in a long-lived cookie, and each visit renews the cookie. Only the SHA-256 hash of
   the password is in this code. This is a light gate: the repository is public, so its files can still
   be read on GitHub. To change the password, replace HASH here with the new password's SHA-256 hex. */
(function () {
  var HASH = '5e9e46004523d438dcec07914edf31c3d4f70e4d3b5af807722f686d307dffd3';
  var KEY = 'sq-pass';
  var COOKIE_DAYS = 400; // browsers cap cookies near this; each visit renews it
  window.SQ_GATE = { hash: HASH, key: KEY, days: COOKIE_DAYS };
  var ok = false;
  try { ok = window.localStorage.getItem(KEY) === HASH; } catch (e) { /* storage blocked */ }
  if (!ok) ok = document.cookie.split('; ').indexOf(KEY + '=' + HASH) !== -1;
  if (ok) {
    try { window.localStorage.setItem(KEY, HASH); } catch (e) { /* storage blocked */ }
    document.cookie = KEY + '=' + HASH + '; max-age=' + (COOKIE_DAYS * 86400) + '; path=/; samesite=lax';
  } else {
    document.documentElement.classList.add('gate-locked');
  }
})();

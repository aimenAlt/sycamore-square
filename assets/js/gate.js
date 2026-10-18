/* Light password gate, part 2: the panel. gate-head.js has already hidden the page if this device has
   not entered the password; this builds the panel, checks the entry against the stored SHA-256 hash and,
   when it matches, remembers this device for good and shows the page. */
(function () {
  'use strict';
  var root = document.documentElement;
  var cfg = window.SQ_GATE;
  if (!cfg || !root.classList.contains('gate-locked')) return;

  function toHex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  var gate = document.createElement('div');
  gate.className = 'gate';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-labelledby', 'gate-title');
  gate.innerHTML =
    '<div class="gate-bg" aria-hidden="true"></div>' +
    '<form class="gate-card" novalidate>' +
      '<span class="gate-mark" aria-hidden="true">S</span>' +
      '<p class="gate-eyebrow">PRIVATE STUDY</p>' +
      '<h1 class="gate-title" id="gate-title">Sycamore Square</h1>' +
      '<p class="gate-text">This study is shared privately. Enter the password you were given. You will only be asked once on this device.</p>' +
      '<label class="gate-label" for="gate-input">Password</label>' +
      '<input class="gate-input" id="gate-input" name="password" type="password" autocomplete="current-password" autocapitalize="none" spellcheck="false" required>' +
      '<p class="gate-error" id="gate-error" role="alert" aria-live="assertive"></p>' +
      '<button class="button gate-button" type="submit">Open the study</button>' +
    '</form>';
  document.body.appendChild(gate);

  var form = gate.querySelector('form');
  var input = gate.querySelector('#gate-input');
  var error = gate.querySelector('#gate-error');
  input.setAttribute('aria-describedby', 'gate-error');
  input.focus();

  function unlock() {
    try { window.localStorage.setItem(cfg.key, cfg.hash); } catch (e) { /* storage blocked: the cookie still works */ }
    document.cookie = cfg.key + '=' + cfg.hash + '; max-age=' + (cfg.days * 86400) + '; path=/; samesite=lax';
    root.classList.remove('gate-locked');
    gate.remove();
    var main = document.getElementById('main');
    if (main) main.focus({ preventScroll: true });
    window.dispatchEvent(new Event('resize')); // let sticky headers and charts measure the now-visible page
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var value = input.value;
    if (!value) { error.textContent = 'Please enter the password.'; return; }
    if (!window.crypto || !window.crypto.subtle) {
      error.textContent = 'This browser cannot check the password. Please open the page in an up-to-date browser.';
      return;
    }
    window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)).then(function (buf) {
      if (toHex(buf) === cfg.hash) {
        unlock();
      } else {
        error.textContent = 'That password is not right. Please check it and try again.';
        input.select();
      }
    });
  });
})();

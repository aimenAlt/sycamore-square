(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function scrollBehavior() {
    return reduceMotion.matches ? 'auto' : 'smooth';
  }

  /* Sticky header height drives scroll-margin-top on sections. */
  var header = document.querySelector('.site-header');
  function setHeaderHeight() {
    if (!header) return;
    root.style.setProperty('--header-h', (header.offsetHeight + 8) + 'px');
    root.style.setProperty('--header-bar', header.offsetHeight + 'px');
  }
  setHeaderHeight();
  window.addEventListener('resize', setHeaderHeight);

  /* Hamburger menu below 1200px: opens a panel under the header; closes on a link, Escape or a tap outside. */
  var menuToggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('site-menu');
  function setMenu(open, opts) {
    if (!menuToggle || !menu) return;
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.classList.toggle('open', open);
    if (open) {
      var cur = menu.querySelector('[aria-current="true"]');
      if (cur) menu.scrollTop = cur.offsetTop - menu.clientHeight / 2;
    } else if (opts && opts.focusToggle) {
      menuToggle.focus();
    }
  }
  if (menuToggle && menu) {
    menuToggle.addEventListener('click', function () {
      setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false, { focusToggle: true });
    });
    document.addEventListener('click', function (e) {
      if (menu.classList.contains('open') && !header.contains(e.target)) setMenu(false);
    });
    window.matchMedia('(min-width: 1200px)').addEventListener('change', function () { setMenu(false); });
  }


  /* WAI-ARIA tabs with roving tabindex. Without JS every panel shows stacked. */
  function initTabs(group) {
    var list = group.querySelector('.tablist');
    var tabs = Array.prototype.slice.call(list.querySelectorAll('.tab'));
    var panels = tabs.map(function (tab) {
      return document.getElementById(tab.getAttribute('aria-controls'));
    });
    var useHash = group.hasAttribute('data-tabs-hash');

    list.setAttribute('role', 'tablist');
    if (list.dataset.label) {
      list.setAttribute('aria-label', list.dataset.label);
      // Visible caption so the row reads as a set of choices, not a heading.
      var caption = document.createElement('p');
      caption.className = 'tablist-label';
      caption.setAttribute('aria-hidden', 'true');
      caption.textContent = list.dataset.label + ' · choose one of ' + tabs.length;
      list.parentNode.insertBefore(caption, list);
    }
    tabs.forEach(function (tab, i) {
      tab.setAttribute('role', 'tab');
      panels[i].setAttribute('role', 'tabpanel');
      panels[i].setAttribute('aria-labelledby', tab.id);
      panels[i].tabIndex = 0;
    });

    function select(index, opts) {
      opts = opts || {};
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      if (opts.focus) tabs[index].focus({ preventScroll: true });
      if (useHash && opts.updateHash && history.replaceState) {
        history.replaceState(null, '', '#' + panels[index].id);
      }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        select(i, { updateHash: true });
      });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        var last = tabs.length - 1;
        switch (e.key) {
          case 'ArrowRight': next = i === last ? 0 : i + 1; break;
          case 'ArrowLeft': next = i === 0 ? last : i - 1; break;
          case 'Home': next = 0; break;
          case 'End': next = last; break;
          default: return;
        }
        e.preventDefault();
        select(next, { focus: true, updateHash: true });
      });
    });

    function indexForHash() {
      var id = decodeURIComponent(location.hash.slice(1));
      for (var i = 0; i < panels.length; i++) {
        if (panels[i].id === id) return i;
      }
      return -1;
    }

    var initial = useHash ? indexForHash() : -1;
    select(initial >= 0 ? initial : 0);

    if (useHash) {
      if (initial >= 0) {
        // Bring the tab row into view once layout and fonts settle.
        var reveal = function () { list.scrollIntoView({ block: 'start' }); };
        if (document.readyState === 'complete') reveal();
        else window.addEventListener('load', reveal, { once: true });
      }
      window.addEventListener('hashchange', function () {
        var i = indexForHash();
        if (i >= 0) {
          select(i);
          list.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
        }
      });
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-tabs]'), initTabs);

  /* Mark the nav chip for the section in view, and keep that chip visible in the sideways-scrolling nav. */
  var nav = document.querySelector('.site-nav');
  var navLinks = nav ? Array.prototype.filter.call(nav.querySelectorAll('a[href^="#"]'), function (a) {
    return document.getElementById(a.getAttribute('href').slice(1));
  }) : [];
  if (navLinks.length) {
    var navTargets = navLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var current = null;
    var spyTicking = false;
    var updateCurrent = function () {
      spyTicking = false;
      var line = header ? header.offsetHeight + 24 : 24;
      var found = null;
      navTargets.forEach(function (target, i) {
        if (target.getBoundingClientRect().top <= line) found = navLinks[i];
      });
      // At the very bottom, the last section counts as current even if it is short.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        found = navLinks[navLinks.length - 1];
      }
      if (found === current) return;
      if (current) current.removeAttribute('aria-current');
      current = found;
      if (!current) return;
      current.setAttribute('aria-current', 'true');
      // On wide screens the chip row scrolls sideways if it overflows; keep the current chip in view.
      var row = nav.querySelector('.nav-list');
      if (row && row.scrollWidth > row.clientWidth) {
        var cr = current.getBoundingClientRect(), rr = row.getBoundingClientRect();
        if (cr.left < rr.left + 28 || cr.right > rr.right - 28) {
          row.scrollTo({ left: row.scrollLeft + cr.left - rr.left - 28, behavior: scrollBehavior() });
        }
      }
    };
    window.addEventListener('scroll', function () {
      if (!spyTicking) {
        spyTicking = true;
        window.requestAnimationFrame(updateCurrent);
      }
    }, { passive: true });
    window.addEventListener('resize', updateCurrent);
    updateCurrent();
  }

  /* Area bar: hide a label when its segment is too narrow to show it. */
  var segs = Array.prototype.slice.call(document.querySelectorAll('.area-bar .seg'));
  function fitBarLabels() {
    segs.forEach(function (seg) {
      var label = seg.querySelector('.seg-label');
      if (!label) return;
      label.hidden = false;
      var style = getComputedStyle(seg);
      var room = seg.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      label.hidden = label.offsetWidth > room;
    });
  }
  if (segs.length) {
    fitBarLabels();
    window.addEventListener('resize', fitBarLabels);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBarLabels);
  }

  /* Ledger integrity: rows must sum to the listed total. */
  var totalRow = document.querySelector('[data-sf-total]');
  if (totalRow) {
    var sum = 0;
    Array.prototype.forEach.call(document.querySelectorAll('.ledger tbody [data-sf]'), function (row) {
      sum += Number(row.getAttribute('data-sf'));
    });
    var total = Number(totalRow.getAttribute('data-sf-total'));
    if (sum !== total) {
      console.error('Building area ledger rows sum to ' + sum + ' SF, but the total is ' + total + ' SF.');
    }
  }

  /* Back to top, shown after one screen of scrolling. */
  var toTop = document.querySelector('.to-top');
  if (toTop) {
    var ticking = false;
    var updateToTop = function () {
      ticking = false;
      toTop.hidden = window.scrollY < window.innerHeight;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateToTop);
      }
    }, { passive: true });
    updateToTop();
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
      var mark = document.querySelector('.wordmark');
      if (mark) mark.focus({ preventScroll: true });
    });
  }
})();

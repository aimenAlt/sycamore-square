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
    if (header) root.style.setProperty('--header-h', (header.offsetHeight + 8) + 'px');
  }
  setHeaderHeight();
  window.addEventListener('resize', setHeaderHeight);

  /* Edge fade on sideways scrollers (nav, tab rows): fade only the edges with more content behind them. */
  function updateFade(el) {
    var max = el.scrollWidth - el.clientWidth;
    el.classList.toggle('scrolled', el.scrollLeft > 2);
    el.classList.toggle('at-end', el.scrollLeft >= max - 2);
  }
  Array.prototype.forEach.call(document.querySelectorAll('.site-nav, .tablist'), function (el) {
    el.addEventListener('scroll', function () { updateFade(el); }, { passive: true });
    window.addEventListener('resize', function () { updateFade(el); });
    updateFade(el);
  });

  /* WAI-ARIA tabs with roving tabindex. Without JS every panel shows stacked. */
  function initTabs(group) {
    var list = group.querySelector('.tablist');
    var tabs = Array.prototype.slice.call(list.querySelectorAll('.tab'));
    var panels = tabs.map(function (tab) {
      return document.getElementById(tab.getAttribute('aria-controls'));
    });
    var useHash = group.hasAttribute('data-tabs-hash');

    list.setAttribute('role', 'tablist');
    if (list.dataset.label) list.setAttribute('aria-label', list.dataset.label);
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
      // Keep the selected tab fully visible when the row scrolls sideways.
      var t = tabs[index];
      if (t.offsetLeft < list.scrollLeft) {
        list.scrollLeft = t.offsetLeft - 32;
      } else if (t.offsetLeft + t.offsetWidth > list.scrollLeft + list.clientWidth) {
        list.scrollLeft = t.offsetLeft + t.offsetWidth - list.clientWidth + 32;
      }
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

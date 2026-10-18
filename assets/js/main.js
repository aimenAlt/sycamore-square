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

  /* "On this page" below 1100px: one button that names the current section and opens the full list.
     It closes on a link, Escape, a tap outside, or when the screen grows wide enough to show the chips. */
  var sectionToggle = document.querySelector('.section-toggle');
  var sectionMenu = document.getElementById('section-menu');
  function setSectionMenu(open, opts) {
    if (!sectionToggle || !sectionMenu) return;
    sectionToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    sectionMenu.classList.toggle('open', open);
    if (open) {
      var cur = sectionMenu.querySelector('[aria-current="true"]');
      if (cur) sectionMenu.scrollTop = cur.offsetTop - sectionMenu.clientHeight / 2;
    } else if (opts && opts.focusToggle) {
      sectionToggle.focus();
    }
  }
  if (sectionToggle && sectionMenu) {
    sectionToggle.addEventListener('click', function () {
      setSectionMenu(sectionToggle.getAttribute('aria-expanded') !== 'true');
    });
    sectionMenu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setSectionMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sectionMenu.classList.contains('open')) setSectionMenu(false, { focusToggle: true });
    });
    document.addEventListener('click', function (e) {
      if (sectionMenu.classList.contains('open') && !header.contains(e.target)) setSectionMenu(false);
    });
    window.matchMedia('(min-width: 1100px)').addEventListener('change', function () { setSectionMenu(false); });
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

  /* Mark the section in view: the chip (wide screens), the name on the "On this page" button, and the
     reading-progress bar. Sections can be shown or hidden later (feasibility.js), so the list is read each time. */
  var nav = document.querySelector('.site-nav');
  var currentLabel = document.querySelector('.section-current');
  var progressBar = document.querySelector('.read-progress-bar');
  var startLabel = currentLabel ? currentLabel.textContent : '';
  var allNavLinks = nav ? Array.prototype.filter.call(nav.querySelectorAll('a[href^="#"]'), function (a) {
    return document.getElementById(a.getAttribute('href').slice(1));
  }) : [];
  if (allNavLinks.length || progressBar) {
    var current = null;
    var spyTicking = false;
    var updateCurrent = function () {
      spyTicking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var atBottom = window.scrollY >= max - 2;
      if (progressBar) progressBar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';

      var links = allNavLinks.filter(function (a) { var li = a.closest('li'); return !(li && li.hidden); });
      // A section counts as current once its top reaches the line it scrolls to when its link is used
      // (its scroll-margin, which on the feasibility page also clears the sticky scenario bar).
      var found = null;
      links.forEach(function (a) {
        var target = document.getElementById(a.getAttribute('href').slice(1));
        var line = (parseFloat(getComputedStyle(target).scrollMarginTop) || (header ? header.offsetHeight : 0)) + 16;
        if (target.getBoundingClientRect().top <= line) found = a;
      });
      // At the very bottom, the last section counts as current even if it is short.
      if (atBottom && links.length) found = links[links.length - 1];
      if (found === current) return;
      if (current) current.removeAttribute('aria-current');
      current = found;
      if (currentLabel) currentLabel.textContent = current ? current.textContent : startLabel;
      if (!current) return;
      current.setAttribute('aria-current', 'true');
      // On wide screens the chip row scrolls sideways if it overflows; keep the current chip in view.
      var row = nav.querySelector('.nav-list');
      if (row && window.matchMedia('(min-width: 1100px)').matches && row.scrollWidth > row.clientWidth) {
        var cr = current.getBoundingClientRect(), rr = row.getBoundingClientRect();
        if (cr.left < rr.left + 28 || cr.right > rr.right - 28) {
          row.scrollTo({ left: row.scrollLeft + cr.left - rr.left - 28, behavior: scrollBehavior() });
        }
      }
    };
    var requestUpdate = function () {
      if (!spyTicking) {
        spyTicking = true;
        window.requestAnimationFrame(updateCurrent);
      }
    };
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    window.addEventListener('load', requestUpdate);
    updateCurrent();
  }

  /* Documents: filter chips narrow the library to one kind of document. Counts come from the cards. */
  var library = document.getElementById('doc-library');
  var filterButtons = Array.prototype.slice.call(document.querySelectorAll('.doc-filter'));
  if (library && filterButtons.length) {
    var docItems = Array.prototype.slice.call(library.querySelectorAll('.doc'));
    var filterStatus = document.getElementById('doc-filter-status');
    filterButtons.forEach(function (btn) {
      var f = btn.getAttribute('data-filter');
      var count = btn.querySelector('.doc-count');
      if (count) {
        count.textContent = docItems.filter(function (li) { return f === 'all' || li.getAttribute('data-cat') === f; }).length;
      }
      btn.addEventListener('click', function () {
        var shown = 0;
        filterButtons.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        docItems.forEach(function (li) {
          li.hidden = f !== 'all' && li.getAttribute('data-cat') !== f;
          if (!li.hidden) shown++;
        });
        if (filterStatus) filterStatus.textContent = 'Showing ' + shown + ' of ' + docItems.length + ' documents.';
      });
    });
  }

  /* PDF viewer: on large screens with a mouse, a PDF link opens the document over the page, with
     "Open in new tab", "Download" and "Close". Phones and tablets open the PDF in their own viewer as before. */
  var viewer = null;
  var viewerFrame = null;
  var viewerOpener = null;
  function canEmbedPdf() {
    if (typeof HTMLDialogElement !== 'function') return false;
    if (navigator.pdfViewerEnabled === false) return false;
    return window.matchMedia('(min-width: 900px) and (pointer: fine)').matches;
  }
  function docTitle(a) {
    if (a.getAttribute('data-doc-title')) return a.getAttribute('data-doc-title');
    var card = a.closest('.doc-card');
    var t = card && card.querySelector('.doc-title');
    if (t) return t.textContent.trim();
    var copy = a.cloneNode(true);
    Array.prototype.forEach.call(copy.querySelectorAll('.button-meta, .visually-hidden'), function (n) { n.remove(); });
    return copy.textContent.replace(/\s*\(PDF\)\s*/i, ' ').replace(/[→↗]/g, '').trim() || 'Document';
  }
  function buildViewer() {
    viewer = document.createElement('dialog');
    viewer.className = 'doc-viewer';
    viewer.setAttribute('aria-labelledby', 'doc-viewer-title');
    viewer.innerHTML =
      '<div class="doc-viewer-bar">' +
        '<p class="doc-viewer-title" id="doc-viewer-title"></p>' +
        '<a class="doc-action" data-role="tab" target="_blank" rel="noopener">Open in new tab</a>' +
        '<a class="doc-action" data-role="download" download>Download</a>' +
        '<button type="button" class="doc-viewer-close">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>Close' +
        '</button>' +
      '</div>' +
      '<iframe class="doc-viewer-frame"></iframe>';
    document.body.appendChild(viewer);
    viewerFrame = viewer.querySelector('iframe');
    viewer.querySelector('.doc-viewer-close').addEventListener('click', function () { viewer.close(); });
    viewer.addEventListener('click', function (e) { if (e.target === viewer) viewer.close(); });
    viewer.addEventListener('close', function () {
      viewerFrame.src = 'about:blank';
      document.body.classList.remove('viewer-open');
      if (viewerOpener) viewerOpener.focus({ preventScroll: true });
    });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href$=".pdf"]');
    if (!a || a.hasAttribute('download') || a.target === '_blank') return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!canEmbedPdf()) return;
    e.preventDefault();
    if (!viewer) buildViewer();
    var href = a.getAttribute('href');
    var title = docTitle(a);
    viewer.querySelector('.doc-viewer-title').textContent = title;
    viewer.querySelector('[data-role="tab"]').href = href;
    viewer.querySelector('[data-role="download"]').href = href;
    viewerFrame.title = title;
    viewerFrame.src = href;
    viewerOpener = a;
    document.body.classList.add('viewer-open');
    viewer.showModal();
  });

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

  /* Back to top: appears after one screen of scrolling, but only while the reader scrolls back up,
     so it never sits on top of the text they are reading on the way down. */
  var toTop = document.querySelector('.to-top');
  if (toTop) {
    var ticking = false;
    var lastY = window.scrollY;
    var updateToTop = function () {
      ticking = false;
      var y = window.scrollY;
      var goingUp = y < lastY - 2;
      var goingDown = y > lastY + 2;
      if (y < window.innerHeight) toTop.hidden = true;
      else if (goingUp) toTop.hidden = false;
      else if (goingDown && document.activeElement !== toTop) toTop.hidden = true;
      lastY = y;
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

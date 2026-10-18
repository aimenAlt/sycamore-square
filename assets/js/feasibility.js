/* Feasibility page: every number comes from assets/feasibility.json. Nothing here is typed in by hand. */
(function () {
  'use strict';

  var MINUS = '−';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var SCENARIOS = ['worst', 'realistic', 'best'];
  var LABELS = { worst: 'worst', realistic: 'realistic', best: 'best' };

  /* ---------- Formatting ---------- */

  function sign(v) { return v < 0 ? MINUS : ''; }
  // $17.73M at or above $1M, $870k below.
  function money(v) {
    if (v === null || v === undefined) return 'n/a';
    var a = Math.abs(v);
    if (a >= 1e6) return sign(v) + '$' + (a / 1e6).toFixed(2) + 'M';
    if (a === 0) return '$0';
    return sign(v) + '$' + Math.round(a / 1000) + 'k';
  }
  // Rounded for running text: "about $17.7M", "about $870k".
  function moneyAbout(v) {
    var a = Math.abs(v);
    if (a >= 1e6) return sign(v) + '$' + (a / 1e6).toFixed(1) + 'M';
    return sign(v) + '$' + Math.round(a / 10000) * 10 + 'k';
  }
  function moneySigned(v) { return (v > 0 ? '+' : '') + money(v); }
  // Round half up to one decimal; the epsilon stops 0.1235 * 100 = 12.3499… from rounding down.
  function one(x) { return (Math.round(Math.abs(x) * 10 + 1e-7) / 10).toFixed(1); }
  function pct(r) { return r === null || r === undefined ? 'n/a' : sign(r) + one(r * 100) + '%'; }
  function pctPoints(p) { return sign(p) + one(p) + '%'; } // levers are already in percent
  // Cap rates keep their second decimal (8.25%), so they match the chart's reference line.
  function capPct(r) { return parseFloat((r * 100).toFixed(2)) + '%'; }
  function perSF(v) { return '$' + v.toFixed(2) + '/SF'; }
  function int(v) { return Math.round(v).toLocaleString('en-US'); }
  function years(v) { return v === null ? 'Does not pay back' : v.toFixed(1) + ' years'; }

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function svg(tag, attrs, text) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function line(rows, name) {
    for (var i = 0; i < rows.length; i++) if (rows[i][0] === name) return rows[i][1];
    return null;
  }

  /* ---------- Tables ---------- */

  function fillTable(table, head, rows, opts) {
    opts = opts || {};
    table.textContent = '';
    if (opts.caption) table.appendChild(el('caption', { class: 'visually-hidden' }, opts.caption));
    var thead = el('thead'); var tr = el('tr');
    head.forEach(function (h, i) { tr.appendChild(el('th', { scope: 'col', class: i === head.length - 1 && opts.lastNum !== false ? 'num' : '' }, h)); });
    thead.appendChild(tr); table.appendChild(thead);
    var tbody = el('tbody');
    rows.forEach(function (r) {
      var row = el('tr', r.cls ? { class: r.cls } : null);
      r.cells.forEach(function (c, i) {
        var isLast = i === r.cells.length - 1;
        var cell = el(i === 0 ? 'th' : 'td', i === 0 ? { scope: 'row' } : { class: isLast && opts.lastNum !== false ? 'num' : '' }, c);
        cell.setAttribute('data-label', head[i]);
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
  }

  /* ---------- Landlord ---------- */

  function renderLandlord(data, sc) {
    var L = data.landlord[sc];
    var k = L.kpis;
    var vmc = k.value_minus_cost;
    var tiles = [
      { label: 'All-in cost', value: money(k.total_cost), help: 'Total project cost, including buying, building work and leasing.' },
      { label: 'Net operating income', value: money(k.noi), help: 'Rent each year once leased, after property costs and before loan payments.' },
      { label: 'Yield on cost', value: pct(k.yield_on_cost), help: 'Net operating income as a share of the all-in cost.' },
      { label: 'Value once leased', value: money(k.value), help: 'Income valued at a ' + capPct(k.exit_cap) + ' cap rate, the rate a buyer might use.' },
      { label: 'Value minus cost', value: moneySigned(vmc), help: vmc >= 0 ? 'Positive: the finished property is worth more than it cost.' : 'Negative: the finished property is worth less than it cost.', tone: vmc >= 0 ? 'good' : 'bad' },
      { label: '10-year levered IRR', value: k.irr_levered === null ? 'negative' : pct(k.irr_levered), help: 'Yearly return on the owner’s cash over 10 years, with a loan.' }
    ];
    var ul = document.getElementById('kpis');
    ul.textContent = '';
    tiles.forEach(function (t) {
      var li = el('li', { class: 'kpi' + (t.tone ? ' kpi-' + t.tone : '') });
      li.appendChild(el('p', { class: 'kpi-label' }, t.label));
      li.appendChild(el('p', { class: 'kpi-value' }, t.value));
      li.appendChild(el('p', { class: 'kpi-help' }, t.help));
      ul.appendChild(li);
    });

    // Budget: soft items, hard-cost run (Roof through Flood mitigation) with its subtotal, then the rest.
    var b = L.budget;
    var hardStart = -1, hardEnd = -1;
    for (var i = 0; i < b.length; i++) { if (b[i][0] === 'Roof') hardStart = i; if (b[i][0] === 'Flood mitigation') hardEnd = i; }
    var rows = [];
    b.forEach(function (r, idx) {
      rows.push({ cells: [r[0], money(r[1])], cls: idx >= hardStart && idx <= hardEnd ? 'is-hard' : '' });
      if (idx === hardEnd) rows.push({ cells: ['Building work subtotal (hard cost)', money(L.budget_subtotal_hard)], cls: 'is-subtotal' });
    });
    rows.push({ cells: ['Purchase and transaction costs', 'Not published'], cls: 'is-muted' });
    rows.push({ cells: ['All-in cost', money(k.total_cost)], cls: 'is-total' });
    fillTable(document.getElementById('budget-table'), ['Item', 'Cost'], rows, { caption: 'Development budget, ' + LABELS[sc] + ' case' });

    fillTable(document.getElementById('rent-table'), ['Tenant', 'Assumption', 'Rent a year'],
      L.rent_roll.map(function (r) { return { cells: [r[0], r[2], money(r[1])] }; }),
      { caption: 'Rent roll, ' + LABELS[sc] + ' case' });

    var totals = { 'Effective gross income': 'is-subtotal', 'Net operating income': 'is-total', 'Cash flow after debt': 'is-total' };
    fillTable(document.getElementById('income-table'), ['Line', 'Per year'],
      L.income.map(function (r) { return { cells: [r[0], money(r[1])], cls: totals[r[0]] || (r[1] < 0 ? 'is-cost' : '') }; }),
      { caption: 'Income and debt, ' + LABELS[sc] + ' case' });

    var o = L.owner_run;
    document.getElementById('owner-note').textContent =
      'Owner runs the halls and kids’ center: ' + money(o.cash_flow) + ' a year on ' + money(o.capital) + ' (' + pct(o.yield) + ').';
  }

  /* ---------- Operators ---------- */

  var OPS = [
    { key: 'halls', title: 'Event halls (Hall A and Hall B)' },
    { key: 'kids', title: 'Kids’ recreation center' },
    { key: 'fuel', title: 'Fuel and C-store (owner-run)' },
    { key: 'retail_tenant', title: 'Retail shop tenant' }
  ];
  var LINE_TOTALS = { 'Revenue': 1, 'Profit before rent': 1, 'Profit after rent': 1, 'Store gross profit': 1 };

  function renderOperators(data, sc) {
    var wrap = document.getElementById('op-cards');
    var openState = {};
    Array.prototype.forEach.call(wrap.querySelectorAll('details'), function (d) { openState[d.getAttribute('data-key')] = d.open; });
    wrap.textContent = '';
    OPS.forEach(function (op) {
      var d = data.operator[sc][op.key];
      var card = el('article', { class: 'op-card', 'aria-labelledby': 'op-' + op.key });
      var head = el('div', { class: 'op-head' });
      head.appendChild(el('h3', { id: 'op-' + op.key }, op.title));
      var badge = el('p', { class: 'verdict' });
      badge.appendChild(el('span', { class: 'verdict-label' }, 'Verdict'));
      badge.appendChild(document.createTextNode(data.verdicts[op.key]));
      head.appendChild(badge);
      card.appendChild(head);

      var facts = [];
      if (op.key === 'retail_tenant') {
        facts.push(['Rent', perSF(d.rent_psf) + ' a year']);
        facts.push(['Shared costs (NNN)', perSF(d.nnn_psf) + ' a year']);
        facts.push(['Sales needed', '$' + int(d.sales_psf_needed) + '/SF a year']);
        facts.push(['For a 1,500 SF shop', money(d.sales_1500sf_shop) + ' of sales a year']);
      } else {
        var par = line(d.lines, 'Profit after rent');
        facts.push(['Profit after rent', money(par) + ' a year', par < 0 ? 'bad' : 'good']);
        facts.push(['Operator investment', money(d.investment)]);
        facts.push(['Payback', years(d.payback_years)]);
        facts.push(['Cash return', pct(d.cash_return)]);
        if (op.key === 'halls') {
          facts.push(['Events per year', int(d.events)]);
          facts.push(['Break-even events', int(d.breakeven_events) + ' a year']);
        }
        if (op.key === 'kids') facts.push(['Break-even revenue', money(d.breakeven_revenue) + ' a year']);
        if (op.key === 'fuel') facts.push(['Fuel sold', int(d.gallons_month) + ' gallons a month']);
      }
      var dl = el('dl', { class: 'op-facts' });
      facts.forEach(function (f) {
        var row = el('div', { class: 'op-fact' + (f[2] ? ' is-' + f[2] : '') });
        row.appendChild(el('dt', null, f[0]));
        row.appendChild(el('dd', null, f[1]));
        dl.appendChild(row);
      });
      card.appendChild(dl);

      if (d.lines) {
        var det = el('details', { class: 'detail detail-compact', 'data-key': op.key });
        if (openState[op.key]) det.open = true;
        var sum = el('summary');
        sum.appendChild(el('span', { class: 'detail-title' }, 'Line items'));
        sum.appendChild(el('span', { class: 'detail-hint' }, 'Income and costs for one year'));
        det.appendChild(sum);
        var body = el('div', { class: 'detail-body' });
        var t = el('table', { class: 'money-table' });
        fillTable(t, ['Line', 'Per year'], d.lines.map(function (r) {
          return { cells: [r[0], money(r[1])], cls: r[0] === 'Profit after rent' ? 'is-total' : (LINE_TOTALS[r[0]] ? 'is-subtotal' : (r[1] < 0 ? 'is-cost' : '')) };
        }), { caption: op.title + ', ' + LABELS[sc] + ' case' });
        body.appendChild(t);
        det.appendChild(body);
        card.appendChild(det);
      }
      wrap.appendChild(card);
    });
  }

  /* ---------- Charts ---------- */

  // Split a label into at most two lines of about maxChars each.
  function wrapLabel(text, maxChars) {
    if (text.length <= maxChars) return [text];
    var words = text.split(' '), a = '', i = 0;
    while (i < words.length && (a + ' ' + words[i]).trim().length <= maxChars) { a = (a + ' ' + words[i]).trim(); i++; }
    if (!a) { a = words[0]; i = 1; }
    return [a, words.slice(i).join(' ')];
  }
  function addText(g, x, y, lines, attrs) {
    var t = svg('text', Object.assign({ x: x, y: y }, attrs || {}));
    lines.forEach(function (ln, i) {
      var s = svg('tspan', { x: x, dy: i === 0 ? 0 : '1.2em' }, ln);
      t.appendChild(s);
    });
    g.appendChild(t);
    if (/\b(value|ref-label)\b/.test(t.getAttribute('class') || '')) {
      var bb = t.getBBox();
      g.insertBefore(svg('rect', { x: bb.x - 2, y: bb.y - 1, width: bb.width + 4, height: bb.height + 2, class: 'label-bg' }), t);
    }
    return t;
  }

  function renderWaterfall(data) {
    var box = document.getElementById('waterfall');
    var lv = data.levers, refs = data.lever_refs;
    var first = lv[0][1], last = lv[lv.length - 1][1];
    var title = 'Every lever together lifts the realistic yield from ' + pctPoints(first) + ' to ' + pctPoints(last) + ', still short of ' + refs.target.toFixed(0) + '%';
    document.getElementById('waterfall-title').textContent = title;
    document.getElementById('waterfall-caption').textContent =
      'Realistic case only: the scenario switch above does not change this chart. Yield on cost, in percent. Grey bars are totals; each green step is the gain from one change, applied in order. Dashed lines: the ' + refs.exit_cap + '% exit cap rate and the ' + refs.target.toFixed(0) + '% target.';

    var steps = lv.map(function (r, i) {
      return i === 0 ? { name: r[0], from: 0, to: r[1], kind: 'total' } : { name: r[0], from: lv[i - 1][1], to: r[1], kind: 'step' };
    });
    steps.push({ name: 'All levers together', from: 0, to: last, kind: 'total' });

    var W = Math.max(300, box.clientWidth);
    var maxV = Math.ceil(refs.target + 1);
    var root = svg('svg', { viewBox: '0 0 ' + W + ' 0', role: 'img', 'aria-label': title, class: 'chart-svg' });
    var g = svg('g', { 'aria-hidden': 'true' }); root.appendChild(g);
    box.textContent = '';
    box.appendChild(root);
    var H;

    function label(s) { return s.kind === 'total' ? pctPoints(s.to) : '+' + one(s.to - s.from); }

    if (W >= 640) {
      // Columns.
      var m = { l: 44, r: 12, t: 30, b: 52 };
      H = 380;
      var pw = W - m.l - m.r, ph = H - m.t - m.b;
      var y = function (v) { return m.t + ph - (v / maxV) * ph; };
      for (var gv = 0; gv <= maxV; gv += 2) {
        g.appendChild(svg('line', { x1: m.l, x2: W - m.r, y1: y(gv), y2: y(gv), class: 'grid' }));
        addText(g, m.l - 8, y(gv) + 4, [gv + '%'], { class: 'axis', 'text-anchor': 'end' });
      }
      [[refs.target, 'Target ' + refs.target.toFixed(0) + '%'], [refs.exit_cap, 'Exit cap rate ' + refs.exit_cap + '%']].forEach(function (r) {
        g.appendChild(svg('line', { x1: m.l, x2: W - m.r, y1: y(r[0]), y2: y(r[0]), class: 'ref' }));
        addText(g, W - m.r, y(r[0]) - 6, [r[1]], { class: 'ref-label', 'text-anchor': 'end' });
      });
      var band = pw / steps.length, bw = Math.min(64, band * 0.62);
      var maxChars = Math.max(8, Math.floor(band / 7.2));
      steps.forEach(function (s, i) {
        var cx = m.l + band * i + band / 2;
        var top = y(Math.max(s.from, s.to)), bot = y(Math.min(s.from, s.to));
        g.appendChild(svg('rect', { x: cx - bw / 2, y: top, width: bw, height: Math.max(2, bot - top), class: s.kind === 'total' ? 'bar-total' : 'bar-step' }));
        addText(g, cx, top - 7, [label(s)], { class: 'value', 'text-anchor': 'middle' });
        addText(g, cx, H - m.b + 18, wrapLabel(s.name, maxChars), { class: 'cat', 'text-anchor': 'middle' });
      });
    } else {
      // Rows, for phones: each label on its own line, its bar underneath, so the bars get the full width.
      var m2 = { l: 4, r: 46, t: 48, b: 28 };
      var rowH = 52;
      H = m2.t + rowH * steps.length + m2.b;
      var pw2 = W - m2.l - m2.r;
      var x = function (v) { return m2.l + (v / maxV) * pw2; };
      for (var gx = 0; gx <= maxV; gx += 2) {
        g.appendChild(svg('line', { x1: x(gx), x2: x(gx), y1: m2.t - 8, y2: H - m2.b, class: 'grid' }));
        addText(g, x(gx), H - m2.b + 16, [gx + '%'], { class: 'axis', 'text-anchor': gx === 0 ? 'start' : 'middle' });
      }
      [[refs.exit_cap, 'Exit cap ' + refs.exit_cap + '%', 16], [refs.target, 'Target ' + refs.target.toFixed(0) + '%', 34]].forEach(function (r) {
        g.appendChild(svg('line', { x1: x(r[0]), x2: x(r[0]), y1: r[2] + 5, y2: H - m2.b, class: 'ref' }));
        addText(g, x(r[0]) - 4, r[2], [r[1]], { class: 'ref-label', 'text-anchor': 'end' });
      });
      steps.forEach(function (s, i) {
        var top = m2.t + rowH * i;
        var bh = 18, cy = top + 30;
        addText(g, m2.l, top + 12, [s.name], { class: 'cat', 'text-anchor': 'start' });
        var x0 = x(Math.min(s.from, s.to)), x1 = x(Math.max(s.from, s.to));
        g.appendChild(svg('rect', { x: x0, y: cy - bh / 2, width: Math.max(2, x1 - x0), height: bh, class: s.kind === 'total' ? 'bar-total' : 'bar-step' }));
        addText(g, x1 + 5, cy + 4, [label(s)], { class: 'value', 'text-anchor': 'start' });
      });
    }
    root.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    root.setAttribute('width', W);
    root.setAttribute('height', H);
  }

  function renderRange(data) {
    var box = document.getElementById('range-chart');
    var rows = [
      { key: 'kids', name: 'Kids’ recreation center' },
      { key: 'halls', name: 'Event halls' },
      { key: 'fuel', name: 'Fuel and C-store (owner-run)' }
    ].map(function (r) {
      return { name: r.name, w: data.operator.worst[r.key].cash_return, m: data.operator.realistic[r.key].cash_return, b: data.operator.best[r.key].cash_return };
    });
    var target = 0.15;
    var fuelReal = data.operator.realistic.fuel.cash_return;
    var title = 'The kids’ center comes closest to a ' + Math.round(target * 100) + '% operator return; owner-run fuel earns about ' + Math.round(fuelReal * 100) + '%';
    document.getElementById('range-title').textContent = title;
    document.getElementById('range-caption').textContent =
      'Yearly cash return to each operator. The grey line runs from the worst case to the best case; the blue dot and its label mark the realistic case. The dashed line is a ' + Math.round(target * 100) + '% return.';

    var lo = Math.floor(Math.min.apply(null, rows.map(function (r) { return r.w; })) * 10) / 10;
    var hi = Math.ceil(Math.max.apply(null, rows.map(function (r) { return r.b; })) * 10) / 10;
    var W = Math.max(300, box.clientWidth);
    var wide = W >= 640;
    var m = wide ? { l: 200, r: 24, t: 26, b: 34 } : { l: 24, r: 22, t: 22, b: 34 };
    var rowH = wide ? 56 : 88;
    var H = m.t + rowH * rows.length + m.b;
    var pw = W - m.l - m.r;
    var x = function (v) { return m.l + ((v - lo) / (hi - lo)) * pw; };
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': title, class: 'chart-svg' });
    var g = svg('g', { 'aria-hidden': 'true' }); root.appendChild(g);
    box.textContent = '';
    box.appendChild(root);
    var stepTick = wide ? 0.1 : 0.2;
    for (var t = Math.ceil(lo / stepTick) * stepTick; t <= hi + 1e-9; t += stepTick) {
      var tv = Math.round(t * 100) / 100;
      g.appendChild(svg('line', { x1: x(tv), x2: x(tv), y1: m.t - 4, y2: H - m.b, class: tv === 0 ? 'zero' : 'grid' }));
      addText(g, x(tv), H - m.b + 18, [pct(tv).replace('.0%', '%')], { class: 'axis', 'text-anchor': 'middle' });
    }
    g.appendChild(svg('line', { x1: x(target), x2: x(target), y1: m.t - 14, y2: H - m.b, class: 'ref' }));
    addText(g, x(target) + 4, m.t - 6, [Math.round(target * 100) + '% return'], { class: 'ref-label', 'text-anchor': 'start' });
    rows.forEach(function (r, i) {
      var cy = m.t + rowH * i + (wide ? rowH / 2 : 54);
      if (wide) addText(g, 0, cy + 4, [r.name], { class: 'cat', 'text-anchor': 'start' });
      else addText(g, m.l, cy - 34, [r.name], { class: 'cat cat-strong', 'text-anchor': 'start' });
      g.appendChild(svg('line', { x1: x(r.w), x2: x(r.b), y1: cy, y2: cy, class: 'range' }));
      g.appendChild(svg('line', { x1: x(r.w), x2: x(r.w), y1: cy - 6, y2: cy + 6, class: 'range' }));
      g.appendChild(svg('line', { x1: x(r.b), x2: x(r.b), y1: cy - 6, y2: cy + 6, class: 'range' }));
      addText(g, x(r.w), cy + 20, [pct(r.w)], { class: 'axis', 'text-anchor': 'middle' });
      addText(g, x(r.b), cy + 20, [pct(r.b)], { class: 'axis', 'text-anchor': 'end' });
      g.appendChild(svg('circle', { cx: x(r.m), cy: cy, r: 7, class: 'dot' }));
      addText(g, x(r.m), cy - 12, [pct(r.m)], { class: 'value', 'text-anchor': 'middle' });
    });
  }

  /* ---------- Static parts ---------- */

  function renderStatic(data) {
    var R = data.landlord.realistic.kpis, B = data.landlord.best.kpis;
    var lead = document.getElementById('feas-lead');
    lead.removeAttribute('data-loading');
    lead.textContent = 'At realistic Memphis rents the full plan costs about ' + moneyAbout(R.total_cost) +
      ' and earns about ' + moneyAbout(R.noi) + ' a year once leased: a ' + pct(R.yield_on_cost) +
      ' return. The best case returns ' + pct(B.yield_on_cost) + '.';
    var notes = document.getElementById('feas-notes');
    notes.textContent = '';
    Object.keys(data.notes).forEach(function (k) { notes.appendChild(el('li', null, data.notes[k])); });

    var cap = data.operator_rent_capacity;
    document.getElementById('rent-capacity').textContent =
      'At realistic bookings an outside hall operator can pay about ' + perSF(cap.halls_base_rent_psf_at_15pct) +
      ' and still earn 15%; the kids’ center about ' + perSF(cap.kids_base_rent_psf_at_15pct) + '.';

    fillTable(document.getElementById('risk-table'), ['Risk', 'What it would do', 'How to test it'],
      data.risks.map(function (r) { return { cells: r }; }), { lastNum: false, caption: 'Risks' });

    var src = document.getElementById('source-list');
    src.textContent = '';
    data.sources.forEach(function (s) {
      var li = el('li');
      var a = el('a', { href: s[1], target: '_blank', rel: 'noopener' }, s[0]);
      a.appendChild(el('span', { class: 'visually-hidden' }, ' (opens in a new tab)'));
      li.appendChild(a);
      src.appendChild(li);
    });
  }

  /* ---------- Scenario switch ---------- */

  function init(data) {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.seg-btn'));
    var status = document.getElementById('scenario-status');
    var current = null;

    function fromHash() {
      var h = location.hash.slice(1);
      return SCENARIOS.indexOf(h) >= 0 ? h : null;
    }
    function setScenario(sc, opts) {
      opts = opts || {};
      if (sc === current) return;
      current = sc;
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-scenario') === sc ? 'true' : 'false'); });
      Array.prototype.forEach.call(document.querySelectorAll('.scenario-name'), function (n) { n.textContent = LABELS[sc]; });
      document.body.setAttribute('data-scenario', sc);
      renderLandlord(data, sc);
      renderOperators(data, sc);
      status.textContent = 'Showing the ' + LABELS[sc] + ' case';
      if (opts.updateHash && history.replaceState) history.replaceState(null, '', '#' + sc);
    }

    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { setScenario(b.getAttribute('data-scenario'), { updateHash: true }); });
      b.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % buttons.length;
        if (e.key === 'ArrowLeft') n = (i - 1 + buttons.length) % buttons.length;
        if (n === null) return;
        e.preventDefault();
        buttons[n].focus();
        setScenario(buttons[n].getAttribute('data-scenario'), { updateHash: true });
      });
    });
    window.addEventListener('hashchange', function () { var h = fromHash(); if (h) setScenario(h); });

    renderStatic(data);
    setScenario(fromHash() || data.default || 'realistic');

    // Tables start open on wide screens and closed on phones.
    var wideMq = window.matchMedia('(min-width: 721px)');
    Array.prototype.forEach.call(document.querySelectorAll('details[data-open-desktop]'), function (d) { d.open = wideMq.matches; });

    var draw = function () { renderWaterfall(data); renderRange(data); };
    draw();
    var lastW = 0, pending = false;
    var onResize = function () {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(function () {
        pending = false;
        var w = document.getElementById('waterfall').clientWidth;
        if (w !== lastW) { lastW = w; draw(); }
      });
    };
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(document.getElementById('waterfall'));
    else window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  }

  fetch('assets/feasibility.json')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(init)
    .catch(function (err) {
      var lead = document.getElementById('feas-lead');
      lead.textContent = 'The numbers could not be loaded. Please refresh the page, or download the studies below.';
      lead.removeAttribute('data-loading');
      if (window.console) console.warn('feasibility.json failed to load', err);
    });
})();

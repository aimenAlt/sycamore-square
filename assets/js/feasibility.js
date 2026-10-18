/* Feasibility page. Every number and every sentence built from numbers comes from assets/feasibility.json (schema 2),
   so a regenerated JSON updates the page without code changes. Public page: what is paid for the property is never shown.
   Written for business owners: plain words, money in and out, and years to earn the build money back. */
(function () {
  'use strict';

  var MINUS = '−';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var SCENARIOS = ['worst', 'realistic', 'best'];
  var IDX = { worst: 0, realistic: 1, best: 2 };
  var LABELS = { worst: 'worst', realistic: 'realistic', best: 'best' };
  var CAP = { worst: 'Worst', realistic: 'Realistic', best: 'Best' };
  var YEAR_CAP = 40;   // the years chart stops here; anything longer reads "40+"
  // Fixed series colours for the events chart, by plan key (blue, orange, aqua: validated colour-blind safe as a set).
  var SERIES_COLORS = { full: '#2a78d6', efficient: '#eb6834', hybrid: '#1baf7a' };
  var FALLBACK_COLOR = '#7d8b93';

  // Safety net: plain wording for data labels that still carry trade terms. Exact matches only; anything else shows as given.
  var PLAIN = {
    'Building work (roof, HVAC, fire, restrooms, parking, flood, column removal)': 'Building work (roof, heating and AC, fire safety, restrooms, parking, flood, columns)',
    'Hall and kitchen fit-out': 'Finishing the halls and kitchens',
    'Design, permits and contingency': 'Design, permits and a cushion for surprises',
    'Leasing: tenant improvements and commissions': 'Signing tenants: build-out allowances and broker fees',
    'Holding costs and construction interest': 'Holding the building and loan interest during the work',
    'Hall B and Kitchen B (phase 2)': 'Adding Hall B and Kitchen B later',
    'Flex space rents': 'Flex space rents (open, warehouse-style units)',
    'Rents from as-is space': 'Rents from space leased as it is',
    'Fuel pad ground rent': 'Land rent from the gas station',
    'Food pad ground rent (Summer Ave)': 'Land rent from a restaurant pad on Summer Ave',
    'As-is space 85% leased instead of the base case': 'Space leased as it is: 85% leased instead of the realistic case',
    'Add a food pad on Summer Ave (ground lease, about $70,000 a year)': 'Add a restaurant pad on Summer Ave (it rents the land, about $70,000 a year)'
  };
  function plain(label) { return Object.prototype.hasOwnProperty.call(PLAIN, label) ? PLAIN[label] : label; }

  /* ---------- Formatting ---------- */

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function sign(v) { return v < 0 ? MINUS : ''; }
  // $12.7M at or above $1M, $967k below.
  function money(v) {
    if (!isNum(v)) return 'n/a';
    var a = Math.abs(v);
    if (a === 0) return '$0';
    var k = Math.round(a / 1000);
    if (a >= 1e6 || k >= 1000) return sign(v) + '$' + (a / 1e6).toFixed(1) + 'M';
    if (k === 0) return sign(v) + '$' + Math.round(a);
    return sign(v) + '$' + k + 'k';
  }
  function moneySigned(v) { return isNum(v) && v > 0 ? '+' + money(v) : money(v); }
  function dollars2(v) { return sign(v) + '$' + Math.abs(v).toFixed(2); }
  function int(v) { return isNum(v) ? Math.round(v).toLocaleString('en-US') : 'n/a'; }
  function perSqFt(v) { return isNum(v) ? '$' + v.toFixed(2) + ' per square foot' : 'n/a'; }
  function cents(r) { return isNum(r) ? Math.round(r * 100) + ' cents' : 'n/a'; }
  function numberWord(n) {
    return ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n);
  }
  function listJoin(items) {
    if (items.length <= 1) return items.join('');
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }
  function at(arr, sc) {
    if (isNum(arr) || arr === null) return arr;
    return Array.isArray(arr) && arr.length > IDX[sc] ? arr[IDX[sc]] : null;
  }
  function dateText(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    var mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m[2], 10) - 1];
    return parseInt(m[3], 10) + ' ' + mon + ' ' + m[1];
  }
  // Years to earn back: null means never (no profit). Long, short and chart forms.
  function yearsLong(y) {
    if (y === null) return 'Never, at these numbers';
    if (!isNum(y)) return 'n/a';
    if (y > YEAR_CAP) return 'More than ' + YEAR_CAP + ' years';
    return y.toFixed(1) + ' years';
  }
  function yearsShort(y) {
    if (y === null) return 'Never';
    if (!isNum(y)) return 'n/a';
    if (y > YEAR_CAP) return YEAR_CAP + '+ yrs';
    return y.toFixed(1) + ' yrs';
  }
  function per100(r) {
    if (!isNum(r)) return 'n/a';
    return r < 0 ? 'Loses ' + dollars2(-r * 100) + ' a year per $100' : dollars2(r * 100) + ' a year per $100';
  }

  /* ---------- The two plain-language reference lines ---------- */

  function refs(data) {
    var r = data.refs || {};
    var ty = isNum(r.typical_payback_years) && r.typical_payback_years > 0 ? r.typical_payback_years
      : (isNum(r.exit_cap) && r.exit_cap > 0 ? 1 / r.exit_cap : null);
    var gy = isNum(r.goal_payback_years) && r.goal_payback_years > 0 ? r.goal_payback_years
      : (isNum(r.target) && r.target > 0 ? 1 / r.target : null);
    return {
      typicalYears: ty, goalYears: gy,
      typicalRate: ty ? 1 / ty : null, goalRate: gy ? 1 / gy : null,
      typicalLabel: ty ? 'a typical investment property (about ' + Math.round(ty) + ' years)' : 'a typical investment property',
      typicalShort: ty ? 'Typical property: about ' + Math.round(ty) + ' years' : 'Typical property',
      goalLabel: gy ? 'the ' + Math.round(gy) + '-year goal' : 'the goal',
      goalShort: gy ? 'Goal: ' + Math.round(gy) + ' years or less' : 'Goal'
    };
  }

  /* ---------- Plan figures ---------- */

  function buildMoney(p, sc) { return at(p.work_cost, sc); }
  function profit(p, sc) { return at(p.cash_flow, sc); }
  function rate(p, sc) {
    var r = at(p.return_on_work, sc);
    if (isNum(r)) return r;
    var b = buildMoney(p, sc), c = profit(p, sc);
    return isNum(b) && b > 0 && isNum(c) ? c / b : null;
  }
  function payback(p, sc) {
    if (p.payback_years) {
      var given = at(p.payback_years, sc);
      if (given === null || isNum(given)) return given;
    }
    var b = buildMoney(p, sc), c = profit(p, sc);
    if (!isNum(b) || !isNum(c)) return undefined;
    return c > 0 ? b / c : null;
  }
  function sumLines(lines, sc, abs) {
    if (!Array.isArray(lines)) return null;
    var s = 0, any = false;
    lines.forEach(function (ln) { var v = at(ln[1], sc); if (isNum(v)) { s += abs ? Math.abs(v) : v; any = true; } });
    return any ? s : null;
  }
  function moneyIn(p, sc) { var v = at(p.money_in, sc); return isNum(v) ? v : sumLines(p.income_lines, sc, false); }
  function moneyOut(p, sc) { var v = at(p.money_out, sc); return isNum(v) ? v : sumLines(p.cost_lines, sc, true); }
  function planName(p) { return p.short || p.name; }

  // Status against the two reference lines, always with an icon and words, never colour alone.
  function grade(data, p, sc) { return gradeFor(data, payback(p, sc), profit(p, sc)); }
  function gradeFor(data, y, c) {
    var R = refs(data);
    if (y === undefined && !isNum(c)) return { cls: 'na', icon: '–', text: 'Not available' };
    if (y === null || (isNum(c) && c <= 0)) return { cls: 'loss', icon: '✕', text: 'Loses money at these numbers' };
    if (R.goalYears && y <= R.goalYears + 1e-9) return { cls: 'good', icon: '✓', text: 'Meets ' + R.goalLabel };
    if (R.typicalYears && y <= R.typicalYears + 1e-9) return { cls: 'ok', icon: '≈', text: 'Faster than ' + R.typicalLabel + ', short of ' + R.goalLabel };
    return { cls: 'bad', icon: '✕', text: 'Slower than ' + R.typicalLabel };
  }

  // One plain sentence on which plans beat which line in a case.
  function lineSentence(data, sc) {
    var R = refs(data), plans = data.plans, n = plans.length;
    var goal = [], typical = [], loss = [];
    plans.forEach(function (p) {
      var g = grade(data, p, sc).cls;
      if (g === 'good') goal.push(planName(p));
      else if (g === 'ok') typical.push(planName(p));
      else if (g === 'loss') loss.push(planName(p));
    });
    var parts = [];
    if (goal.length === n) return 'Every plan meets ' + R.goalLabel + '.';
    if (goal.length) parts.push(listJoin(goal) + (goal.length === 1 ? ' meets ' : ' meet ') + R.goalLabel);
    if (typical.length) {
      parts.push((!goal.length && typical.length === 1 ? 'only ' : '') + listJoin(typical) +
        (typical.length === 1 ? ' earns' : ' earn') + ' it back faster than ' + R.typicalLabel +
        (goal.length ? '' : '; none meets ' + R.goalLabel));
    }
    if (!goal.length && !typical.length) parts.push('no plan earns it back faster than ' + R.typicalLabel);
    if (loss.length) parts.push((loss.length === n ? 'every plan loses' : listJoin(loss) + (loss.length === 1 ? ' loses' : ' lose')) + ' money');
    var s = parts.join('; ');
    return s.charAt(0).toUpperCase() + s.slice(1) + '.';
  }

  function extremes(data, fn, sc) {
    var vals = data.plans.map(function (p) { return { p: p, v: fn(p, sc) }; }).filter(function (o) { return isNum(o.v); });
    if (!vals.length) return null;
    vals.sort(function (a, b) { return a.v - b.v; });
    return { lo: vals[0], hi: vals[vals.length - 1] };
  }

  /* ---------- DOM helpers ---------- */

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); });
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs, text) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function byId(id) { return document.getElementById(id); }
  function setText(id, text) { var n = byId(id); if (n) n.textContent = text; }
  // A caption plus a hint that only makes sense on screen (hidden when printed).
  function setCaption(id, text, hint) {
    var n = byId(id);
    if (!n) return;
    n.textContent = text;
    if (hint) { n.appendChild(document.createTextNode(' ')); n.appendChild(el('span', { class: 'screen-only' }, hint)); }
  }

  function fillTable(table, head, rows, opts) {
    opts = opts || {};
    table.textContent = '';
    if (opts.caption) table.appendChild(el('caption', { class: 'visually-hidden' }, opts.caption));
    var thead = el('thead'), tr = el('tr');
    head.forEach(function (h, i) { tr.appendChild(el('th', { scope: 'col', class: (opts.numCols || []).indexOf(i) >= 0 ? 'num' : null }, h)); });
    thead.appendChild(tr); table.appendChild(thead);
    var tbody = el('tbody');
    rows.forEach(function (r) {
      var row = el('tr', r.cls ? { class: r.cls } : null);
      r.cells.forEach(function (c, i) {
        var cell = el(i === 0 ? 'th' : 'td', i === 0 ? { scope: 'row' } : { class: (opts.numCols || []).indexOf(i) >= 0 ? 'num' : null }, c);
        cell.setAttribute('data-label', head[i]);
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    return table;
  }

  function factList(cls, facts) {
    var dl = el('dl', { class: cls });
    facts.forEach(function (f) {
      if (!f) return;
      var row = el('div', { class: (cls === 'op-facts' ? 'op-fact' : 'plan-fact') + (f[2] ? ' ' + f[2] : '') });
      row.appendChild(el('dt', null, f[0]));
      var dd = el('dd', null, f[1]);
      row.appendChild(dd);
      if (f[3]) row.appendChild(el('p', { class: 'fact-sub' }, f[3]));
      dl.appendChild(row);
    });
    return dl;
  }

  /* ---------- Hero ---------- */

  function renderHero(data) {
    var lead = byId('feas-lead');
    lead.removeAttribute('data-loading');
    var n = data.plans.length;
    var bm = extremes(data, buildMoney, 'realistic'), pr = extremes(data, profit, 'realistic');
    var pb = extremes(data, function (p, sc) { var y = payback(p, sc); return isNum(y) ? y : null; }, 'realistic');
    var bestPb = extremes(data, function (p, sc) { var y = payback(p, sc); return isNum(y) ? y : null; }, 'best');
    var lossWorst = data.plans.filter(function (p) { return grade(data, p, 'worst').cls === 'loss'; }).length;
    var s = '';
    if (bm) s += 'In the realistic case the ' + numberWord(n) + ' plans need ' + money(bm.lo.v) + ' to ' + money(bm.hi.v) + ' to build, not counting what is paid for the property. ';
    if (pr) s += 'Once open they make ' + money(pr.lo.v) + ' to ' + money(pr.hi.v) + ' profit a year' +
      (pb ? ', so they earn the build money back in ' + pb.lo.v.toFixed(1) + ' to ' + pb.hi.v.toFixed(1) + ' years. ' : '. ');
    s += lineSentence(data, 'realistic') + ' ';
    if (bestPb) s += 'In the best case they earn it back in ' + bestPb.lo.v.toFixed(1) + ' to ' + bestPb.hi.v.toFixed(1) + ' years';
    if (lossWorst) s += '; in the worst case ' + (lossWorst === n ? 'all ' + numberWord(n) : numberWord(lossWorst) + ' of the ' + numberWord(n)) + ' lose money.';
    else s += '.';
    lead.textContent = s.trim();

    if (data.basis) setText('basis-text', data.basis);

    var notes = byId('feas-notes');
    notes.textContent = '';
    var hallPlans = data.plans.filter(function (p) { return (p.hall_events || []).some(isNum); });
    if (data.events && isNum(data.events.realistic_events) && hallPlans.length) {
      notes.appendChild(el('li', null, 'Hall bookings matter most in the ' + numberWord(hallPlans.length) + ' plans where the owners run the halls: the realistic case assumes ' +
        int(data.events.realistic_events) + ' events a year across both halls.'));
    }
    notes.appendChild(el('li', null, 'The plan cards follow the case you pick below; the range chart shows all three at once.'));
    if (byId('whatif')) {
      var tryLi = el('li', null, 'To test other costs, income or events yourself, use ');
      tryLi.appendChild(el('a', { href: '#whatif' }, 'Try your own numbers'));
      tryLi.appendChild(document.createTextNode('. Nothing you type is saved.'));
      notes.appendChild(tryLi);
    }
    var d = dateText(data.as_of);
    if (d) setText('as-of', d);
  }

  /* ---------- Plans ---------- */

  function phaseTwoCost(p, sc) {
    if (!p.phase1) return null;
    var total = buildMoney(p, sc), ph1 = at(p.phase1.work_cost, sc);
    if (!isNum(total) || !isNum(ph1)) return null;
    return total - ph1;
  }

  function columnsNote(data, p, sc) {
    var cols = data.columns || {}, cost = at(cols.cost_per_column, sc), amt = at(p.column_removal, sc);
    if (!isNum(amt) || amt <= 0) return 'No columns to take out: this plan does not build the halls.';
    var count = isNum(cost) && cost > 0 ? Math.round(amt / cost) : null;
    var s = 'Includes ' + money(amt) + ' to take out ' + (count ? numberWord(count) + ' roof columns' : 'the roof columns') + ' in the halls';
    var p2 = phaseTwoCost(p, sc);
    if (p.phase1 && count && isNum(cols.total) && count < cols.total) {
      s += isNum(p2) && p2 > 1000 ? ' (Hall A’s); Hall B’s ' + numberWord(cols.total - count) + ' are in the cost of adding Hall B' : ' (Hall A’s)';
    }
    return s + '.';
  }

  function linesTable(title, lines, sc, totalLabel, abs, givenTotal) {
    var rows = [];
    (lines || []).forEach(function (ln) {
      var v = at(ln[1], sc);
      if (!isNum(v) || Math.abs(v) < 500) return;
      rows.push({ cells: [plain(ln[0]), money(abs ? Math.abs(v) : v)] });
    });
    var total = isNum(givenTotal) ? givenTotal : sumLines(lines, sc, abs);
    rows.push({ cells: [totalLabel, money(total)], cls: 'is-total' });
    var wrap = el('div', { class: 'lines-block' });
    wrap.appendChild(el('h4', { class: 'lines-title' }, title));
    wrap.appendChild(fillTable(el('table', { class: 'money-table' }), ['Item', 'Per year'], rows, { numCols: [1], caption: title + ', ' + LABELS[sc] + ' case' }));
    return wrap;
  }

  function biggest(lines, sc, k) {
    return (lines || []).map(function (ln) { return { name: plain(ln[0]), v: Math.abs(at(ln[1], sc) || 0) }; })
      .filter(function (o) { return o.v >= 500; }).sort(function (a, b) { return b.v - a.v; }).slice(0, k);
  }

  function renderPlans(data, sc) {
    var R = refs(data);
    var pr = extremes(data, function (p, s) { var y = payback(p, s); return isNum(y) ? y : null; }, sc);
    setText('plans-summary', CAP[sc] + ' case: ' +
      (pr ? 'the build money comes back in ' + pr.lo.v.toFixed(1) + ' years (' + planName(pr.lo.p) + ') to ' + pr.hi.v.toFixed(1) + ' years (' + planName(pr.hi.p) + '). ' : '') +
      lineSentence(data, sc));

    var wrap = byId('plan-cards');
    var openState = {};
    Array.prototype.forEach.call(wrap.querySelectorAll('details'), function (d) { openState[d.getAttribute('data-key')] = d.open; });
    wrap.textContent = '';

    data.plans.forEach(function (p) {
      var g = grade(data, p, sc), c = profit(p, sc), y = payback(p, sc), r = rate(p, sc);
      var inc = moneyIn(p, sc), out = moneyOut(p, sc);
      var card = el('article', { class: 'plan-card is-' + g.cls, 'aria-labelledby': 'plan-' + p.key });
      var head = el('div', { class: 'plan-head' });
      head.appendChild(el('h3', { id: 'plan-' + p.key }, p.name));
      head.appendChild(el('p', { class: 'plan-meta' }, 'Opens in about ' + p.opens_months + ' months' + (p.phase1 ? ' (first step)' : '')));
      var badge = el('p', { class: 'plan-status status-' + g.cls });
      badge.appendChild(el('span', { class: 'status-icon', 'aria-hidden': 'true' }, g.icon));
      badge.appendChild(document.createTextNode(g.text));
      head.appendChild(badge);
      card.appendChild(head);

      card.appendChild(factList('plan-facts', [
        ['Money to build it (one-time)', money(buildMoney(p, sc)), '', 'Not counting what is paid for the property'],
        isNum(inc) ? ['Money coming in each year', money(inc), ''] : null,
        isNum(out) ? ['Money going out each year', money(out), ''] : null,
        ['Profit each year', money(c), (isNum(c) && c < 0 ? 'is-neg ' : '') + 'is-key', 'Before any loan payments'],
        ['Years to earn back the build money', yearsLong(y), 'is-key'],
        ['Profit each year for every $100 spent', isNum(r) ? (r < 0 ? 'Loses ' + dollars2(-r * 100) : dollars2(r * 100)) : 'n/a', '']
      ]));

      if (p.phase1) {
        var p2 = phaseTwoCost(p, sc), ph = el('p', { class: 'plan-phase' });
        if (isNum(p2) && p2 > 1000) {
          var c1 = at(p.phase1.cash_flow, sc), b1 = at(p.phase1.work_cost, sc);
          var y1 = p.phase1.payback_years ? at(p.phase1.payback_years, sc) : (isNum(c1) && c1 > 0 && isNum(b1) ? b1 / c1 : null);
          ph.textContent = 'First step, Hall A only: ' + money(b1) + ' to build and ' + money(c1) + ' profit a year, earning it back in ' +
            yearsLong(y1).replace('Never, at these numbers', 'never at these numbers').replace(/^More/, 'more') +
            '. Adding Hall B later costs ' + money(p2) + ' more and gives the totals above.';
        } else {
          ph.textContent = 'In this case Hall B is never added: the numbers above are Hall A alone.';
        }
        card.appendChild(ph);
      }

      if (byId('whatif')) {
        card.appendChild(el('button', { type: 'button', class: 'button button-quiet wi-open', 'data-plan': p.key }, 'Try your own numbers for this plan'));
      }

      var big = biggest(p.cost_lines, sc, 2);
      if (big.length) {
        card.appendChild(el('p', { class: 'plan-drivers' }, 'Biggest yearly costs: ' +
          big.map(function (b) { return b.name + ' (' + money(b.v) + ')'; }).join('; ') + '.'));
      }

      var what = el('p', { class: 'plan-text' });
      what.appendChild(el('strong', null, 'What gets built. '));
      what.appendChild(document.createTextNode(p.what || ''));
      card.appendChild(what);
      var who = el('p', { class: 'plan-text' });
      who.appendChild(el('strong', null, 'Who runs what. '));
      who.appendChild(document.createTextNode(p.who || ''));
      card.appendChild(who);

      // Money in and out each year (when the data has the lines).
      if (Array.isArray(p.income_lines) || Array.isArray(p.cost_lines)) {
        var det1 = el('details', { class: 'detail detail-compact', 'data-key': p.key + '-year', 'data-print-open': '' });
        if (openState[p.key + '-year']) det1.open = true;
        var s1 = el('summary');
        s1.appendChild(el('span', { class: 'detail-title' }, 'Money in and out each year'));
        s1.appendChild(el('span', { class: 'detail-hint' }, 'Where it comes from and where it goes'));
        det1.appendChild(s1);
        var b1x = el('div', { class: 'detail-body' });
        if (Array.isArray(p.income_lines)) b1x.appendChild(linesTable('Where the money comes from each year', p.income_lines, sc, 'Money coming in each year', false, inc));
        if (Array.isArray(p.cost_lines)) b1x.appendChild(linesTable('Where it goes each year', p.cost_lines, sc, 'Money going out each year', true, out));
        if (isNum(inc) && isNum(out)) {
          var left = inc - out;
          b1x.appendChild(el('p', { class: 'lines-profit' }, 'Profit each year: ' + money(isNum(c) ? c : left) + '.'));
          if (isNum(c) && Math.abs(left - c) > 20000 && window.console) console.warn('Money in minus money out does not match the profit for ' + p.key + ' (' + sc + ').');
        }
        det1.appendChild(b1x);
        card.appendChild(det1);
      }

      // What the one-time build money pays for.
      var det = el('details', { class: 'detail detail-compact', 'data-key': p.key, 'data-print-open': '' });
      if (openState[p.key]) det.open = true;
      var sum = el('summary');
      sum.appendChild(el('span', { class: 'detail-title' }, 'What the build money pays for'));
      sum.appendChild(el('span', { class: 'detail-hint' }, 'One-time, ' + LABELS[sc] + ' case'));
      det.appendChild(sum);
      var body = el('div', { class: 'detail-body' });
      var rows = [], groupSum = 0;
      (p.cost_groups || []).forEach(function (gr) {
        var v = at(gr[1], sc);
        if (!isNum(v) || Math.abs(v) < 500) return;
        groupSum += v;
        rows.push({ cells: [plain(gr[0]), money(v)] });
      });
      rows.push({ cells: ['Money to build it (one-time)', money(buildMoney(p, sc))], cls: 'is-total' });
      if (isNum(buildMoney(p, sc)) && Math.abs(groupSum - buildMoney(p, sc)) > 20000 && window.console) {
        console.warn('Build cost items for ' + p.key + ' (' + sc + ') do not add up to the total.');
      }
      body.appendChild(fillTable(el('table', { class: 'money-table' }), ['Item', 'One-time'], rows, { numCols: [1], caption: p.name + ': what the build money pays for, ' + LABELS[sc] + ' case' }));
      body.appendChild(el('p', { class: 'plan-colnote' }, columnsNote(data, p, sc)));
      det.appendChild(body);
      card.appendChild(det);
      wrap.appendChild(card);
    });
  }

  /* ---------- Ways to improve (optional data) ---------- */

  // Accepts plan.levers or data.levers[key]; each item an object {label, note, kind, profit_change, onetime_change, payback_years}
  // or an array [label, profit change, one-time change, note]. Changes are for the realistic case.
  function leversFor(data, p) {
    var L = data.levers, items = null;
    if (Array.isArray(p.levers)) items = p.levers;
    else if (L && !Array.isArray(L) && Array.isArray(L[p.key])) items = L[p.key];
    else if (Array.isArray(L)) L.forEach(function (b) { if (b && b.key === p.key && Array.isArray(b.items || b.levers)) items = b.items || b.levers; });
    if (!items) return [];
    return items.map(function (it) {
      if (Array.isArray(it)) return { label: it[0], dProfit: it[1], dCost: it[2], note: it[3], kind: null, years: undefined };
      return { label: it.label || it.name, note: it.note, kind: it.kind,
        dProfit: it.profit_change !== undefined ? it.profit_change : it.profit,
        dCost: it.onetime_change !== undefined ? it.onetime_change : it.cost,
        years: it.payback_years };
    }).filter(function (o) { return o.label; });
  }
  function isColumnsLever(it) { return /column/i.test(it.label || ''); }

  function leverRows(data, p, items) {
    var sc = 'realistic', b0 = buildMoney(p, sc), c0 = profit(p, sc);
    return items.map(function (it) {
      var dp = at(it.dProfit, sc), dc = at(it.dCost, sc);
      // Changes this small are rounding noise: show them as no change.
      dp = isNum(dp) && Math.abs(dp) >= 5000 ? dp : 0;
      dc = isNum(dc) && Math.abs(dc) >= 10000 ? dc : 0;
      var ny = it.years;
      if (ny === undefined) {
        var nb = isNum(b0) ? b0 + dc : null, nc = isNum(c0) ? c0 + dp : null;
        ny = isNum(nb) && isNum(nc) ? (nc > 0 ? nb / nc : null) : undefined;
      } else ny = at(ny, sc);
      var note = it.note || '';
      if (isColumnsLever(it)) note = (note ? note + '. ' : '') + 'Optional: the owners want open halls, so this is a fallback only.';
      return { cells: [plain(it.label),
        dp === 0 ? 'No change' : moneySigned(dp) + ' a year',
        dc === 0 ? 'No change' : (dc < 0 ? 'Saves ' + money(-dc) : 'Adds ' + money(dc)),
        yearsLong(ny),
        note], cls: isColumnsLever(it) ? 'is-optional' : '' };
    });
  }

  function renderPath(data) {
    var box = byId('path-box');
    if (!box) return;
    box.textContent = '';
    var path = data.path_to_profit;
    if (!path || !path.plans) { box.hidden = true; return; }
    box.hidden = false;
    var R = refs(data);
    box.appendChild(el('p', { class: 'eyebrow' }, 'PATH TO PROFIT'));
    box.appendChild(el('h3', { class: 'path-title' }, 'If these changes happen together'));
    var ul = el('ul', { class: 'path-changes' });
    (path.changes || []).forEach(function (c) {
      var optional = /^\(optional\)\s*/i.test(c);
      var li = el('li', optional ? { class: 'is-optional' } : null);
      li.appendChild(document.createTextNode(c.replace(/^\(optional\)\s*/i, '')));
      if (optional) li.appendChild(el('span', { class: 'optional-tag' }, 'optional'));
      ul.appendChild(li);
    });
    box.appendChild(ul);
    var rows = [];
    data.plans.forEach(function (p) {
      var pp = path.plans[p.key];
      if (!pp) return;
      var rc = pp.remove_columns || {}, kc = pp.keep_columns || {};
      rows.push({ cells: [planName(p), yearsLong(payback(p, 'realistic')), money(rc.work_cost), money(rc.profit), yearsLong(rc.payback_years),
        kc.payback_years !== undefined ? yearsLong(kc.payback_years) : 'n/a'] });
    });
    var scroll = el('div', { class: 'table-scroll' });
    scroll.appendChild(fillTable(el('table', { class: 'money-table stack-table path-table' }),
      ['Plan', 'Earns back now', 'Build money with the changes', 'Profit each year with the changes', 'Earns back with the changes', 'If the columns are kept (optional)'],
      rows, { numCols: [1, 2, 3, 4, 5], caption: 'Path to profit, realistic case' }));
    box.appendChild(scroll);
    var meets = data.plans.filter(function (p) { var pp = path.plans[p.key]; return pp && pp.remove_columns && isNum(pp.remove_columns.payback_years) && R.goalYears && pp.remove_columns.payback_years <= R.goalYears; }).map(planName);
    box.appendChild(el('p', { class: 'path-note' }, (meets.length ? 'With these changes ' + listJoin(meets) + (meets.length === 1 ? ' meets ' : ' meet ') + R.goalLabel + ', with the columns taken out. ' : 'Even with these changes no plan meets ' + R.goalLabel + '. ') +
      'Keeping the columns is optional: the owners want open halls, and the plan assumes they come out.'));
  }

  function renderLevers(data) {
    var section = byId('levers');
    var navItem = document.querySelector('[data-nav="levers"]');
    var box = byId('lever-blocks');
    box.textContent = '';
    var any = false, sc = 'realistic';
    data.plans.forEach(function (p) {
      var items = leversFor(data, p);
      if (!items.length) return;
      any = true;
      var block = el('article', { class: 'lever-block', 'aria-labelledby': 'lever-' + p.key });
      var det = el('details', { class: 'detail', 'data-print-open': '' });
      var sum = el('summary');
      sum.appendChild(el('span', { class: 'detail-title', id: 'lever-' + p.key }, p.name));
      sum.appendChild(el('span', { class: 'detail-hint' }, 'Now: ' + money(buildMoney(p, sc)) + ' to build, ' + money(profit(p, sc)) + ' profit a year, earns it back in ' +
        yearsLong(payback(p, sc)).replace(/^Never/, 'never').replace(/^More/, 'more')));
      det.appendChild(sum);
      var body = el('div', { class: 'detail-body' });
      var groups = [['income', 'More money coming in'], ['saving', 'Ways to save']];
      var typed = items.some(function (it) { return it.kind; });
      if (typed) {
        groups.forEach(function (gp) {
          var list = items.filter(function (it) { return it.kind === gp[0]; });
          if (!list.length) return;
          body.appendChild(el('h4', { class: 'lines-title' }, gp[1]));
          body.appendChild(fillTable(el('table', { class: 'money-table stack-table lever-table' }),
            ['Change', 'Profit each year', 'Build money (one-time)', 'Earns back in', 'Note'], leverRows(data, p, list),
            { caption: gp[1] + ': ' + p.name + ', realistic case' }));
        });
        var other = items.filter(function (it) { return it.kind !== 'income' && it.kind !== 'saving'; });
        if (other.length) body.appendChild(fillTable(el('table', { class: 'money-table stack-table lever-table' }),
          ['Change', 'Profit each year', 'Build money (one-time)', 'Earns back in', 'Note'], leverRows(data, p, other), { caption: 'Other changes: ' + p.name }));
      } else {
        body.appendChild(fillTable(el('table', { class: 'money-table stack-table lever-table' }),
          ['Change', 'Profit each year', 'Build money (one-time)', 'Earns back in', 'Note'], leverRows(data, p, items), { caption: 'Ways to improve ' + p.name + ', realistic case' }));
      }
      det.appendChild(body);
      block.appendChild(det);
      box.appendChild(block);
    });
    renderPath(data);
    var hasPath = byId('path-box') && !byId('path-box').hidden;
    section.hidden = !(any || hasPath);
    if (navItem) navItem.hidden = section.hidden;
    // The first plan's list starts open on wide screens.
    var first = box.querySelector('details');
    if (first && window.matchMedia('(min-width: 721px)').matches) first.open = true;
  }

  /* ---------- Section numbers follow the sections actually shown ---------- */

  function numberSections() {
    var order = ['plans', 'whatif', 'levers', 'range', 'events', 'operators', 'columns', 'risks', 'unknowns'];
    var n = 0;
    order.forEach(function (id) {
      var sec = byId(id);
      if (!sec || sec.hidden) return;
      n += 1;
      var eb = sec.querySelector('.eyebrow');
      if (eb) eb.textContent = eb.textContent.replace(/^(\d+ · )?/, (n < 10 ? '0' : '') + n + ' · ');
    });
  }

  /* ---------- Tooltip ---------- */

  function makeTip(box) {
    var tip = box.querySelector('.chart-tip');
    if (!tip) { tip = el('div', { class: 'chart-tip', role: 'presentation' }); box.appendChild(tip); }
    tip.hidden = true;
    return {
      show: function (px, py, title, rows) {
        tip.textContent = '';
        tip.appendChild(el('p', { class: 'tip-title' }, title));
        rows.forEach(function (r) {
          var row = el('p', { class: 'tip-row' });
          if (r.color) {
            var key = el('span', { class: 'tip-key', 'aria-hidden': 'true' });
            key.style.background = r.color;
            row.appendChild(key);
          }
          row.appendChild(el('strong', null, r.value));
          row.appendChild(el('span', { class: 'tip-label' }, r.label));
          tip.appendChild(row);
        });
        tip.hidden = false;
        var bw = box.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
        var x = px + 14, y = py - th - 10;
        if (x + tw > bw) x = Math.max(0, px - tw - 14);
        if (y < 0) y = py + 16;
        tip.style.left = x + 'px';
        tip.style.top = y + 'px';
      },
      hide: function () { tip.hidden = true; }
    };
  }

  function addText(g, x, y, lines, attrs) {
    var t = svg('text', Object.assign({ x: x, y: y }, attrs || {}));
    lines.forEach(function (ln, i) { t.appendChild(svg('tspan', { x: x, dy: i === 0 ? 0 : '1.2em' }, ln)); });
    g.appendChild(t);
    if (/\b(value|ref-label|marker-label|name-label)\b/.test(t.getAttribute('class') || '')) {
      var bb = t.getBBox();
      g.insertBefore(svg('rect', { x: bb.x - 2, y: bb.y - 1, width: bb.width + 4, height: bb.height + 2, class: 'label-bg' }), t);
    }
    return t;
  }
  // Keep a centred label inside the chart: approximate width from the character count (mono 11px ≈ 6.7px a character).
  function clampMid(xc, text, lo, hi) {
    var half = (String(text).length * 6.7) / 2 + 2;
    return Math.min(Math.max(xc, lo + half), hi - half);
  }
  function niceStep(span, target) {
    var raw = span / Math.max(1, target), pow = Math.pow(10, Math.floor(Math.log10(raw)));
    var m = raw / pow;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * pow;
  }

  /* ---------- Range chart: years to earn back the build money ---------- */

  function renderRange(data) {
    var box = byId('range-chart');
    var R = refs(data), n = data.plans.length;
    var rows = data.plans.map(function (p) {
      return { p: p, name: planName(p), w: payback(p, 'worst'), m: payback(p, 'realistic'), b: payback(p, 'best'),
        rw: rate(p, 'worst'), rm: rate(p, 'realistic'), rb: rate(p, 'best') };
    });
    // Title in plain words, from the data.
    var cls = function (sc) { return data.plans.map(function (p) { return grade(data, p, sc).cls; }); };
    var fast = function (sc) { return cls(sc).filter(function (c) { return c === 'good' || c === 'ok'; }).length; };
    var realNames = data.plans.filter(function (p) { var c = grade(data, p, 'realistic').cls; return c === 'good' || c === 'ok'; }).map(planName);
    var t1 = realNames.length === 0 ? 'In the realistic case no plan earns its build money back faster than ' + R.typicalLabel
      : realNames.length === n ? 'In the realistic case every plan earns its build money back faster than ' + R.typicalLabel
      : 'In the realistic case ' + (realNames.length === 1 ? 'only ' + realNames[0] + ' earns' : listJoin(realNames) + ' earn') + ' its build money back faster than ' + R.typicalLabel;
    var fb = fast('best'), fw = fast('worst');
    var title = t1 + '; ' + (fb === n ? 'all ' + numberWord(n) + ' do in the best case' : numberWord(fb) + ' of ' + numberWord(n) + ' do in the best case') +
      ', ' + (fw === 0 ? 'none in the worst' : numberWord(fw) + ' in the worst');
    setText('range-title', title.charAt(0).toUpperCase() + title.slice(1));
    setCaption('range-caption', 'Years to earn back the one-time build money, not counting what is paid for the property. Fewer years is better. Each grey bar runs from the best case (left) to the worst case (right); the blue dot is the realistic case. “Never” means the plan loses money in that case, and the chart stops at ' +
      YEAR_CAP + ' years. Dashed lines: ' + R.goalLabel + ' and ' + R.typicalLabel + '.', 'Hover over or select a row to read its numbers.');

    var W = Math.max(300, box.clientWidth);
    var wide = W >= 640;
    var m = wide ? { l: 170, r: 56, t: 44, b: 36 } : { l: 26, r: 40, t: 44, b: 34 };
    var rowH = wide ? 56 : 80;
    var H = m.t + rowH * rows.length + m.b;
    var pw = W - m.l - m.r;
    var x = function (v) { return m.l + (Math.min(Math.max(v, 0), YEAR_CAP) / YEAR_CAP) * pw; };
    var pos = function (y) { return y === null || !isNum(y) || y > YEAR_CAP ? x(YEAR_CAP) : x(y); };

    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'group', 'aria-label': title + '. All values are in the table below the chart.', class: 'chart-svg' });
    var g = svg('g', { 'aria-hidden': 'true' }); root.appendChild(g);
    box.textContent = '';
    box.appendChild(root);
    var tip = makeTip(box);

    var step = wide ? 5 : 10;
    for (var tv = 0; tv <= YEAR_CAP; tv += step) {
      g.appendChild(svg('line', { x1: x(tv), x2: x(tv), y1: m.t - 6, y2: H - m.b, class: tv === 0 ? 'zero' : 'grid' }));
      addText(g, x(tv), H - m.b + 18, [tv === YEAR_CAP ? YEAR_CAP + '+' : String(tv)], { class: 'axis', 'text-anchor': 'middle' });
    }
    addText(g, m.l, H - 2, [wide ? 'Years to earn back the build money (fewer is better)' : 'Years to earn back (fewer is better)'], { class: 'cat', 'text-anchor': 'start' });
    // The goal line (10 years) sits left of the typical-property line (about 12 years): label each on its outer side.
    if (R.goalYears) {
      g.appendChild(svg('line', { x1: x(R.goalYears), x2: x(R.goalYears), y1: m.t - 26, y2: H - m.b, class: 'ref' }));
      addText(g, x(R.goalYears) - 5, m.t - 16, [wide ? R.goalShort : 'Goal ' + Math.round(R.goalYears)], { class: 'ref-label', 'text-anchor': 'end' });
    }
    if (R.typicalYears) {
      g.appendChild(svg('line', { x1: x(R.typicalYears), x2: x(R.typicalYears), y1: m.t - 26, y2: H - m.b, class: 'ref' }));
      addText(g, x(R.typicalYears) + 5, m.t - 16, [wide ? R.typicalShort : 'Typical ~' + Math.round(R.typicalYears)], { class: 'ref-label', 'text-anchor': 'start' });
    }

    var hits = svg('g'); root.appendChild(hits);
    rows.forEach(function (r, i) {
      var top = m.t + rowH * i;
      var cy = top + (wide ? 24 : 44);
      if (wide) addText(g, 0, cy + 4, [r.name], { class: 'cat cat-strong', 'text-anchor': 'start' });
      else addText(g, 4, top + 16, [r.name], { class: 'cat cat-strong name-label', 'text-anchor': 'start' });
      var xb = pos(r.b), xw = pos(r.w);
      var offW = r.w === null || (isNum(r.w) && r.w > YEAR_CAP);
      g.appendChild(svg('line', { x1: xb, x2: xw, y1: cy, y2: cy, class: 'range' }));
      g.appendChild(svg('line', { x1: xb, x2: xb, y1: cy - 6, y2: cy + 6, class: 'range-end' }));
      if (offW) g.appendChild(svg('path', { d: 'M' + (xw + 2) + ' ' + (cy - 6) + 'L' + (xw + 10) + ' ' + cy + 'L' + (xw + 2) + ' ' + (cy + 6) + 'Z', class: 'range-arrow' }));
      else g.appendChild(svg('line', { x1: xw, x2: xw, y1: cy - 6, y2: cy + 6, class: 'range-end' }));
      // Best and worst values under the bar ends; when the ends are close they split around the middle.
      if (yearsShort(r.b) === yearsShort(r.w) && xw - xb < 64) {
        addText(g, Math.min(xw + 10, W - 2), cy + 20, [yearsShort(r.w) + ' in every case'], { class: 'axis', 'text-anchor': 'end' });
      } else if (xw - xb < 64) {
        var mid = (xb + xw) / 2;
        addText(g, mid - 3, cy + 20, [yearsShort(r.b)], { class: 'axis', 'text-anchor': 'end' });
        addText(g, mid + 3, cy + 20, [yearsShort(r.w)], { class: 'axis', 'text-anchor': 'start' });
      } else {
        addText(g, clampMid(xb, yearsShort(r.b), 0, W), cy + 20, [yearsShort(r.b)], { class: 'axis', 'text-anchor': 'middle' });
        if (offW) addText(g, Math.min(xw + 10, W - 2), cy + 20, [yearsShort(r.w)], { class: 'axis', 'text-anchor': 'end' });
        else addText(g, clampMid(xw, yearsShort(r.w), 0, W), cy + 20, [yearsShort(r.w)], { class: 'axis', 'text-anchor': 'middle' });
      }
      var xm = pos(r.m);
      g.appendChild(svg('circle', { cx: xm, cy: cy, r: 6.5, class: 'dot' }));
      addText(g, clampMid(xm, yearsShort(r.m), 0, W), cy - 12, [yearsShort(r.m)], { class: 'value', 'text-anchor': 'middle' });

      var hit = svg('rect', { x: 0, y: top, width: W, height: rowH, class: 'hit', tabindex: '0', focusable: 'true', role: 'img',
        'aria-label': r.name + ': realistic ' + yearsLong(r.m) + ', best ' + yearsLong(r.b) + ', worst ' + yearsLong(r.w) });
      var show = function (px) {
        hit.classList.add('is-active');
        tip.show(px, cy, r.name, [
          { value: yearsLong(r.m), label: 'realistic (' + per100(r.rm) + ')' },
          { value: yearsLong(r.b), label: 'best (' + per100(r.rb) + ')' },
          { value: yearsLong(r.w), label: 'worst (' + per100(r.rw) + ')' }]);
      };
      hit.addEventListener('pointermove', function (e) {
        var bb = root.getBoundingClientRect();
        show((e.clientX - bb.left) * (W / bb.width));
      });
      hit.addEventListener('focus', function () { show(xm); });
      hit.addEventListener('pointerleave', function () { hit.classList.remove('is-active'); tip.hide(); });
      hit.addEventListener('blur', function () { hit.classList.remove('is-active'); tip.hide(); });
      hits.appendChild(hit);
    });
  }

  function renderRangeTable(data) {
    var rows = [];
    data.plans.forEach(function (p) {
      SCENARIOS.forEach(function (sc) {
        var r = rate(p, sc);
        rows.push({ cells: [planName(p), CAP[sc], money(buildMoney(p, sc)), money(profit(p, sc)), yearsLong(payback(p, sc)),
          isNum(r) ? (r < 0 ? 'Loses ' + dollars2(-r * 100) : dollars2(r * 100)) : 'n/a'],
          cls: sc === 'realistic' ? 'is-current' : (sc === 'best' ? 'is-group-end' : '') });
      });
    });
    fillTable(byId('range-table'), ['Plan', 'Case', 'Money to build it', 'Profit each year', 'Years to earn back', 'Profit per $100 spent'], rows,
      { numCols: [2, 3, 4, 5], caption: 'Build money, yearly profit and years to earn it back, for every plan and case' });
  }

  /* ---------- Events chart: how many events a year the halls need ---------- */

  function eventSeries(data) {
    var ev = data.events || {}, series = ev.series || {};
    var order = data.plans.map(function (p) { return p.key; }).filter(function (k) { return series[k]; });
    Object.keys(series).forEach(function (k) { if (order.indexOf(k) < 0) order.push(k); });
    return order.map(function (k) {
      var p = data.plans.filter(function (q) { return q.key === k; })[0];
      return { key: k, name: p ? planName(p) : k, color: SERIES_COLORS[k] || FALLBACK_COLOR, ys: series[k] };
    });
  }

  function renderEvents(data) {
    var box = byId('events-chart');
    var ev = data.events || {}, xs = ev.x || [], R = refs(data);
    var S = eventSeries(data);
    if (!xs.length || !S.length) { byId('events').hidden = true; return; }
    var realEv = ev.realistic_events;
    var needed = ev.needed || {};
    var info = S.map(function (s) { var nd = needed[s.key] || {}; return { s: s, typical: nd.cap, goal: nd.target }; });
    var withGoal = info.filter(function (o) { return isNum(o.goal); }).sort(function (a, b) { return a.goal - b.goal; });
    var span = int(xs[0]) + ' and ' + int(xs[xs.length - 1]);
    var title = withGoal.length
      ? withGoal[0].s.name + ' meets ' + R.goalLabel + ' at about ' + int(withGoal[0].goal) + ' events a year' + (isNum(realEv) ? '; the realistic case has ' + int(realEv) : '')
      : 'No hall plan meets ' + R.goalLabel + ' between ' + span + ' events a year';
    setText('events-title', title);
    setCaption('events-caption', 'Profit each year for every $100 of build money, not counting what is paid for the property, for the ' + numberWord(S.length) + ' plans where the owners run the halls. Everything except bookings stays at the realistic case. Dashed lines: ' +
      R.goalLabel + ' ($' + (R.goalRate * 100).toFixed(2) + ' a year per $100) and ' + R.typicalLabel + ' ($' + (R.typicalRate * 100).toFixed(2) + ' per $100).' +
      (isNum(realEv) ? ' The solid line marks the realistic ' + int(realEv) + ' events.' : ''), 'Hover over, tap or select the chart and use the arrow keys to read each level of bookings.');

    var legend = byId('events-legend');
    legend.textContent = '';
    S.forEach(function (s) {
      var li = el('li', { class: 'legend-item' });
      var key = el('span', { class: 'legend-key', 'aria-hidden': 'true' });
      key.style.background = s.color;
      li.appendChild(key);
      li.appendChild(document.createTextNode(s.name));
      legend.appendChild(li);
    });

    var list = byId('events-needed');
    list.textContent = '';
    if (isNum(realEv)) list.appendChild(el('li', null, 'The realistic case assumes ' + int(realEv) + ' events a year across Hall A and Hall B.'));
    info.forEach(function (o) {
      var li = el('li');
      li.appendChild(el('strong', null, o.s.name + ': '));
      var a = isNum(o.typical) ? 'about ' + int(o.typical) + ' events a year to beat ' + R.typicalLabel : 'does not beat ' + R.typicalLabel + ' between ' + span + ' events';
      var b = isNum(o.goal) ? 'about ' + int(o.goal) + ' to meet ' + R.goalLabel : 'does not meet ' + R.goalLabel + ' in this range';
      li.appendChild(document.createTextNode(a + ', and ' + b + '.'));
      list.appendChild(li);
    });

    var cell = function (v) { return isNum(v) ? (v < 0 ? 'Loses ' + dollars2(-v * 100) : dollars2(v * 100)) + ' (' + yearsShort(v > 0 ? 1 / v : null) + ')' : 'n/a'; };
    fillTable(byId('events-table'), ['Events a year'].concat(S.map(function (s) { return s.name; })),
      xs.map(function (xv, j) { return { cells: [int(xv)].concat(S.map(function (s) { return cell(s.ys[j]); })), cls: xv === realEv ? 'is-current' : '' }; }),
      { numCols: S.map(function (_, i) { return i + 1; }), caption: 'Profit each year per $100 of build money, and years to earn it back, at each level of bookings' });

    var W = Math.max(300, box.clientWidth);
    var wide = W >= 640;
    var allY = [0, R.goalRate || 0];
    S.forEach(function (s) { s.ys.forEach(function (v) { if (isNum(v)) allY.push(v); }); });
    var yStep = niceStep(Math.max.apply(null, allY) - Math.min.apply(null, allY), wide ? 7 : 5);
    var ylo = Math.floor(Math.min.apply(null, allY) / yStep) * yStep;
    var yhi = Math.ceil(Math.max.apply(null, allY) / yStep) * yStep;
    var m = wide ? { l: 52, r: 190, t: 52, b: 46 } : { l: 44, r: 14, t: 56, b: 46 };
    var H = wide ? 400 : 346;
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var x0 = xs[0], x1 = xs[xs.length - 1];
    var x = function (v) { return m.l + ((v - x0) / (x1 - x0)) * pw; };
    var y = function (v) { return m.t + ph - ((v - ylo) / (yhi - ylo)) * ph; };

    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'group', 'aria-label': title + '. All values are in the table below the chart.', class: 'chart-svg' });
    var g = svg('g', { 'aria-hidden': 'true' }); root.appendChild(g);
    box.textContent = '';
    box.appendChild(root);
    var tip = makeTip(box);

    for (var yv = ylo; yv <= yhi + 1e-9; yv += yStep) {
      var vv = Math.round(yv * 10000) / 10000;
      g.appendChild(svg('line', { x1: m.l, x2: m.l + pw, y1: y(vv), y2: y(vv), class: vv === 0 ? 'zero' : 'grid' }));
      var dv = Math.round(Math.abs(vv) * 10000) / 100;
      addText(g, m.l - 8, y(vv) + 4, [(vv < 0 ? MINUS : '') + '$' + (dv % 1 ? dv.toFixed(1) : dv.toFixed(0))], { class: 'axis', 'text-anchor': 'end' });
    }
    addText(g, Math.max(0, m.l - 44), 14, ['Profit a year per $100 spent'], { class: 'cat', 'text-anchor': 'start' });
    var xStep = niceStep(x1 - x0, wide ? 7 : 4);
    for (var xv = Math.ceil(x0 / xStep) * xStep; xv <= x1 + 1e-9; xv += xStep) {
      g.appendChild(svg('line', { x1: x(xv), x2: x(xv), y1: m.t + ph, y2: m.t + ph + 5, class: 'zero' }));
      addText(g, x(xv), m.t + ph + 20, [int(xv)], { class: 'axis', 'text-anchor': 'middle' });
    }
    addText(g, m.l + pw / 2, H - 4, ['Events a year, Hall A and Hall B together'], { class: 'cat', 'text-anchor': 'middle' });

    [[R.typicalRate, wide ? R.typicalShort : 'Typical ~' + Math.round(R.typicalYears) + ' yrs', 14], [R.goalRate, wide ? R.goalShort : 'Goal ' + Math.round(R.goalYears) + ' yrs', -6]].forEach(function (rf) {
      if (!isNum(rf[0])) return;
      g.appendChild(svg('line', { x1: m.l, x2: m.l + pw, y1: y(rf[0]), y2: y(rf[0]), class: 'ref' }));
      addText(g, m.l + 6, y(rf[0]) + rf[2], [rf[1]], { class: 'ref-label', 'text-anchor': 'start' });
    });
    if (isNum(realEv) && realEv >= x0 && realEv <= x1) {
      g.appendChild(svg('line', { x1: x(realEv), x2: x(realEv), y1: m.t - 6, y2: m.t + ph, class: 'marker-line' }));
      var ml = 'Realistic: ' + int(realEv) + ' events';
      addText(g, clampMid(x(realEv), ml, m.l, m.l + pw), m.t - 10, [ml], { class: 'marker-label', 'text-anchor': 'middle' });
    }

    S.forEach(function (s) {
      var d = '';
      s.ys.forEach(function (v, j) { if (isNum(v)) d += (d ? 'L' : 'M') + x(xs[j]).toFixed(1) + ' ' + y(v).toFixed(1); });
      var path = svg('path', { d: d, class: 'series-line' });
      path.style.stroke = s.color;
      g.appendChild(path);
      var jr = xs.indexOf(realEv);
      if (jr >= 0 && isNum(s.ys[jr])) {
        var c = svg('circle', { cx: x(realEv), cy: y(s.ys[jr]), r: 4.5, class: 'series-dot' });
        c.style.fill = s.color;
        g.appendChild(c);
      }
    });

    // Direct labels at the right end on wide screens, pushed apart with a short leader line when they would collide.
    if (wide) {
      var labels = S.map(function (s) {
        var last = s.ys[s.ys.length - 1];
        return { s: s, y0: y(last), y: y(last), text: s.name + ' ' + (isNum(last) ? dollars2(last * 100) : '') };
      }).sort(function (a, b) { return a.y0 - b.y0; });
      for (var k = 1; k < labels.length; k++) if (labels[k].y - labels[k - 1].y < 17) labels[k].y = labels[k - 1].y + 17;
      var over = labels.length ? labels[labels.length - 1].y - (m.t + ph) : 0;
      if (over > 0) labels.forEach(function (l) { l.y -= over; });
      labels.forEach(function (l) {
        var xe = m.l + pw;
        if (Math.abs(l.y - l.y0) > 2) g.appendChild(svg('polyline', { points: xe + ',' + l.y0 + ' ' + (xe + 8) + ',' + l.y0 + ' ' + (xe + 14) + ',' + l.y, class: 'leader' }));
        addText(g, xe + 18, l.y + 4, [l.text], { class: 'cat end-label', 'text-anchor': 'start' });
      });
    }

    // Crosshair: snaps to the nearest level of bookings; one tooltip lists every plan there.
    var cross = svg('line', { x1: 0, x2: 0, y1: m.t, y2: m.t + ph, class: 'crosshair', visibility: 'hidden' });
    root.appendChild(cross);
    var dots = S.map(function (s) {
      var c = svg('circle', { r: 5, class: 'series-dot', visibility: 'hidden' });
      c.style.fill = s.color;
      root.appendChild(c);
      return c;
    });
    var overlay = svg('rect', { x: m.l, y: m.t, width: pw, height: ph, class: 'hit', tabindex: '0', focusable: 'true', role: 'img',
      'aria-label': 'Bookings from ' + int(x0) + ' to ' + int(x1) + ' events a year. Use the left and right arrow keys to read each level.' });
    root.appendChild(overlay);
    var cur = Math.max(0, xs.indexOf(realEv));
    function showAt(j) {
      cur = j;
      var cx = x(xs[j]);
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
      var top = m.t + ph;
      S.forEach(function (s, i) {
        if (!isNum(s.ys[j])) { dots[i].setAttribute('visibility', 'hidden'); return; }
        dots[i].setAttribute('cx', cx); dots[i].setAttribute('cy', y(s.ys[j])); dots[i].setAttribute('visibility', 'visible');
        top = Math.min(top, y(s.ys[j]));
      });
      tip.show(cx, top, int(xs[j]) + ' events a year' + (xs[j] === realEv ? ' (realistic)' : ''), S.map(function (s) {
        var v = s.ys[j];
        return { value: isNum(v) ? (v < 0 ? 'Loses ' + dollars2(-v * 100) : dollars2(v * 100)) : 'n/a', label: s.name + ' · ' + yearsShort(isNum(v) && v > 0 ? 1 / v : null), color: s.color };
      }));
    }
    function hide() { cross.setAttribute('visibility', 'hidden'); dots.forEach(function (d) { d.setAttribute('visibility', 'hidden'); }); tip.hide(); }
    overlay.addEventListener('pointermove', function (e) {
      var bb = root.getBoundingClientRect();
      var px = (e.clientX - bb.left) * (W / bb.width);
      var best = 0, bd = Infinity;
      xs.forEach(function (xv2, j) { var dd = Math.abs(x(xv2) - px); if (dd < bd) { bd = dd; best = j; } });
      showAt(best);
    });
    overlay.addEventListener('pointerleave', hide);
    overlay.addEventListener('focus', function () { showAt(cur); });
    overlay.addEventListener('blur', hide);
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        showAt(Math.min(xs.length - 1, Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1))));
      } else if (e.key === 'Escape') hide();
    });
  }

  /* ---------- The businesses ---------- */

  function renderOperators(data, sc) {
    var ops = (data.operators || {})[sc] || {};
    var wrap = byId('op-cards');
    wrap.textContent = '';
    var cards = [];

    if (ops.halls) {
      var h = ops.halls, hp = h.profit_before_rent;
      var hv = !isNum(hp) ? 'Not available'
        : hp < 0 ? 'Loses money at ' + int(h.events) + ' events a year' + (isNum(h.breakeven_events) ? '; needs about ' + int(h.breakeven_events) + ' to cover its costs' : '')
        : (isNum(h.breakeven_events) ? 'Covers its costs at about ' + int(h.breakeven_events) + ' events a year; ' : '') + 'keeps ' + cents(h.margin) + ' of every sales dollar';
      cards.push({ key: 'halls', title: 'Event halls (Hall A and Hall B), run by the owners', verdict: hv, facts: [
        ['Events a year', int(h.events)],
        ['Money coming in (sales)', money(h.revenue) + ' a year'],
        ['Profit each year', money(hp), isNum(hp) && hp < 0 ? 'is-bad' : 'is-good', 'No rent to pay: the owners run it'],
        ['Kept from every sales dollar', cents(h.margin)],
        ['Money to finish the halls and kitchens (one-time)', money(h.fitout)],
        ['Events needed to cover its costs', isNum(h.breakeven_events) ? int(h.breakeven_events) + ' a year' : 'n/a'],
        ['Rent an outside hall company could afford', perSqFt(h.outside_operator_rent_psf) + ' a year']] });
    }
    if (ops.kids) {
      var kd = ops.kids, ka = kd.profit_after_rent;
      var kv = !isNum(ka) ? 'Not available'
        : ka < 0 ? 'Loses money after rent at these sales'
        : 'Makes ' + dollars2(kd.cash_return * 100) + ' a year for every $100 it puts in; earns it back in ' + (isNum(kd.payback_years) ? kd.payback_years.toFixed(1) + ' years' : 'never');
      cards.push({ key: 'kids', title: 'Kids’ indoor playground (a tenant)', verdict: kv, facts: [
        ['Money coming in (sales)', money(kd.revenue) + ' a year'],
        ['Profit before rent', money(kd.profit_before_rent)],
        ['Rent and its share of property costs', money(kd.rent_and_nnn) + ' a year', '', isNum(kd.rent_psf) ? 'Rent of ' + perSqFt(kd.rent_psf) + ' a year' : null],
        ['Profit each year after rent', money(ka), isNum(ka) && ka < 0 ? 'is-bad' : 'is-good'],
        ['Money the operator puts in (one-time)', money(kd.investment)],
        ['Profit each year for every $100 put in', isNum(kd.cash_return) ? (kd.cash_return < 0 ? 'Loses ' + dollars2(-kd.cash_return * 100) : dollars2(kd.cash_return * 100)) : 'n/a'],
        ['Years to earn back its money', isNum(kd.payback_years) ? kd.payback_years.toFixed(1) + ' years' : 'Never, at these numbers']] });
    }
    if (ops.fuel) {
      var f = ops.fuel, cr = f.cash_return;
      var fv = !isNum(cr) ? 'Not available'
        : cr < 0 ? 'Loses money at these fuel sales'
        : cr < 0.08 ? 'Thin at these fuel sales: ' + dollars2(cr * 100) + ' a year for every $100 it puts in'
        : 'Makes ' + dollars2(cr * 100) + ' a year for every $100 it puts in; earns it back in ' + (isNum(f.payback_years) ? f.payback_years.toFixed(1) + ' years' : 'never');
      cards.push({ key: 'fuel', title: 'Gas station and store (a fuel company renting the land)', verdict: fv, facts: [
        ['Fuel sold', int(f.gallons_month) + ' gallons a month'],
        ['Land rent it pays the property', isNum(f.ground_rent) && f.ground_rent > 0 ? money(f.ground_rent) + ' a year' : 'None in this case'],
        ['Store profit each year after land rent', money(f.store_profit), isNum(f.store_profit) && f.store_profit < 0 ? 'is-bad' : 'is-good'],
        ['Money the fuel company puts in (one-time)', money(f.investment)],
        ['Profit each year for every $100 put in', isNum(cr) ? (cr < 0 ? 'Loses ' + dollars2(-cr * 100) : dollars2(cr * 100)) : 'n/a'],
        ['Years to earn back its money', isNum(f.payback_years) ? f.payback_years.toFixed(1) + ' years' : 'Never, at these numbers']] });
    }
    if (ops.retail_tenant) {
      var rt = ops.retail_tenant;
      cards.push({ key: 'retail', title: 'A shop tenant', verdict: 'Needs about $' + int(rt.sales_psf_needed) + ' of sales per square foot a year so rent and shared costs stay at ' + cents(rt.occupancy_cost_share) + ' of each sales dollar', facts: [
        ['Rent', perSqFt(rt.rent_psf) + ' a year'],
        ['Its share of property costs', perSqFt(rt.nnn_psf) + ' a year'],
        ['Sales it needs', '$' + int(rt.sales_psf_needed) + ' per square foot a year'],
        ['For a 1,500 square foot shop', money(rt.sales_1500sf_shop) + ' of sales a year']] });
    }

    cards.forEach(function (c) {
      var card = el('article', { class: 'op-card', 'aria-labelledby': 'op-' + c.key });
      var head = el('div', { class: 'op-head' });
      head.appendChild(el('h3', { id: 'op-' + c.key }, c.title));
      var badge = el('p', { class: 'verdict' });
      badge.appendChild(el('span', { class: 'verdict-label' }, 'In short'));
      badge.appendChild(document.createTextNode(c.verdict));
      head.appendChild(badge);
      card.appendChild(head);
      card.appendChild(factList('op-facts', c.facts));
      wrap.appendChild(card);
    });
  }

  /* ---------- Columns ---------- */

  function renderColumns(data, sc) {
    var c = data.columns;
    var section = byId('columns');
    if (!c) { section.hidden = true; return; }
    var per = c.per_hall, total = c.total, cost = at(c.cost_per_column, sc);
    setText('columns-count', (isNum(total) ? (numberWord(total).charAt(0).toUpperCase() + numberWord(total).slice(1)) + ' existing roof columns stand' : 'Existing roof columns stand') +
      ' inside the two main rooms' + (isNum(per) ? ', ' + numberWord(per) + ' in each.' : '.'));
    setText('columns-note', c.note || '');
    var withCols = data.plans.filter(function (p) { var v = at(p.column_removal, sc); return isNum(v) && v > 0; });
    var s = isNum(cost) ? 'Taking them out is expected to cost ' + money(cost) + ' per column in the ' + LABELS[sc] + ' case' +
      (isNum(total) ? ', ' + money(cost * total) + ' for all ' + numberWord(total) : '') + '. ' : '';
    if (withCols.length) {
      s += 'That is already counted in the build money of ' + listJoin(withCols.map(planName)) + '.';
      withCols.filter(function (p) { return p.phase1 && isNum(cost) && cost > 0 && Math.round(at(p.column_removal, sc) / cost) < total; }).forEach(function (p) {
        var p2 = phaseTwoCost(p, sc);
        s += ' ' + planName(p) + (isNum(p2) && p2 > 1000 ? ' takes out Hall A’s columns first and Hall B’s when Hall B is added.'
          : ' takes out only Hall A’s columns here, because Hall B is never added in this case.');
      });
    }
    setText('columns-cost', s.trim());
  }

  /* ---------- Lists ---------- */

  function renderText(data) {
    var t = data.text || {};
    function reasons(id, items) {
      var ul = byId(id);
      ul.textContent = '';
      (items || []).forEach(function (it) {
        var li = el('li');
        li.appendChild(el('strong', null, it[0] + '. '));
        li.appendChild(document.createTextNode(it[1] || ''));
        ul.appendChild(li);
      });
    }
    reasons('better-list', t.optimistic);
    reasons('worse-list', t.pessimistic);

    var dl = byId('unknown-list');
    dl.textContent = '';
    (t.unknowns || []).forEach(function (u) {
      var row = el('div', { class: 'unknown' });
      row.appendChild(el('dt', null, u[0]));
      row.appendChild(el('dd', null, u[1]));
      dl.appendChild(row);
    });

    var src = byId('source-list');
    src.textContent = '';
    (t.sources || []).forEach(function (s) {
      if (!/^https:\/\//.test(s[1] || '')) return;
      var li = el('li');
      var a = el('a', { href: s[1], target: '_blank', rel: 'noopener' }, s[0]);
      a.appendChild(el('span', { class: 'visually-hidden' }, ' (opens in a new tab)'));
      li.appendChild(a);
      src.appendChild(li);
    });
  }

  /* ---------- Try your own numbers ---------- */
  // The visitor's own test, for this visit only: kept in memory, never stored or sent anywhere, and the study's numbers never change.
  // The totals use the study's arithmetic. Build money is the one-time items added up; money in and out are the yearly lines added
  // up; profit is in minus out; years to earn back is build money divided by profit. Hall bookings and the event-linked hall costs
  // are per event (the line divided by that case's events) and the year-round hall costs stay fixed: with these the study's own
  // "events needed to cover the hall costs" come out the same in every case. Each change is added to the published totals, so an
  // untouched plan shows exactly the study's numbers. A price typed for the property is added to the build money; it starts empty.
  // The study's events are hall bookings: each hall, each time it is rented (its "$1,000 more per hall booking" change adds $1,000
  // for each of them). So a day with both halls rented counts twice, one side once; the optional days boxes work the total out.

  var HALL_INCOME = /^Hall bookings:\s*/i;
  var HALL_COST = /^Halls?:\s*/i;
  var FIXED_HALL_COST = /year-round/i;

  function capFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function grouped(v) { return isNum(v) ? Math.round(v).toLocaleString('en-US') : ''; }
  // Plain numbers only; dollar signs, commas and spaces are ignored.
  function parsePlain(text) {
    var t = String(text || '').replace(/[\s,$]/g, '');
    if (t === '') return { empty: true };
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) return { error: true };
    return { value: parseFloat(t) };
  }
  function yearsMid(y) {
    if (y === null) return 'Never';
    if (!isNum(y)) return 'n/a';
    if (y > YEAR_CAP) return 'Over ' + YEAR_CAP + '\u00a0years';
    return y.toFixed(1) + '\u00a0years';
  }
  function per100Short(r) { return isNum(r) ? (r < 0 ? 'Loses ' + dollars2(-r * 100) : dollars2(r * 100)) : 'n/a'; }
  function hasOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function startsEmpty(f) { return f.kind === 'price' || f.kind === 'days'; }
  function plainNumber(v) { return isNum(v) ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : ''; }

  // The editable lines of one plan in one case. Lines that are zero in every case (they do not apply to the plan) are left out.
  function whatIfLines(p, sc) {
    var n0 = at(p.hall_events, sc);
    var byEvent = isNum(n0) && n0 > 0;
    var used = function (ln) { return SCENARIOS.some(function (s) { var v = at(ln[1], s); return isNum(v) && Math.abs(v) >= 500; }); };
    var val = function (ln) { var v = at(ln[1], sc); return isNum(v) ? v : 0; };
    var L = { events: byEvent ? n0 : null, hallIn: [], hallCost: [], hallFixed: [], otherIn: [], otherCost: [], build: [] };
    (p.income_lines || []).forEach(function (ln, i) {
      if (!used(ln)) return;
      var v = val(ln);
      if (byEvent && HALL_INCOME.test(ln[0])) L.hallIn.push({ id: 'in' + i, label: capFirst(ln[0].replace(HALL_INCOME, '')), base: v, kind: 'event' });
      else L.otherIn.push({ id: 'in' + i, label: plain(ln[0]), base: v, kind: 'year' });
    });
    (p.cost_lines || []).forEach(function (ln, i) {
      if (!used(ln)) return;
      var v = Math.abs(val(ln));
      if (byEvent && HALL_COST.test(ln[0]) && !FIXED_HALL_COST.test(ln[0])) L.hallCost.push({ id: 'out' + i, label: capFirst(ln[0].replace(HALL_COST, '')), base: v, kind: 'event' });
      else if (byEvent && HALL_COST.test(ln[0])) L.hallFixed.push({ id: 'out' + i, label: capFirst(ln[0].replace(HALL_COST, '')), base: v, kind: 'year' });
      else L.otherCost.push({ id: 'out' + i, label: plain(ln[0]), base: v, kind: 'year' });
    });
    (p.cost_groups || []).forEach(function (gr, i) {
      if (!used(gr)) return;
      L.build.push({ id: 'build' + i, label: plain(gr[0]), base: val(gr), kind: 'once' });
    });
    // Per-event lines: the study's yearly amount divided by its events. The box shows whole dollars; the exact amount is used
    // until the visitor types a different number.
    L.hallIn.concat(L.hallCost).forEach(function (f) { f.per = f.base / n0; f.shown = Math.round(f.per); });
    L.otherIn.concat(L.otherCost, L.hallFixed, L.build).forEach(function (f) { f.shown = Math.round(f.base); });
    return L;
  }

  // Totals for a test. vals holds only the numbers the visitor changed (by line id, plus "events" and "price").
  function whatIfTotals(p, sc, L, vals) {
    var n = hasOwn(vals, 'events') ? vals.events : L.events;
    var ratio = L.events ? n / L.events : 1;
    var dIn = 0, dOut = 0, dBuild = 0;
    var perEvent = function (f) { return (hasOwn(vals, f.id) ? vals[f.id] * n : f.base * ratio) - f.base; };
    var yearly = function (f) { return (hasOwn(vals, f.id) ? vals[f.id] : f.base) - f.base; };
    L.hallIn.forEach(function (f) { dIn += perEvent(f); });
    L.otherIn.forEach(function (f) { dIn += yearly(f); });
    L.hallCost.forEach(function (f) { dOut += perEvent(f); });
    L.hallFixed.concat(L.otherCost).forEach(function (f) { dOut += yearly(f); });
    L.build.forEach(function (f) { dBuild += yearly(f); });
    var t = { events: n, build: buildMoney(p, sc) + dBuild, moneyIn: moneyIn(p, sc) + dIn, moneyOut: moneyOut(p, sc) + dOut,
      profit: profit(p, sc) + dIn - dOut, price: hasOwn(vals, 'price') ? vals.price : null };
    t.years = t.profit > 0 ? t.build / t.profit : null;
    t.rate = t.build > 0 ? t.profit / t.build : null;
    t.yearsWithPrice = t.price !== null && t.profit > 0 ? (t.build + t.price) / t.profit : null;
    return t;
  }

  function makeWhatIf(data) {
    var section = byId('whatif');
    if (!section) return null;
    var plans = data.plans.filter(function (p) {
      return SCENARIOS.every(function (s) { return isNum(buildMoney(p, s)) && isNum(profit(p, s)) && isNum(moneyIn(p, s)) && isNum(moneyOut(p, s)); });
    });
    if (!plans.length) return null;
    var picker = byId('wi-plan-options'), caseNote = byId('wi-case'), inputsBox = byId('wi-inputs'), resultsBox = byId('wi-results'), live = byId('wi-live');
    var tests = {};       // 'plan|case' -> { raw: {line id: text typed}, changed: count }. Memory only.
    var cur = { key: plans[0].key, sc: 'realistic' };
    var L = null, T = null, fields = [], out = {}, liveTimer = null;
    var R = refs(data);

    function planBy(key) { return plans.filter(function (p) { return p.key === key; })[0]; }
    function testFor(key, sc) { var k = key + '|' + sc; return tests[k] || (tests[k] = { raw: {}, changed: 0 }); }

    // Plan picker: one radio button per plan.
    picker.textContent = '';
    var radios = {}, tags = {};
    plans.forEach(function (p) {
      var id = 'wi-plan-' + p.key;
      var lab = el('label', { class: 'wi-plan', for: id });
      var r = el('input', { type: 'radio', name: 'wi-plan', id: id, value: p.key });
      r.addEventListener('change', function () { if (r.checked) { cur.key = p.key; renderEditor(); } });
      lab.appendChild(r);
      var txt = el('span', { class: 'wi-plan-text' });
      txt.appendChild(el('span', { class: 'wi-plan-name' }, planName(p)));
      var tag = el('span', { class: 'wi-plan-tag', hidden: '' }, 'Your test');
      txt.appendChild(tag);
      lab.appendChild(txt);
      picker.appendChild(lab);
      radios[p.key] = r; tags[p.key] = tag;
    });

    function updateTags() {
      plans.forEach(function (p) { var t = tests[p.key + '|' + cur.sc]; tags[p.key].hidden = !(t && t.changed > 0); });
    }

    function group(title, intro) {
      var id = 'wi-g-' + inputsBox.children.length;
      var g = el('div', { class: 'wi-group', role: 'group', 'aria-labelledby': id });
      g.appendChild(el('h3', { class: 'wi-group-title', id: id }, title));
      if (intro) g.appendChild(el('p', { class: 'wi-group-intro' }, intro));
      inputsBox.appendChild(g);
      return g;
    }

    function field(box, f, opts) {
      opts = opts || {};
      var fid = 'wi-' + f.id;
      var wrap = el('div', { class: 'wi-field' });
      wrap.appendChild(el('label', { class: 'wi-label', for: fid }, opts.label || f.label));
      var hint = opts.hint ? el('p', { class: 'wi-hint', id: fid + '-hint' }, opts.hint) : null;
      if (hint) wrap.appendChild(hint);
      var row = el('div', { class: 'wi-control' });
      var isMoney = f.kind !== 'count' && f.kind !== 'days';
      var holder = el('span', { class: 'wi-box' + (isMoney ? ' has-unit' : '') });
      if (isMoney) holder.appendChild(el('span', { class: 'wi-unit', 'aria-hidden': 'true' }, '$'));
      var input = el('input', { type: 'text', id: fid, inputmode: 'numeric', autocomplete: 'off', spellcheck: 'false',
        'aria-describedby': (hint ? fid + '-hint ' : '') + fid + '-echo ' + fid + '-note' });
      input.value = hasOwn(T.raw, f.id) ? T.raw[f.id] : (startsEmpty(f) ? '' : grouped(f.shown));
      holder.appendChild(input);
      row.appendChild(holder);
      var echo = el('span', { class: 'wi-echo', id: fid + '-echo' });
      row.appendChild(echo);
      wrap.appendChild(row);
      var note = el('p', { class: 'wi-note', id: fid + '-note' });
      wrap.appendChild(note);
      box.appendChild(wrap);
      var rec = { f: f, input: input, wrap: wrap, echo: echo, note: note, hint: hint, hintText: opts.hint || '' };
      input.addEventListener('input', function () { T.raw[f.id] = input.value; update(); });
      input.addEventListener('blur', function () {
        // Tidy a valid number into the page's style (commas), leave anything else as typed so it can be fixed.
        var r = parsePlain(input.value);
        if (!r.error && !r.empty && !input.readOnly) { input.value = plainNumber(r.value); if (hasOwn(T.raw, f.id)) T.raw[f.id] = input.value; }
      });
      fields.push(rec);
      return rec;
    }

    function useStudy(rec) {
      delete T.raw[rec.f.id];
      rec.input.value = startsEmpty(rec.f) ? '' : grouped(rec.f.shown);
      update();
      rec.input.focus();
    }

    function renderResults(p) {
      resultsBox.textContent = '';
      out.notice = el('div', { class: 'wi-notice' });
      resultsBox.appendChild(out.notice);
      resultsBox.appendChild(el('h3', { class: 'wi-results-title' }, 'Totals: ' + planName(p) + ', ' + LABELS[cur.sc] + ' case'));
      out.status = el('p', { class: 'plan-status' });
      resultsBox.appendChild(out.status);
      var table = el('table', { class: 'money-table wi-table' });
      table.appendChild(el('caption', { class: 'visually-hidden' }, 'The study’s totals and your test, ' + planName(p) + ', ' + LABELS[cur.sc] + ' case'));
      var thead = el('thead'), hr = el('tr');
      hr.appendChild(el('th', { scope: 'col' }, 'Total'));
      hr.appendChild(el('th', { scope: 'col', class: 'num' }, 'The study'));
      hr.appendChild(el('th', { scope: 'col', class: 'num' }, 'Your test'));
      thead.appendChild(hr); table.appendChild(thead);
      var tbody = el('tbody');
      out.rows = {};
      var rows = [['events', L.events !== null ? 'Hall bookings a year' : null], ['build', 'Money to build it (one-time)'], ['moneyIn', 'Money coming in each year'],
        ['moneyOut', 'Money going out each year'], ['profit', 'Profit each year', 'is-key'], ['years', 'Years to earn back the build money', 'is-key'],
        ['rate', 'Profit each year for every $100 spent'], ['price', 'Price you typed for the property', 'is-price'],
        ['yearsWithPrice', 'Years to earn back the build money and the price', 'is-key is-price']];
      rows.forEach(function (r) {
        if (!r[1]) return;
        var tr = el('tr', r[2] ? { class: r[2] } : null);
        tr.appendChild(el('th', { scope: 'row' }, r[1]));
        var a = el('td', { class: 'num', 'data-label': 'The study' }), b = el('td', { class: 'num', 'data-label': 'Your test' });
        tr.appendChild(a); tr.appendChild(b);
        tbody.appendChild(tr);
        out.rows[r[0]] = { tr: tr, study: a, test: b };
      });
      table.appendChild(tbody);
      resultsBox.appendChild(table);
      out.warn = el('p', { class: 'wi-warn', hidden: '' }, 'A number above is not a plain number, so the study’s number is used for it until it is fixed.');
      resultsBox.appendChild(out.warn);
      var reset = el('button', { type: 'button', class: 'button wi-reset' }, 'Reset to the study’s numbers');
      reset.addEventListener('click', function () {
        T.raw = {};
        fields.forEach(function (rec) { rec.input.readOnly = false; rec.derived = false; rec.input.value = startsEmpty(rec.f) ? '' : grouped(rec.f.shown); });
        update(true);
        live.textContent = 'Back to the study’s numbers for ' + planName(p) + ', ' + LABELS[cur.sc] + ' case.';
      });
      resultsBox.appendChild(reset);
    }

    function renderEditor() {
      var p = planBy(cur.key), sc = cur.sc;
      L = whatIfLines(p, sc);
      T = testFor(cur.key, sc);
      fields = [];
      Object.keys(radios).forEach(function (k) { radios[k].checked = k === cur.key; });
      caseNote.textContent = '';
      caseNote.appendChild(document.createTextNode('Starting from the study’s '));
      caseNote.appendChild(el('strong', null, LABELS[sc] + ' case'));
      caseNote.appendChild(document.createTextNode(' for ' + p.name + '. To start from another case, use Worst, Realistic or Best at the top of the page. Your changes are kept for each plan and case until you reload the page.'));

      renderResults(p);
      inputsBox.textContent = '';
      if (L.events !== null) {
        var hallAOnly = p.phase1 && !(phaseTwoCost(p, sc) > 1000);
        var g = group(hallAOnly ? 'Hall bookings (only Hall A is built in this case)' : 'Hall bookings (Hall A and Hall B)',
          'The study counts ' + int(L.events) + ' hall bookings a year in the ' + LABELS[sc] + ' case (it calls them events): each hall, each time it is rented. The money and costs for each booking are averages over the year.');
        var maxEvents = Math.max.apply(null, SCENARIOS.map(function (s) { var v = at(p.hall_events, s); return isNum(v) ? v : 0; }));
        out.events = field(g, { id: 'events', base: L.events, shown: L.events, kind: 'count' }, {
          label: hallAOnly ? 'Hall A bookings a year' : 'Hall bookings a year, Hall A and Hall B together',
          hint: hallAOnly ? 'Count each time Hall A is rented.' : 'Count each hall each time it is rented. Both halls on the same day count as 2, whether that is two customers or one big event using both halls. A day with one side rented counts as 1.' });
        out.events.max = maxEvents;
        if (!hallAOnly) {
          g.appendChild(el('h4', { class: 'wi-sub' }, 'Or work it out from days (optional)'));
          g.appendChild(el('p', { class: 'wi-sub-intro' }, 'Fill in either box and the hall bookings above are worked out for you. Empty both boxes to type the bookings yourself.'));
          field(g, { id: 'days1', kind: 'days', weight: 1 }, { label: 'Days a year with one hall rented', hint: 'Hall A or Hall B, not both.' });
          field(g, { id: 'days2', kind: 'days', weight: 2 }, { label: 'Days a year with both halls rented',
            hint: 'Two customers, or one customer using both halls. Each of these days counts as 2 bookings, as if both rooms are paid for.' });
        }
        g.appendChild(el('h4', { class: 'wi-sub' }, 'Money from each booking'));
        L.hallIn.forEach(function (f) { field(g, f); });
        g.appendChild(el('h4', { class: 'wi-sub' }, 'Cost of each booking'));
        L.hallCost.forEach(function (f) { field(g, f); });
        if (L.hallFixed.length) {
          g.appendChild(el('h4', { class: 'wi-sub' }, 'Hall costs that stay the same however many bookings (per year)'));
          L.hallFixed.forEach(function (f) { field(g, f); });
        }
      }
      var gi = group(L.events !== null ? 'Other money coming in each year' : 'Money coming in each year', null);
      L.otherIn.forEach(function (f) { field(gi, f); });
      var go = group(L.events !== null ? 'Other money going out each year' : 'Money going out each year', null);
      L.otherCost.forEach(function (f) { field(go, f); });
      var gb = group('Money to build it (one-time)', 'Not counting what is paid for the property.');
      L.build.forEach(function (f) { field(gb, f); });
      var gp = group('Optional: a price for the property', null);
      field(gp, { id: 'price', base: null, shown: null, kind: 'price' }, {
        label: 'Price paid for the property (your test)',
        hint: 'Optional, and empty to start: the study leaves the price out. Type an amount to see how it stretches the years to earn back. It stays on your screen and is not saved.' });
      out.mini = el('div', { class: 'wi-mini', 'aria-hidden': 'true' });
      inputsBox.appendChild(out.mini);
      updateTags();
      update(true);
    }

    function setCell(row, study, test, differs) {
      var r = out.rows[row];
      if (!r) return;
      r.study.textContent = study;
      r.test.textContent = test;
      r.tr.classList.toggle('is-diff', !!differs);
    }

    function update(quiet) {
      var p = planBy(cur.key), sc = cur.sc;
      var vals = {}, changed = 0, errors = 0;
      var parsed = function (f) { return hasOwn(T.raw, f.id) ? parsePlain(T.raw[f.id]) : { empty: true }; };
      // While either days box has something in it, the bookings box is worked out from the days and cannot be typed in.
      var dayRecs = fields.filter(function (rec) { return rec.f.kind === 'days'; });
      var daysMode = dayRecs.some(function (rec) { return !parsed(rec.f).empty; });
      var dayCount = { days1: 0, days2: 0 }, fromDays = 0;
      dayRecs.forEach(function (rec) { var r = parsed(rec.f); if (isNum(r.value)) { dayCount[rec.f.id] = r.value; fromDays += r.value * rec.f.weight; } });
      fields.forEach(function (rec) {
        var f = rec.f, raw = hasOwn(T.raw, f.id) ? T.raw[f.id] : null, state = 'same', r = raw === null ? { empty: true } : parsePlain(raw);
        if (f.kind === 'count') {
          if (daysMode) {
            rec.derived = true;
            rec.input.readOnly = true;
            rec.input.value = plainNumber(fromDays);
          } else if (rec.derived) {
            rec.derived = false;
            rec.input.readOnly = false;
            rec.input.value = raw !== null ? raw : grouped(f.shown);
          }
        }
        if (f.kind === 'count' && daysMode) {
          if (fromDays !== f.shown) vals.events = fromDays;
          state = 'derived';
        } else if (startsEmpty(f)) {
          if (r.error) state = 'error';
          else if (!r.empty) { if (f.kind === 'price') vals.price = r.value; state = 'changed'; }
        } else if (raw !== null) {
          if (r.empty || r.error) state = 'error';
          else if (r.value !== f.shown) { vals[f.id] = r.value; state = 'changed'; }
        }
        rec.state = state;
        if (state === 'changed') changed += 1;
        if (state === 'error') errors += 1;
        rec.wrap.classList.toggle('is-changed', (state === 'changed' && f.kind !== 'price') || (state === 'derived' && fromDays !== f.shown));
        rec.wrap.classList.toggle('is-derived', state === 'derived');
        rec.wrap.classList.toggle('is-error', state === 'error');
        if (state === 'error') rec.input.setAttribute('aria-invalid', 'true'); else rec.input.removeAttribute('aria-invalid');
        rec.note.textContent = '';
        if (state === 'error') {
          rec.note.textContent = r.empty ? 'Type a number (0 is fine).' : 'Type a plain number of 0 or more, like 250000.';
        } else if (state === 'derived') {
          rec.note.textContent = 'Worked out from the days below: ' + int(dayCount.days1) + ' days × 1 + ' + int(dayCount.days2) + ' days × 2 = ' + plainNumber(fromDays) +
            ' bookings. The study has ' + grouped(f.shown) + '. To type your own number here, empty both day boxes.' +
            (dayCount.days1 + dayCount.days2 > 365 ? ' Note: that is more days than a year has.' : '');
        } else if (state === 'changed' && f.kind !== 'price' && f.kind !== 'days') {
          rec.note.appendChild(document.createTextNode('Changed. The study has ' + grouped(f.shown) + (f.kind === 'count' ? ' bookings. ' : '. ')));
          var undo = el('button', { type: 'button', class: 'wi-undo' }, 'Use the study’s number');
          undo.addEventListener('click', function () { useStudy(rec); });
          rec.note.appendChild(undo);
        }
      });
      T.changed = changed;

      var t = whatIfTotals(p, sc, L, vals);
      // Echo each box in the page's money style, and what each per-event amount comes to over the year.
      fields.forEach(function (rec) {
        var f = rec.f, v = hasOwn(vals, f.id) ? vals[f.id] : (f.kind === 'event' ? f.per : f.base);
        if (f.kind === 'days') {
          rec.echo.textContent = rec.state === 'changed' ? '× ' + f.weight + ' = ' + plainNumber(dayCount[f.id] * f.weight) + ' bookings' : 'days a year';
        } else if (rec.state === 'error' && f.kind !== 'price') {
          rec.echo.textContent = 'Using the study’s ' + (f.kind === 'count' ? int(v) + ' bookings' : f.kind === 'event' ? '$' + grouped(v) : money(v) + (f.kind === 'year' ? ' a year' : '')) + ' for now';
        } else if (f.kind === 'count') {
          var wk = t.events / 52;
          rec.echo.textContent = t.events === 0 ? 'bookings a year: none' : 'bookings a year, about ' + (wk >= 10 ? Math.round(wk) : wk.toFixed(1)) + ' a week';
          if (rec.hint) {
            rec.hint.textContent = rec.hintText + (isNum(rec.max) && t.events > rec.max ? ' That is more than any case in the study counts (' + int(rec.max) +
              ' a year at most). In the study’s events chart, profit grows more slowly above that, so this test may read a little high.' : '');
          }
        } else if (f.kind === 'event') rec.echo.textContent = '× ' + int(t.events) + ' bookings = ' + money(v * t.events) + ' a year';
        else if (f.kind === 'year') rec.echo.textContent = money(v) + ' a year';
        else if (f.kind === 'once') rec.echo.textContent = money(v);
        else rec.echo.textContent = hasOwn(vals, 'price') ? money(vals.price) : '';
      });

      var any = changed > 0;
      var sy = payback(p, sc), sr = rate(p, sc);
      var ty = any ? t.years : sy, tr = any ? t.rate : sr;
      setCell('events', L.events !== null ? int(L.events) : '', plainNumber(t.events), L.events !== null && Math.abs(t.events - L.events) > 1e-9);
      setCell('build', money(buildMoney(p, sc)), money(t.build), money(t.build) !== money(buildMoney(p, sc)));
      setCell('moneyIn', money(moneyIn(p, sc)), money(t.moneyIn), money(t.moneyIn) !== money(moneyIn(p, sc)));
      setCell('moneyOut', money(moneyOut(p, sc)), money(t.moneyOut), money(t.moneyOut) !== money(moneyOut(p, sc)));
      setCell('profit', money(profit(p, sc)), money(t.profit), money(t.profit) !== money(profit(p, sc)));
      setCell('years', yearsMid(sy), yearsMid(ty), yearsMid(ty) !== yearsMid(sy));
      setCell('rate', per100Short(sr), per100Short(tr), per100Short(tr) !== per100Short(sr));
      var hasPrice = t.price !== null;
      if (out.rows.price) {
        out.rows.price.tr.hidden = !hasPrice;
        out.rows.yearsWithPrice.tr.hidden = !hasPrice;
        if (hasPrice) {
          setCell('price', 'Left out', money(t.price), true);
          setCell('yearsWithPrice', 'Left out', yearsMid(t.profit > 0 ? t.yearsWithPrice : null), true);
        }
      }
      var g = gradeFor(data, ty, any ? t.profit : profit(p, sc));
      out.status.className = 'plan-status status-' + g.cls;
      out.status.textContent = '';
      out.status.appendChild(el('span', { class: 'status-icon', 'aria-hidden': 'true' }, g.icon));
      out.status.appendChild(document.createTextNode((any ? 'Your test: ' : 'The study: ') + g.text));

      out.notice.textContent = '';
      out.notice.className = 'wi-notice' + (any ? ' is-test' : '');
      if (any) {
        out.notice.appendChild(el('strong', null, 'Your test numbers — not saved, not part of the study.'));
        out.notice.appendChild(document.createTextNode(' ' + changed + (changed === 1 ? ' number changed' : ' numbers changed') + '. Reload the page or press Reset to bring back the study’s numbers.'));
      } else {
        out.notice.appendChild(el('strong', null, 'The study’s numbers.'));
        out.notice.appendChild(document.createTextNode(' Change any number to try your own.'));
      }
      out.warn.hidden = errors === 0;

      out.mini.textContent = '';
      out.mini.appendChild(el('span', { class: 'wi-mini-label' }, any ? 'Your test' : 'The study'));
      out.mini.appendChild(el('span', { class: 'wi-mini-item' }, 'Profit ' + money(any ? t.profit : profit(p, sc)) + ' a year'));
      out.mini.appendChild(el('span', { class: 'wi-mini-item' }, 'Earns back in ' + yearsMid(ty).replace(/^Never$/, 'never').replace(/^Over/, 'over')));
      if (hasPrice) out.mini.appendChild(el('span', { class: 'wi-mini-item' }, 'With the price: ' + yearsMid(t.profit > 0 ? t.yearsWithPrice : null).replace(/^Never$/, 'never').replace(/^Over/, 'over')));
      updateTags();

      if (quiet) return;
      // Tell screen readers the result once typing pauses, not on every key.
      clearTimeout(liveTimer);
      liveTimer = setTimeout(function () {
        live.textContent = (any ? 'Your test: ' : 'The study’s numbers: ') + 'profit ' + money(any ? t.profit : profit(p, sc)) + ' a year, earns back the build money in ' +
          yearsMid(ty).replace(/^Never$/, 'never').replace(/^Over/, 'over') + (hasPrice ? ', or ' + yearsMid(t.profit > 0 ? t.yearsWithPrice : null).replace(/^Never$/, 'never').replace(/^Over/, 'over') + ' with the price.' : '.');
      }, 800);
    }

    section.hidden = false;
    var navItem = document.querySelector('[data-nav="whatif"]');
    if (navItem) navItem.hidden = false;

    return {
      setCase: function (sc) { if (sc === cur.sc && L) return; cur.sc = sc; renderEditor(); },
      open: function (key) {
        if (!planBy(key)) return;
        if (key !== cur.key) { cur.key = key; renderEditor(); }
        radios[key].focus({ preventScroll: true });
        section.scrollIntoView({ block: 'start' });
      }
    };
  }

  /* ---------- Printing: open every expandable table, restore afterwards ---------- */

  var printState = null;
  function beforePrint() {
    if (printState) return;
    printState = [];
    Array.prototype.forEach.call(document.querySelectorAll('details'), function (d) { printState.push([d, d.open]); d.open = true; });
  }
  function afterPrint() {
    if (!printState) return;
    printState.forEach(function (s) { s[0].open = s[1]; });
    printState = null;
  }
  window.addEventListener('beforeprint', beforePrint);
  window.addEventListener('afterprint', afterPrint);

  /* ---------- Scenario switch ---------- */

  function init(data) {
    if (!data || data.schema !== 2 || !Array.isArray(data.plans)) throw new Error('Unexpected feasibility.json schema');
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.seg-btn'));
    var status = byId('scenario-status');
    var current = null;
    var whatIf = makeWhatIf(data);

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
      renderPlans(data, sc);
      renderOperators(data, sc);
      renderColumns(data, sc);
      if (whatIf) whatIf.setCase(sc);
      setText('print-note', 'Printed view: the plan cards, the businesses and the column costs show the ' + LABELS[sc] +
        ' case; the range chart and its table show all three cases. Nothing here counts what is paid for the property.');
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
    // "Try your own numbers for this plan" on each card opens that plan in the test.
    byId('plan-cards').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.wi-open') : null;
      if (b && whatIf) whatIf.open(b.getAttribute('data-plan'));
    });

    renderHero(data);
    renderText(data);
    renderLevers(data);
    renderRangeTable(data);
    setScenario(fromHash() || 'realistic');

    var draw = function () { renderRange(data); renderEvents(data); numberSections(); };
    draw();
    var lastW = 0, pending = false;
    var onResize = function () {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(function () {
        pending = false;
        var w = byId('range-chart').clientWidth;
        if (w !== lastW) { lastW = w; draw(); }
      });
    };
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(byId('range-chart'));
    else window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  }

  fetch('assets/feasibility.json')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(init)
    .catch(function (err) {
      var lead = byId('feas-lead');
      lead.textContent = 'The numbers could not be loaded. Please refresh the page, or download the printable summary below.';
      lead.removeAttribute('data-loading');
      if (window.console) console.warn('feasibility.json failed to load', err);
    });
})();

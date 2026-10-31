// UI. Nothing is stored: no cookies, no Web Storage, no network.
(function () {
  var legsEl = document.getElementById('legs'), tbody = document.querySelector('#out tbody');
  var n = 0, addBtn = document.getElementById('add-row');
  function el(tag, attrs, text) { var e = document.createElement(tag); if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]); if (text !== undefined) e.textContent = text; return e; }
  function field(lbl, input) { var l = el('label', null, lbl + ' '); l.appendChild(input); return l; }
  // Inline error under a field, linked with aria-describedby.
  function setErr(input, msg) {
    var id = input.id + '-err', e = document.getElementById(id);
    if (!e) { e = el('p', { id: id, 'class': 'err' }); input.closest('label').after(e); input.setAttribute('aria-describedby', id); }
    e.textContent = msg || ''; e.hidden = !msg;
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  function addRow() {
    if (legsEl.querySelectorAll('.leg').length >= Odds.MAX_LEGS) return null;
    n++; var i = n, f = el('fieldset', { 'class': 'leg', 'data-leg': i });
    f.appendChild(el('legend', null, 'Leg'));
    f.appendChild(field('Label', el('input', { type: 'text', id: 'lbl-' + i, 'class': 'lbl', placeholder: 'e.g. Team A moneyline', maxlength: '80' })));
    var sel = el('select', { 'class': 'kind', id: 'kind-' + i }); sel.appendChild(el('option', { value: 'am' }, 'American odds')); sel.appendChild(el('option', { value: 'pct' }, 'Hit-rate %'));
    f.appendChild(field('Book price type', sel));
    f.appendChild(field('Book price', el('input', { type: 'text', id: 'price-' + i, 'class': 'price', inputmode: 'decimal', placeholder: 'e.g. -140' })));
    f.appendChild(field('Your true % (optional)', el('input', { type: 'text', id: 'true-' + i, 'class': 'truep', inputmode: 'decimal', placeholder: 'e.g. 45' })));
    f.appendChild(field('Other side price, same book (optional)', el('input', { type: 'text', id: 'other-' + i, 'class': 'other', inputmode: 'numeric', placeholder: 'e.g. +120' })));
    var rm = el('button', { type: 'button', 'class': 'btn small rm' }, 'Remove'); rm.addEventListener('click', function () { f.remove(); render(); });
    f.appendChild(rm); legsEl.appendChild(f); return f;
  }
  function readLegs() {
    return [].map.call(legsEl.querySelectorAll('.leg'), function (f, idx) {
      f.querySelector('legend').textContent = 'Leg ' + (idx + 1);
      f.querySelector('.rm').setAttribute('aria-label', 'Remove leg ' + (idx + 1));
      var kind = f.querySelector('.kind').value, pi = f.querySelector('.price'), ti = f.querySelector('.truep'), oi = f.querySelector('.other');
      var L = { n: idx + 1, label: f.querySelector('.lbl').value.trim(), bad: false };
      var raw = pi.value.trim();
      if (!raw) { setErr(pi, 'Enter a book price, or remove this leg.'); L.bad = true; }
      else if (kind === 'am') { var a = Odds.parseAmerican(raw); setErr(pi, a.err); if (a.err) L.bad = true; else { L.am = a.v; L.dec = Odds.amToDec(a.v); L.input = Odds.fmtAmIn(a.v); } }
      else { var p = Odds.parsePct(raw); setErr(pi, p.err); if (p.err) L.bad = true; else { L.dec = Odds.pToDec(p.v); L.input = Odds.pct(p.v, 1); } }
      var traw = ti.value.trim(), t = null;
      if (traw) { var tp = Odds.parsePct(traw); setErr(ti, tp.err); if (tp.err) L.bad = true; else t = tp.v; } else setErr(ti, '');
      var oraw = oi.value.trim(), o = null;
      if (oraw && kind !== 'am') { setErr(oi, 'The other side price applies to American odds legs only.'); L.bad = true; }
      else if (oraw) { var op = Odds.parseAmerican(oraw); setErr(oi, op.err); if (op.err) L.bad = true; else o = op.v; } else setErr(oi, '');
      if (L.bad) return L;
      L.p = 1 / L.dec;
      if (o !== null) { L.nv = Odds.removeVig(L.am, o); L.otherAm = o; }
      L.trueP = t !== null ? t : (L.nv ? L.nv.nv1 : null); L.trueSrc = t !== null ? 'own' : (L.nv ? 'nv' : null);
      return L;
    });
  }
  function td(tr, text, cls) { var c = el('td', cls ? { 'class': cls } : null, text); tr.appendChild(c); return c; }
  function flagCell(tr, red) { var c = td(tr, red ? 'RED' : '–', red ? 'flag-red' : ''); if (red) c.setAttribute('aria-label', 'Red flag'); }
  function gapTxt(g, dp) { var s = Odds.num(g, dp); return s === Odds.BIG ? s : (g >= 0 ? '+' : '') + s; }
  function render() {
    var all = readLegs(), legs = all.filter(function (L) { return !L.bad; }), badN = all.length - legs.length;
    tbody.textContent = ''; var det = document.getElementById('details'); det.textContent = '';
    addBtn.disabled = all.length >= Odds.MAX_LEGS;
    document.getElementById('max-note').textContent = all.length >= Odds.MAX_LEGS ? 'At most ' + Odds.MAX_LEGS + ' legs per parlay.' : '';
    var used = document.getElementById('used');
    used.textContent = legs.length + ' of ' + all.length + ' legs used' + (badN ? ' — fix or remove ' + (badN === 1 ? 'the leg' : 'the ' + badN + ' legs') + ' marked above to see parlay totals.' : '.');
    used.className = 'line' + (badN ? ' mismatch' : '');
    legs.forEach(function (L) {
      var tr = el('tr'); tr.appendChild(el('th', { scope: 'row' }, L.label ? 'Leg ' + L.n + ': ' + L.label : 'Leg ' + L.n));
      td(tr, L.input); td(tr, Odds.num(L.dec, 4)); td(tr, Odds.pct(L.p, 2));
      td(tr, L.am !== undefined ? Odds.fmtAmIn(L.am) : Odds.fmtAm(Odds.pToAm(L.p)));
      if (L.trueP !== null) {
        var gap = (L.p - L.trueP) * 100, red = L.p > L.trueP;
        td(tr, Odds.pct(L.trueP, 1) + (L.trueSrc === 'nv' ? ' (no-vig)' : ''));
        td(tr, Odds.fmtAm(Odds.pToAm(L.trueP)) + ' (' + Odds.num(Odds.pToDec(L.trueP), 4) + ')');
        td(tr, gapTxt(gap, 2)); flagCell(tr, red);
        det.appendChild(el('p', { 'class': 'line leg-line', 'data-leg': L.n }, 'Leg ' + L.n + ': Book price implies ' + Odds.pct(L.p, 1) + '; your estimate ' + Odds.pct(L.trueP, 1) + '; gap ' + Odds.num(gap, 1) + ' pts. Per $10 the book returns ' + Odds.money(10 * L.dec) + '; a fair price would return ' + Odds.money(10 / L.trueP) + '.'));
      } else { td(tr, '–'); td(tr, '–'); td(tr, '–'); flagCell(tr, false); }
      if (L.nv) det.appendChild(el('p', { 'class': 'line nv-line', 'data-leg': L.n }, 'Leg ' + L.n + ' no-vig (both sides, same book): ' + Odds.fmtAmIn(L.am) + ' / ' + Odds.fmtAmIn(L.otherAm) + ' implied ' + Odds.num(L.nv.p1, 4) + ' + ' + Odds.num(L.nv.p2, 4) + ' = ' + Odds.num(L.nv.sum, 4) + '. No-vig ' + Odds.pct(L.nv.nv1, 2) + ' / ' + Odds.pct(L.nv.nv2, 2) + ', fair ' + Odds.fmtAm(Odds.pToAm(L.nv.nv1)) + ' / ' + Odds.fmtAm(Odds.pToAm(L.nv.nv2)) + '. Book\u2019s cut (hold) ' + Odds.num(L.nv.hold * 100, 1) + '%.'));
      tbody.appendChild(tr);
    });
    var si = document.getElementById('stake'), sp = Odds.parseStake(si.value); setErr(si, sp.err);
    var pi = document.getElementById('posted'), praw = pi.value.trim(), pa = null;
    if (praw) { var pp = Odds.parseAmerican(praw); setErr(pi, pp.err); if (!pp.err) pa = pp.v; } else setErr(pi, '');
    var pay = document.getElementById('payout'), pc = document.getElementById('posted-check');
    pay.textContent = ''; pc.textContent = ''; pc.className = 'line';
    if (!legs.length || badN) return; // no parlay totals while any leg has an error
    var D = legs.reduce(function (a, L) { return a * L.dec; }, 1), P = 1 / D, allTrue = legs.every(function (L) { return L.trueP !== null; });
    var tr = el('tr', { 'class': 'parlay' }); tr.appendChild(el('th', { scope: 'row' }, legs.length > 1 ? 'Parlay' : 'Total'));
    td(tr, legs.length + (legs.length === 1 ? ' leg' : ' legs')); td(tr, Odds.num(D, 4)); td(tr, Odds.pct(P, 2)); td(tr, Odds.fmtAm(Odds.pToAm(P)));
    if (allTrue) {
      var PT = legs.reduce(function (a, L) { return a * L.trueP; }, 1), g = (P - PT) * 100;
      td(tr, Odds.pct(PT, 1)); td(tr, Odds.fmtAm(Odds.pToAm(PT)) + ' (' + Odds.num(1 / PT, 4) + ')'); td(tr, gapTxt(g, 2)); flagCell(tr, P > PT);
    } else { td(tr, 'needs all legs'); td(tr, '–'); td(tr, '–'); flagCell(tr, false); }
    tbody.appendChild(tr);
    if (!sp.err) pay.textContent = 'Payout per ' + Odds.money(sp.v).replace(/\.00$/, '') + ': total return ' + Odds.money(sp.v * D) + ', profit ' + Odds.money(sp.v * (D - 1)) + '.';
    if (pa !== null) {
      var pd = Odds.amToDec(pa), rd = Odds.relDiff(pd, D), sgp = document.getElementById('sgp').checked;
      if (rd <= Odds.TOL) { pc.textContent = 'Posted ' + Odds.fmtAm(pa) + ' matches the legs (within 1%).'; pc.className = 'line ok'; }
      else {
        var nums = 'posted ' + Odds.fmtAm(pa) + ' = ' + Odds.num(pd, 2) + ' decimal vs legs ' + Odds.fmtAm(Odds.pToAm(P)) + ' = ' + Odds.num(D, 2) + ' decimal, a ' + Odds.num(rd * 100, 1) + '% difference.';
        if (sgp) { pc.textContent = 'This may be a same-game parlay (book prices these differently): ' + nums; pc.className = 'line sgp'; }
        else { pc.textContent = 'Posted price does not match its legs: ' + nums; pc.className = 'line mismatch'; }
      }
    }
  }
  addBtn.addEventListener('click', function () { var f = addRow(); if (f) f.querySelector('.price').focus(); render(); });
  document.addEventListener('input', render); document.addEventListener('change', render);
  addRow(); addRow(); addRow(); render();
  window.ParlayApp = { render: render, addRow: addRow };
})();

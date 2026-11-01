// UI. Nothing is stored: no cookies, no Web Storage, no network. Pickers are inputs only.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var legsEl = $('legs'), tbody = document.querySelector('#out tbody'), gamesEl = $('games');
  var n = 0, g = 0, sport = null;
  function el(tag, attrs, text) { var e = document.createElement(tag); if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]); if (text !== undefined) e.textContent = text; return e; }
  function field(lbl, input, signed) { var l = el('label', null, lbl + ' '); if (signed) { var s = el('span', { 'class': 'signrow' }); s.appendChild(input); l.appendChild(s); addSign(input, lbl); } else l.appendChild(input); return l; }
  function say(t) { $('live').textContent = t; }
  // +/- toggle beside a number-keypad field (phone keypads often lack a minus key).
  function addSign(input, lbl) {
    var b = el('button', { type: 'button', 'class': 'btn sign', 'aria-label': 'Switch plus or minus: ' + lbl }, '+/\u2212');
    b.addEventListener('click', function () { var v = input.value.trim(); input.value = v.charAt(0) === '-' ? '+' + v.slice(1) : '-' + v.replace(/^\+/, ''); input.dispatchEvent(new Event('input', { bubbles: true })); });
    input.after(b);
  }
  // Inline error, linked with aria-describedby. `after` defaults to the field's label.
  function setErr(input, msg, after) {
    var id = input.id + '-err', e = $(id);
    if (!e) { e = el('p', { id: id, 'class': 'err' }); (after || input.closest('label')).after(e); input.setAttribute('aria-describedby', id); }
    e.textContent = msg || ''; e.hidden = !msg;
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  function chips(label, values, cls, id) {
    var grp = el('div', { 'class': 'chips', role: 'group', 'aria-label': label, id: id, tabindex: '-1' });
    values.forEach(function (v) { var b = el('button', { type: 'button', 'class': 'chip ' + cls, 'aria-pressed': 'false', 'data-v': v }, v); grp.appendChild(b); });
    grp.addEventListener('click', function (ev) { var b = ev.target.closest('.chip'); if (!b) return; grp.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); }); grp.dispatchEvent(new Event('change', { bubbles: true })); });
    return grp;
  }
  function picked(grp) { var b = grp.querySelector('[aria-pressed="true"]'); return b ? b.getAttribute('data-v') : null; }
  function unpick(grp) { grp.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); }); }
  function toggle(btn, panel) { btn.addEventListener('click', function () { var o = btn.getAttribute('aria-expanded') !== 'true'; btn.setAttribute('aria-expanded', o); panel.hidden = !o; }); }
  // Lines: optional sign, up to 3 digits, optional 1-2 decimals.
  function parseLine(s, kind) {
    s = String(s).trim(); if (!/^[+-]?\d{1,3}(\.\d{1,2})?$/.test(s)) return { err: kind === 'spread' ? 'Enter a line like -3.5 or +7.' : 'Enter a line like 47.5.' };
    var v = Number(s.replace(/^\+/, '')); if (kind !== 'spread' && v <= 0) return { err: 'The line must be above 0.' };
    if (kind === 'spread' && Math.abs(v) > 100) return { err: 'Spread lines go up to 100 either way.' };
    return { v: v, txt: kind === 'spread' ? (v > 0 ? '+' + v : String(v)) : String(v) };
  }

  // Unicode minus and dashes -> ASCII hyphen, on input (before any render).
  var DASH = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g;
  document.addEventListener('input', function (e) { var t = e.target; if (t.tagName === 'INPUT' && t.type === 'text' && DASH.test(t.value)) { var pos = t.selectionStart; t.value = t.value.replace(DASH, '-'); try { t.setSelectionRange(pos, pos); } catch (x) {} } }, true);
  function gkey(a, b) { return [a, b].sort().join(' | '); }
  // ---- tabs ----
  var tabs = [$('tab-build'), $('tab-quick')];
  function showTab(t) { tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; $(x.getAttribute('aria-controls')).hidden = !on; }); $('bar').hidden = t !== tabs[0]; document.body.classList.toggle('has-bar', t === tabs[0]); }
  tabs.forEach(function (t, i) { t.addEventListener('click', function () { showTab(t); }); t.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var o = tabs[1 - i]; showTab(o); o.focus(); } }); });

  // ---- sport + game ----
  function fill(sel, list) { sel.textContent = ''; sel.appendChild(el('option', { value: '' }, 'Choose team')); list.forEach(function (t) { sel.appendChild(el('option', { value: t }, t)); }); }
  $('sports').addEventListener('click', function (ev) {
    var b = ev.target.closest('.sport'); if (!b) return; sport = b.getAttribute('data-sport');
    document.querySelectorAll('.sport').forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
    fill($('team-a'), Teams[sport]); fill($('team-b'), Teams[sport]); $('game-form').hidden = false; setErr($('team-a'), ''); setErr($('team-b'), '');
  });
  $('add-game').addEventListener('click', function () {
    var a = $('team-a').value, b = $('team-b').value;
    setErr($('team-a'), a ? '' : 'Choose a team.'); setErr($('team-b'), !b ? 'Choose a team.' : (b === a ? 'Pick two different teams.' : ''));
    if (!a || !b || a === b) return;
    var c = addGame(sport, a, b); $('team-a').value = ''; $('team-b').value = ''; c.querySelector('.mkt').focus(); say('Game added: ' + a + ' vs ' + b + '.');
  });

  function addGame(sp, a, b) {
    g++; var id = 'g' + g, c = el('section', { 'class': 'card game', id: id, 'aria-labelledby': id + '-h', 'data-game': a + ' vs ' + b });
    c.setAttribute('data-key', gkey(a, b)); var hd = el('div', { 'class': 'ghead' }); hd.appendChild(el('h3', { id: id + '-h' }, a + ' vs ' + b));
    var rg = el('button', { type: 'button', 'class': 'btn small rmg', 'aria-label': 'Remove game ' + a + ' vs ' + b }, 'Remove game'); hd.appendChild(rg); c.appendChild(hd);
    c.appendChild(el('p', { 'class': 'muted tag' }, sp));
    var mk = chips('Market for ' + a + ' vs ' + b, ['Moneyline', 'Spread', 'Total', 'Player prop'], 'mkt', id + '-mkt'); mk.firstChild.setAttribute('aria-pressed', 'true'); c.appendChild(mk);
    var team = chips('Team', [a, b], 'team', id + '-team'); c.appendChild(team);
    var player = el('input', { type: 'text', id: id + '-player', maxlength: '40', autocomplete: 'off', placeholder: 'Type a player name' }), pl = field('Player name', player); c.appendChild(pl);
    var stat = chips('Stat', Stats[sp], 'stat', id + '-stat'); c.appendChild(stat);
    var ou = chips('Over or Under', ['Over', 'Under'], 'ou', id + '-ou'); c.appendChild(ou);
    var line = el('input', { type: 'text', id: id + '-line', inputmode: 'decimal', autocomplete: 'off', placeholder: 'e.g. 47.5' }), ll = field('Line', line, true); c.appendChild(ll);
    var pc = chips('Book price', ['-110', '-120', '+100', '+150'], 'pchip', id + '-pc'); c.appendChild(el('p', { 'class': 'glabel', 'aria-hidden': 'true' }, 'Book price')); c.appendChild(pc);
    var price = el('input', { type: 'text', id: id + '-price', inputmode: 'decimal', autocomplete: 'off', placeholder: 'or type, e.g. -140' }); c.appendChild(field('Custom price', price, true));
    var cv = el('button', { type: 'button', 'class': 'btn toggle cvt', 'aria-expanded': 'false', 'aria-controls': id + '-cvp' }, 'Check value'); c.appendChild(cv);
    var cvp = el('div', { id: id + '-cvp', 'class': 'cvp', hidden: '' });
    var tp = el('input', { type: 'text', id: id + '-true', inputmode: 'decimal', autocomplete: 'off', placeholder: 'e.g. 45' }); cvp.appendChild(field('Your % (optional)', tp));
    var op = el('input', { type: 'text', id: id + '-other', inputmode: 'decimal', autocomplete: 'off', placeholder: 'e.g. +120' }); cvp.appendChild(field('Other side price, same book (optional)', op, true));
    c.appendChild(cvp); toggle(cv, cvp);
    var add = el('button', { type: 'button', 'class': 'btn primary addleg' }, 'Add to slip'); c.appendChild(add);
    function mode() {
      var m = picked(mk); team.hidden = !(m === 'Moneyline' || m === 'Spread'); pl.hidden = stat.hidden = m !== 'Player prop'; ou.hidden = !(m === 'Total' || m === 'Player prop');
      ll.hidden = m === 'Moneyline'; ll.querySelector('.sign').hidden = m !== 'Spread'; line.placeholder = m === 'Spread' ? 'e.g. -3.5' : (m === 'Total' ? 'e.g. 47.5' : 'e.g. 24.5');
    }
    mk.addEventListener('change', function () { [team, stat, ou, player, line].forEach(function (x) { clearE(x); }); mode(); });
    pc.addEventListener('change', function () { price.value = picked(pc); clearE(price); });
    price.addEventListener('input', function () { var v = price.value.trim(); pc.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v ? 'true' : 'false'); }); });
    function clearE(x) { if ($(x.id + '-err')) setErr(x, ''); }
    function gerr(grp, msg) { setErr(grp, msg, grp); }
    add.addEventListener('click', function () {
      var m = picked(mk), ok = true, d = [];
      function need(cond, x, msg, isGrp) { if (isGrp) gerr(x, cond ? '' : msg); else setErr(x, cond ? '' : msg); if (!cond) ok = false; return cond; }
      if (m === 'Moneyline' || m === 'Spread') need(picked(team), team, 'Pick a team.', true);
      if (m === 'Player prop') { need(player.value.trim(), player, 'Type a player name.'); need(picked(stat), stat, 'Pick a stat.', true); }
      if (m === 'Total' || m === 'Player prop') need(picked(ou), ou, 'Pick Over or Under.', true);
      var ln = null; if (m !== 'Moneyline') { ln = parseLine(line.value, m === 'Spread' ? 'spread' : 'pos'); need(!ln.err, line, ln.err); }
      var pr = price.value.trim() ? Odds.parseAmerican(price.value) : { err: 'Tap a price or type one.' }; need(!pr.err, price, pr.err);
      var t = tp.value.trim() ? Odds.parsePct(tp.value) : {}; need(!t.err, tp, t.err);
      var o = op.value.trim() ? Odds.parseAmerican(op.value) : {}; need(!o.err, op, o.err);
      if ((t.err || o.err) && cv.getAttribute('aria-expanded') !== 'true') cv.click();
      if (!ok) { var f = c.querySelector('[aria-invalid="true"]'); if (f) f.focus(); return; }
      if (legsEl.children.length >= Odds.MAX_LEGS) return;
      var meta = { m: m, team: picked(team), ou: picked(ou), line: ln ? ln.v : null, player: player.value.trim().toLowerCase(), stat: picked(stat) };
      var desc = m === 'Moneyline' ? 'Moneyline: ' + picked(team) : m === 'Spread' ? 'Spread: ' + picked(team) + ' ' + ln.txt : m === 'Total' ? 'Total: ' + picked(ou) + ' ' + ln.txt : 'Player prop: ' + player.value.trim() + ' ' + picked(stat) + ' ' + picked(ou) + ' ' + ln.txt;
      addLeg(c.getAttribute('data-game'), desc, price.value.trim(), tp.value.trim(), op.value.trim(), c.getAttribute('data-key'), meta);
      price.value = ''; unpick(pc); unpick(team); unpick(ou); tp.value = ''; op.value = ''; line.value = ''; player.value = ''; unpick(stat);
      say('Added to slip: ' + desc + '. ' + legsEl.children.length + ' in slip.'); render();
    });
    rg.addEventListener('click', function () { var gm = $('game-msg'); gm.textContent = 'Game removed: ' + a + ' vs ' + b + '. Its legs stay in the slip; remove them there if needed.'; gm.hidden = false; c.remove(); say(gm.textContent); render(); });
    mode(); gamesEl.appendChild(c); render(); return c;
  }

  // ---- slip legs ----
  function addLeg(game, desc, price, tru, other, key, meta) {
    if (legsEl.children.length >= Odds.MAX_LEGS) return null;
    n++; var i = n, li = el('li', { 'class': 'leg', 'data-leg': i, 'data-game': game, 'data-key': key || game }); li._meta = meta || {};
    var top = el('div', { 'class': 'ltop' }), txt = el('div');
    txt.appendChild(el('p', { 'class': 'lnum' })); txt.appendChild(el('p', { 'class': 'desc' }, desc)); txt.appendChild(el('p', { 'class': 'muted gname' }, game));
    top.appendChild(txt);
    var rm = el('button', { type: 'button', 'class': 'btn small rm' }, 'Remove'); top.appendChild(rm); li.appendChild(top);
    var pi = el('input', { type: 'text', id: 'price-' + i, 'class': 'price', inputmode: 'decimal', autocomplete: 'off', value: price }); li.appendChild(field('Book price', pi, true));
    var cv = el('button', { type: 'button', 'class': 'btn toggle cvt', 'aria-expanded': tru || other ? 'true' : 'false', 'aria-controls': 'cv-' + i }, 'Check value'); li.appendChild(cv);
    var cvp = el('div', { id: 'cv-' + i, 'class': 'cvp' }); if (!(tru || other)) cvp.hidden = true;
    cvp.appendChild(field('Your % (optional)', el('input', { type: 'text', id: 'true-' + i, 'class': 'truep', inputmode: 'decimal', autocomplete: 'off', placeholder: 'e.g. 45', value: tru })));
    cvp.appendChild(field('Other side price, same book (optional)', el('input', { type: 'text', id: 'other-' + i, 'class': 'other', inputmode: 'decimal', autocomplete: 'off', placeholder: 'e.g. +120', value: other }), true));
    li.appendChild(cvp); toggle(cv, cvp);
    rm.addEventListener('click', function () { li.remove(); say('Removed from slip: ' + desc + '.'); render(); });
    legsEl.appendChild(li); return li;
  }
  // One leg's math from its inputs (shared by slip and Quick convert).
  function computeLeg(kind, pi, ti, oi, n0) {
    var L = { n: n0, bad: false }, raw = pi.value.trim();
    if (!raw) { setErr(pi, kind === 'quick' ? '' : 'Enter a book price, or remove this leg.'); L.bad = true; L.empty = true; }
    else if (kind !== 'pct') { var a = Odds.parseAmerican(raw); setErr(pi, a.err); if (a.err) L.bad = true; else { L.am = a.v; L.dec = Odds.amToDec(a.v); L.input = Odds.fmtAmIn(a.v); } }
    else { var p = Odds.parsePct(raw); setErr(pi, p.err); if (p.err) L.bad = true; else { L.dec = Odds.pToDec(p.v); L.input = Odds.pct(p.v, 1); } }
    var traw = ti.value.trim(), t = null;
    if (traw) { var tp = Odds.parsePct(traw); setErr(ti, tp.err); if (tp.err) L.bad = true; else t = tp.v; } else setErr(ti, '');
    var oraw = oi.value.trim(), o = null;
    if (oraw && kind === 'pct') { setErr(oi, 'The other side price applies to American odds only.'); L.bad = true; }
    else if (oraw) { var op = Odds.parseAmerican(oraw); setErr(oi, op.err); if (op.err) L.bad = true; else o = op.v; } else setErr(oi, '');
    if (L.bad) return L;
    L.p = 1 / L.dec;
    if (o !== null) { L.nv = Odds.removeVig(L.am, o); L.otherAm = o; }
    L.trueP = t !== null ? t : (L.nv ? L.nv.nv1 : null); L.trueSrc = t !== null ? 'own' : (L.nv ? 'nv' : null);
    return L;
  }
  function readLegs() {
    return [].map.call(legsEl.querySelectorAll('.leg'), function (f, idx) {
      var desc = f.querySelector('.desc').textContent; f.querySelector('.lnum').textContent = 'Leg ' + (idx + 1);
      f.querySelector('.rm').setAttribute('aria-label', 'Remove leg ' + (idx + 1) + ': ' + desc);
      var L = computeLeg('am', f.querySelector('.price'), f.querySelector('.truep'), f.querySelector('.other'), idx + 1);
      L.label = desc; L.game = f.getAttribute('data-game'); L.key = f.getAttribute('data-key'); L.meta = f._meta || {};
      if (L.bad && f.querySelector('.cvp [aria-invalid="true"]') && f.querySelector('.cvt').getAttribute('aria-expanded') !== 'true') f.querySelector('.cvt').click();
      return L;
    });
  }
  function td(tr, text, cls) { var c = el('td', cls ? { 'class': cls } : null, text); tr.appendChild(c); return c; }
  function flagCell(tr, red) { var c = td(tr, red ? 'RED' : '\u2013', red ? 'flag-red' : ''); if (red) c.setAttribute('aria-label', 'Red flag'); }
  function gapTxt(gp, dp) { var s = Odds.num(gp, dp); return s === Odds.BIG ? s : (gp >= 0 ? '+' : '') + s; }
  function legRow(L, tb, det) {
    var tr = el('tr'); tr.appendChild(el('th', { scope: 'row' }, L.label ? 'Leg ' + L.n + ': ' + L.label : 'Leg ' + L.n));
    td(tr, L.input); td(tr, Odds.num(L.dec, 4)); td(tr, Odds.pct(L.p, 2));
    td(tr, L.am !== undefined ? Odds.fmtAmIn(L.am) : Odds.fmtAm(Odds.pToAm(L.p)));
    if (L.trueP !== null) {
      var gap = (L.p - L.trueP) * 100, red = L.p > L.trueP;
      td(tr, Odds.pct(L.trueP, 1) + (L.trueSrc === 'nv' ? ' (no-vig)' : ''));
      td(tr, Odds.fmtAm(Odds.pToAm(L.trueP)) + ' (' + Odds.num(Odds.pToDec(L.trueP), 4) + ')');
      td(tr, gapTxt(gap, 2)); flagCell(tr, red);
      det.appendChild(el('p', { 'class': 'line leg-line', 'data-leg': L.n }, 'Leg ' + L.n + ': Book price implies ' + Odds.pct(L.p, 1) + '; your estimate ' + Odds.pct(L.trueP, 1) + '; gap ' + Odds.num(gap, 1) + ' pts. Per $10 the book returns ' + Odds.money(10 * L.dec) + '; a fair price would return ' + Odds.money(10 / L.trueP) + '.'));
    } else { td(tr, '\u2013'); td(tr, '\u2013'); td(tr, '\u2013'); flagCell(tr, false); }
    if (L.nv) det.appendChild(el('p', { 'class': 'line nv-line', 'data-leg': L.n }, 'Leg ' + L.n + ' no-vig (both sides, same book): ' + Odds.fmtAmIn(L.am) + ' / ' + Odds.fmtAmIn(L.otherAm) + ' implied ' + Odds.num(L.nv.p1, 4) + ' + ' + Odds.num(L.nv.p2, 4) + ' = ' + Odds.num(L.nv.sum, 4) + '. No-vig ' + Odds.pct(L.nv.nv1, 2) + ' / ' + Odds.pct(L.nv.nv2, 2) + ', fair ' + Odds.fmtAm(Odds.pToAm(L.nv.nv1)) + ' / ' + Odds.fmtAm(Odds.pToAm(L.nv.nv2)) + '. Book\u2019s cut (hold) ' + Odds.num(L.nv.hold * 100, 1) + '%.'));
    tb.appendChild(tr);
  }
  function setBar(t, cls) { var b = $('bar-txt'); b.textContent = t; b.className = cls || ''; }
  function render() {
    var all = readLegs(), legs = all.filter(function (L) { return !L.bad; }), badN = all.length - legs.length, full = all.length >= Odds.MAX_LEGS;
    tbody.textContent = ''; var det = $('details'); det.textContent = '';
    document.querySelectorAll('.addleg').forEach(function (b) { b.disabled = full; });
    $('empty').hidden = all.length > 0;
    $('max-note').textContent = full ? 'At most ' + Odds.MAX_LEGS + ' legs per parlay.' : '';
    var used = $('used');
    used.textContent = !all.length ? '' : all.length === 1 ? (badN ? 'Fix or remove the leg marked above to see totals.' : '1 leg used.') : legs.length + ' of ' + all.length + ' legs used' + (badN ? ' \u2014 fix or remove ' + (badN === 1 ? 'the leg' : 'the ' + badN + ' legs') + ' marked above to see parlay totals.' : '.');
    used.className = 'line' + (badN ? ' mismatch' : '');
    // Same-game label (information only).
    var byG = {}, names = {}; all.forEach(function (L) { (byG[L.key] = byG[L.key] || []).push(L); names[L.key] = names[L.key] || L.game; });
    var shared = Object.keys(byG).filter(function (k) { return byG[k].length > 1; });
    $('sgp-note').textContent = shared.map(function (k) { return 'Legs ' + byG[k].map(function (L) { return L.n; }).join(', ') + ' are from the same game (' + names[k] + ').'; }).join(' ');
    var corr = $('corr'); corr.hidden = !shared.length;
    corr.textContent = shared.length ? 'Same-game caveat: legs from one game are often linked, so the straight product above may not match how a same-game price is set.' : '';
    var opp = [];
    shared.forEach(function (k) { var G = byG[k];
      for (var x = 0; x < G.length; x++) for (var y = x + 1; y < G.length; y++) { var A = G[x].meta, B = G[y].meta, why = null;
        if (A.m === 'Moneyline' && B.m === 'Moneyline' && A.team && B.team && A.team !== B.team) why = 'both moneylines of one game';
        else if (A.m === 'Spread' && B.m === 'Spread' && A.team !== B.team && A.line === -B.line) why = 'both sides of one spread';
        else if (A.m === 'Total' && B.m === 'Total' && A.ou !== B.ou && A.line === B.line) why = 'Over and Under on the same total';
        else if (A.m === 'Player prop' && B.m === 'Player prop' && A.player === B.player && A.stat === B.stat && A.ou !== B.ou && A.line === B.line) why = 'Over and Under on the same player line';
        if (why) opp.push('Legs ' + G[x].n + ' and ' + G[y].n + ' are ' + why + '; at most one of them can come true, yet the total above multiplies both.'); } });
    var oe = $('opp'); oe.textContent = opp.join(' '); oe.hidden = !opp.length;
    legs.forEach(function (L) { legRow(L, tbody, det); });
    var si = $('stake'), sp = Odds.parseStake(si.value); setErr(si, sp.err);
    var pi = $('posted'), praw = pi.value.trim(), pa = null;
    if (praw) { var pp = Odds.parseAmerican(praw); setErr(pi, pp.err); if (!pp.err) pa = pp.v; } else setErr(pi, '');
    var pay = $('payout'), pc = $('posted-check');
    pay.textContent = ''; pc.textContent = ''; pc.className = 'line';
    if (!all.length) { setBar('Slip empty'); return; }
    if (badN) { setBar(all.length === 1 ? 'Fix the marked leg' : legs.length + ' of ' + all.length + ' legs used \u2014 fix the marked leg', 'warn'); return; } // no totals while any leg has an error
    var D = legs.reduce(function (a, L) { return a * L.dec; }, 1), P = 1 / D, allTrue = legs.every(function (L) { return L.trueP !== null; });
    var tr = el('tr', { 'class': 'parlay' }); tr.appendChild(el('th', { scope: 'row' }, legs.length > 1 ? 'Parlay' : 'Total'));
    td(tr, legs.length + (legs.length === 1 ? ' leg' : ' legs')); td(tr, Odds.num(D, 4)); td(tr, Odds.pct(P, 2)); td(tr, Odds.fmtAm(Odds.pToAm(P)));
    if (allTrue) {
      var PT = legs.reduce(function (a, L) { return a * L.trueP; }, 1), gp = (P - PT) * 100;
      td(tr, Odds.pct(PT, 1)); td(tr, Odds.fmtAm(Odds.pToAm(PT)) + ' (' + Odds.num(1 / PT, 4) + ')'); td(tr, gapTxt(gp, 2)); flagCell(tr, P > PT);
    } else { td(tr, legs.length === 1 ? '\u2013' : 'needs all legs'); td(tr, '\u2013'); td(tr, '\u2013'); flagCell(tr, false); }
    tbody.appendChild(tr);
    var stakeTxt = sp.err ? '' : Odds.money(sp.v).replace(/\.00$/, '');
    if (!sp.err) pay.textContent = 'Payout per ' + stakeTxt + ': total return ' + Odds.money(sp.v * D) + ', profit ' + Odds.money(sp.v * (D - 1)) + '.';
    setBar(legs.length + (legs.length === 1 ? ' leg' : ' legs') + ' \u00b7 ' + Odds.fmtAm(Odds.pToAm(P)) + (shared.length ? ' \u00b7 same game' : '') + (sp.err ? ' \u00b7 check stake' : ' \u00b7 ' + stakeTxt + ' returns ' + Odds.money(sp.v * D)));
    if (pa !== null) {
      var pTxt = pa === Math.round(pa) ? (pa > 0 ? '+' : '') + pa : Odds.fmtAm(pa), pd = Odds.amToDec(pa), rd = Odds.relDiff(pd, D), sgp = $('sgp').checked;
      if (rd <= Odds.TOL) { pc.textContent = 'Posted ' + pTxt + ' matches the legs (within 1%).'; pc.className = 'line ok'; }
      else {
        var nums = 'posted ' + pTxt + ' = ' + Odds.num(pd, 2) + ' decimal vs legs ' + Odds.fmtAm(Odds.pToAm(P)) + ' = ' + Odds.num(D, 2) + ' decimal, a ' + Odds.num(rd * 100, 1) + '% difference.';
        if (sgp) { pc.textContent = 'This may be a same-game parlay (book prices these differently): ' + nums; pc.className = 'line sgp'; }
        else { pc.textContent = 'Posted price does not match its legs: ' + nums; pc.className = 'line mismatch'; }
      }
    }
  }
  // ---- Quick convert ----
  var qkind = 'am';
  document.querySelectorAll('.qkind').forEach(function (b) { b.addEventListener('click', function () { qkind = b.getAttribute('data-kind'); document.querySelectorAll('.qkind').forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); }); $('q-price').placeholder = qkind === 'pct' ? 'e.g. 45' : 'e.g. -140'; renderQuick(); }); });
  function renderQuick() {
    var tb = document.querySelector('#qc-out tbody'), det = $('q-details'); tb.textContent = ''; det.textContent = ''; $('q-payout').textContent = '';
    var L = computeLeg(qkind === 'pct' ? 'pct' : 'quick', $('q-price'), $('q-true'), $('q-other'), 1);
    if (L.bad) { if ($('q-cvp').querySelector('[aria-invalid="true"]') && $('q-cv').getAttribute('aria-expanded') !== 'true') $('q-cv').click(); return; }
    legRow(L, tb, det); $('q-payout').textContent = 'Payout per $10: total return ' + Odds.money(10 * L.dec) + ', profit ' + Odds.money(10 * (L.dec - 1)) + '.';
  }
  toggle($('q-cv'), $('q-cvp'));
  ['q-price', 'q-other', 'posted'].forEach(function (id) { addSign($(id), id === 'posted' ? 'Posted parlay price' : id === 'q-price' ? 'Book price' : 'Other side price'); });
  $('view-quick').addEventListener('input', renderQuick); $('view-quick').addEventListener('click', function (e) { if (e.target.closest('.sign')) renderQuick(); });
  $('slip').addEventListener('input', render); $('slip').addEventListener('change', render);
  showTab(tabs[0]); render(); renderQuick();
  window.ParlayApp = { render: render };
})();

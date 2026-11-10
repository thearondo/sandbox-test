// v3 UI. Nothing is stored (no cookies, no Web Storage). The only network requests are to this site's own files (OCR engine, on first upload).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var DASH = /[\u2212\u2012\u2013\u2014\u2015]/g;
  function el(tag, attrs, text) { var e = document.createElement(tag); if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (text != null) e.textContent = text; return e; }
  function say(t) { $('status').textContent = t; }
  var BOOKS = [
    ['FanDuel', 'https://sportsbook.fanduel.com/'], ['DraftKings', 'https://sportsbook.draftkings.com/'], ['BetMGM', 'https://sports.betmgm.com/'],
    ['Caesars', 'https://sportsbook.caesars.com/'], ['theScore Bet (was ESPN Bet)', 'https://thescore.bet/'], ['Fanatics', 'https://sportsbook.fanatics.com/'], ['bet365', 'https://www.bet365.com/']];
  // Pre-fill status from research (see NOTES.md). None verified, so the UI never says a slip is pre-filled.
  var n = 0;

  // ---------- Leg rows ----------
  function field(box, cls, id, label, val, attrs) {
    var w = el('div', { 'class': cls || '' }); w.appendChild(el('label', { 'for': id }, label));
    var i = el('input', Object.assign({ id: id, autocomplete: 'off' }, attrs || {})); i.value = val || ''; w.appendChild(i); box.appendChild(w); return i;
  }
  function addLeg(L) {
    L = L || {}; var k = ++n, fs = el('fieldset', { 'class': 'leg', 'data-k': k }); fs.appendChild(el('legend', null, 'Leg'));
    var g = el('div', { 'class': 'grid' }); fs.appendChild(g);
    field(g, 'wide', 'pl' + k, 'Player', L.player, { 'data-f': 'player' });
    field(g, 'wide', 'mk' + k, 'Market', L.market, { 'data-f': 'market' });
    field(g, '', 'ln' + k, 'Line', L.line, { 'data-f': 'line', inputmode: 'decimal' });
    var sw = el('div'); sw.appendChild(el('label', { 'for': 'sd' + k }, 'Side'));
    var s = el('select', { id: 'sd' + k, 'data-f': 'side' }); ['Over', 'Under', 'Yes', 'No'].forEach(function (o) { s.appendChild(el('option', null, o)); });
    s.value = L.side || 'Over'; sw.appendChild(s); g.appendChild(sw);
    field(g, '', 'od' + k, 'Odds', L.odds, { 'data-f': 'odds', inputmode: 'text', placeholder: '-110' });
    field(g, '', 'ot' + k, 'Other side (optional)', L.other, { 'data-f': 'other', inputmode: 'text', placeholder: '-110' });
    var rm = el('button', { type: 'button', 'class': 'btn ghost', 'data-rm': k }, 'Remove leg'); fs.appendChild(rm);
    rm.addEventListener('click', function () { fs.remove(); renumber(); });
    fs.querySelectorAll('input').forEach(function (i) { i.addEventListener('input', function () { if (/odds|other/.test(i.dataset.f)) { var v = i.value.replace(DASH, '-'); if (v !== i.value) i.value = v; } }); });
    $('legs').appendChild(fs); renumber(); return fs;
  }
  function renumber() { var all = $('legs').querySelectorAll('.leg'); all.forEach(function (f, i) { f.querySelector('legend').textContent = 'Leg ' + (i + 1); }); $('add').disabled = all.length >= Odds.MAX_LEGS; }
  function readLegs() {
    return Array.prototype.map.call($('legs').querySelectorAll('.leg'), function (f, i) {
      var o = { n: i + 1 }; f.querySelectorAll('[data-f]').forEach(function (x) { o[x.dataset.f] = x.value.trim(); }); return o;
    });
  }

  // ---------- Math ----------
  function legMath(L) {
    var a = Odds.parseAmerican(L.odds); if (a.err) return { err: 'Leg ' + L.n + ' odds: ' + a.err };
    L.am = a.v; L.dec = Odds.amToDec(a.v); L.p = 1 / L.dec; L.fairP = null;
    if (L.other) { var b = Odds.parseAmerican(L.other); if (b.err) return { err: 'Leg ' + L.n + ' other side: ' + b.err }; L.otherAm = b.v; L.nv = Odds.removeVig(a.v, b.v); L.fairP = L.nv.nv1; }
    return L;
  }
  function kv(box, k, v, cls) { var d = el('div', cls ? { 'class': cls } : null); d.appendChild(el('b', null, k)); d.appendChild(document.createTextNode(v)); box.appendChild(d); }
  function desc(L) { return [L.player, L.side, L.line, L.market].filter(Boolean).join(' '); }

  function convert() {
    var legs = readLegs(), R = $('results'), P = $('parlay'); R.textContent = ''; P.textContent = '';
    $('res-empty').hidden = legs.length > 0;
    if (!legs.length) { P.appendChild(el('p', { 'class': 'hint' }, 'Add at least one leg.')); setPay(null); return; }
    var errs = [], ok = [];
    legs.forEach(function (L) { var r = legMath(L); if (r.err) errs.push(r.err); else ok.push(r); });
    if (errs.length) { errs.forEach(function (e) { R.appendChild(el('p', { 'class': 'err', role: 'alert' }, e)); }); P.appendChild(el('p', { 'class': 'hint' }, 'Fix the legs above to see totals.')); setPay(null); return; }
    ok.forEach(function (L) {
      var c = el('div', { 'class': 'res', 'data-leg': L.n }); c.appendChild(el('h3', null, 'Leg ' + L.n + ': ' + (desc(L) || 'unnamed leg')));
      var g = el('div', { 'class': 'kv' }); c.appendChild(g);
      kv(g, 'American', Odds.fmtAmIn(L.am)); kv(g, 'Decimal', Odds.num(L.dec, 3)); kv(g, 'Implied', Odds.pct(L.p, 1));
      if (L.nv) { kv(g, 'Fair (no-vig)', Odds.fmtAm(Odds.pToAm(L.fairP)) + ' \u00b7 ' + Odds.pct(L.fairP, 1), 'fair');
        c.appendChild(el('p', { 'class': 'hint nv-line' }, 'Both sides ' + Odds.fmtAmIn(L.am) + ' / ' + Odds.fmtAmIn(L.otherAm) + ' add to ' + Odds.num(L.nv.sum * 100, 1) + '%; the book\u2019s cut (hold) is ' + Odds.num(L.nv.hold * 100, 1) + '%.'));
        if (L.p > L.fairP) c.appendChild(el('p', { 'class': 'tag-red', 'data-flag': 'leg' }, 'RED: book ' + Odds.fmtAmIn(L.am) + ' vs fair ' + Odds.fmtAm(Odds.pToAm(L.fairP))));
      } else kv(g, 'Fair (no-vig)', 'Add the other side\u2019s price', 'fair');
      var lk = el('div', { 'class': 'links', role: 'group', 'aria-label': 'Find leg ' + L.n + ' on other books' });
      BOOKS.forEach(function (b) { lk.appendChild(el('a', { 'class': 'btn', href: b[1], target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Open ' + b[0] + ' (new tab) to find leg ' + L.n }, b[0])); });
      c.appendChild(el('p', { 'class': 'hint' }, 'Find this market on another book (opens its home page; you search there):')); c.appendChild(lk);
      R.appendChild(c);
    });
    var D = ok.reduce(function (a, L) { return a * L.dec; }, 1), p = 1 / D, bookAm = Odds.pToAm(p);
    var allFair = ok.every(function (L) { return L.fairP !== null; }), pf = allFair ? ok.reduce(function (a, L) { return a * L.fairP; }, 1) : null;
    var g2 = el('div', { 'class': 'kv' }); P.appendChild(g2);
    ok.forEach(function (L) { kv(g2, 'Leg ' + L.n, (desc(L) || 'leg') + ' ' + Odds.fmtAmIn(L.am)); });
    kv(g2, 'Book odds (legs multiplied)', Odds.fmtAm(bookAm) + ' \u00b7 ' + Odds.num(D, 2) + 'x', 'tot-book');
    kv(g2, 'Fair odds (no-vig)', allFair ? Odds.fmtAm(Odds.pToAm(pf)) : 'Needs the other side on every leg', 'tot-fair');
    var po = $('posted').value.replace(DASH, '-').trim();
    if (po) { var pa = Odds.parseAmerican(po);
      if (pa.err) P.appendChild(el('p', { 'class': 'err' }, 'Slip total: ' + pa.err));
      else { kv(g2, 'Slip total', Odds.fmtAmIn(pa.v), 'tot-slip'); var pd = Odds.amToDec(pa.v);
        if (Odds.relDiff(pd, D) > Odds.TOL) P.appendChild(el('p', { 'class': 'hint posted-note' }, 'The slip\u2019s total differs from the legs multiplied (' + Odds.fmtAm(bookAm) + '). Same-game or boosted prices are often set this way.')); } }
    var hit = allFair ? pf : p, gl = allFair ? 'Hit chance (fair)' : 'Hit chance (book implied)';
    P.appendChild(gauge(hit, gl));
    if (allFair) { if (p > pf) P.appendChild(el('p', { 'class': 'tag-red', id: 'red-flag' }, 'RED: Book odds ' + Odds.fmtAm(bookAm) + ' vs fair ' + Odds.fmtAm(Odds.pToAm(pf))));
      else P.appendChild(el('p', { 'class': 'tag-ok', id: 'ok-flag' }, 'Book odds ' + Odds.fmtAm(bookAm) + ' are at or above fair ' + Odds.fmtAm(Odds.pToAm(pf)))); }
    if (ok.length === 1) P.appendChild(el('p', { 'class': 'hint' }, 'One leg: the total is that leg\u2019s price.'));
    setPay(D);
  }
  function gauge(p, label) {
    var w = el('div', { 'class': 'gauge' }), ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 120 66'); s.setAttribute('role', 'img'); s.setAttribute('aria-label', label + ' ' + Odds.pct(p, 1));
    var a = Math.PI * (1 - p), x = 60 + 50 * Math.cos(a), y = 60 - 50 * Math.sin(a);
    [['M10 60 A50 50 0 0 1 110 60', '#2a313c'], ['M10 60 A50 50 0 0 1 ' + x.toFixed(2) + ' ' + y.toFixed(2), '#4fa3ff']].forEach(function (d) {
      var pa = document.createElementNS(ns, 'path'); pa.setAttribute('d', d[0]); pa.setAttribute('stroke', d[1]); pa.setAttribute('stroke-width', '10'); pa.setAttribute('fill', 'none'); s.appendChild(pa); });
    w.appendChild(s); var t = el('div'); t.appendChild(el('strong', { id: 'hit' }, Odds.pct(p, 1))); t.appendChild(el('div', { 'class': 'hint' }, label)); w.appendChild(t); return w;
  }
  var lastD = null;
  function setPay(D) { if (D !== undefined) lastD = D; var s = Odds.parseStake($('stake').value);
    $('payout').textContent = lastD == null ? '$0.00' : (s.err ? 'check stake' : Odds.money(s.v * lastD)); }

  // ---------- Slip input ----------
  var worker = null;
  function getWorker() {
    if (!worker) worker = Tesseract.createWorker('eng', 1, { workerPath: 'vendor/tesseract/worker.min.js', corePath: 'vendor/tesseract/core', langPath: 'vendor/tesseract/lang', workerBlobURL: false, cacheMethod: 'none', gzip: true });
    return worker;
  }
  function fill(res) {
    $('legs').textContent = ''; res.legs.forEach(addLeg); if (res.total) $('posted').value = res.total; if (res.stake) $('stake').value = res.stake;
    say(res.legs.length ? 'Found ' + res.legs.length + (res.legs.length === 1 ? ' leg' : ' legs') + '. Check them below, then press Convert.' : 'No legs found in the photo. Enter legs manually.');
    if (!res.legs.length) addLeg();
  }
  $('file').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { say('That file is not an image. Upload a screenshot or enter legs manually.'); return; }
    say('Reading the photo on this device\u2026');
    getWorker().then(function (w) { return w.recognize(f); }).then(function (r) {
      $('ocr-text').textContent = r.data.text; $('ocr-raw').hidden = false; fill(Slip.parseText(r.data.text));
    }).catch(function () { say('Could not read the photo. Enter legs manually.'); });
  });
  $('read-link').addEventListener('click', function () {
    var r = Slip.parseLink($('link').value);
    if (r.err) { say(r.err); return; }
    say((r.book ? r.book + ' link' : 'Link from ' + r.host) + (r.ids.length ? ' with ' + r.ids.length + ' ID value' + (r.ids.length === 1 ? '' : 's') : ' with no IDs') + '. ' + r.msg);
  });
  $('manual').addEventListener('click', function () { var f = addLeg(); f.querySelector('input').focus(); });
  $('add').addEventListener('click', function () { if ($('legs').querySelectorAll('.leg').length < Odds.MAX_LEGS) addLeg().querySelector('input').focus(); });
  $('convert').addEventListener('click', function () { convert(); $('h-res').scrollIntoView({ block: 'start' }); });
  $('stake').addEventListener('input', function () { setPay(); });

  // ---------- Sample explorer ----------
  var st = { sport: 'Basketball', stat: 'Points', player: 'Sample Player A', line: 20.5 };
  function chips(box, items, cur, cb) { box.textContent = ''; items.forEach(function (it) { var b = el('button', { type: 'button', 'class': 'chip', 'aria-pressed': String(it === cur) }, it); b.addEventListener('click', function () { cb(it); }); box.appendChild(b); }); }
  function games() { return Sample.sports[st.sport].players[st.player][st.stat]; }
  function renderSample() {
    var S = Sample.sports[st.sport];
    chips($('sports'), Object.keys(Sample.sports), st.sport, function (s) { st.sport = s; st.stat = Sample.sports[s].stats[0]; st.player = Object.keys(Sample.sports[s].players)[0]; st.line = mid(); renderSample(); });
    chips($('stats'), S.stats, st.stat, function (s) { st.stat = s; st.line = mid(); renderSample(); });
    var T = $('tiles'); T.textContent = '';
    Object.keys(S.players).forEach(function (pn) {
      var g = S.players[pn][st.stat], b = el('button', { type: 'button', 'class': 'tile', 'aria-pressed': String(pn === st.player) });
      b.appendChild(el('span', { 'class': 'nm' }, pn));
      b.appendChild(el('span', { 'class': 'hr' }, S.lines[st.stat].map(function (x) { return x + '+ ' + Math.round(100 * g.filter(function (v) { return v >= x; }).length / g.length) + '%'; }).join(' \u00b7 ')));
      b.addEventListener('click', function () { st.player = pn; st.line = mid(); renderSample(); }); T.appendChild(b);
    });
    var r = $('line'), g = games(), mx = Math.max.apply(null, g.concat([1]));
    r.max = String(Math.ceil(mx) + 0.5); r.step = mx > 60 ? '5' : '1'; r.min = '0.5'; r.value = String(st.line); st.line = Number(r.value);
    drawChart(); drawLog(); drawOdds();
  }
  function mid() { var g = games(), s = g.slice().sort(function (a, b) { return a - b; }); return Math.floor(s[Math.floor(s.length / 2)]) + 0.5; }
  function drawChart() {
    var g = games(), C = $('chart'), mx = Math.max.apply(null, g.concat([st.line, 1])), hits = g.filter(function (v) { return v > st.line; }).length;
    C.textContent = ''; g.forEach(function (v) { var b = el('div', { 'class': 'bar-c' + (v > st.line ? ' hit' : '') }); b.style.height = (100 * v / mx) + '%'; C.appendChild(b); });
    var m = el('div', { 'class': 'lineMark' }); m.style.bottom = (100 * st.line / mx) + '%'; C.appendChild(m);
    C.setAttribute('aria-label', 'Last 10 sample games for ' + st.player + ', ' + st.stat + ': ' + g.join(', ') + '. Line ' + st.line + '.');
    $('line-out').textContent = String(st.line);
    $('chart-sum').textContent = st.player + ' \u00b7 ' + st.stat + ' \u00b7 last 10 games';
    $('over-pct').textContent = 'The Over hit ' + hits + '/10 at a line of ' + st.line + ' (' + hits * 10 + '%).';
  }
  function drawLog() {
    var g = games(), tb = $('log').tBodies[0], tf = $('log').tFoot, opp = Sample.sports[st.sport].opp; tb.textContent = ''; tf.textContent = '';
    g.forEach(function (v, i) { var tr = el('tr'); tr.appendChild(el('td', null, String(i + 1))); tr.appendChild(el('td', null, opp[i])); tr.appendChild(el('td', null, String(st.line)));
      tr.appendChild(el('td', { 'class': v > st.line ? 'o' : 'u' }, v + (v > st.line ? ' O' : ' U'))); tb.appendChild(tr); });
    var avg = g.reduce(function (a, b) { return a + b; }, 0) / g.length, tr = el('tr'); tr.appendChild(el('th', { scope: 'row', colspan: '3' }, 'Average')); tr.appendChild(el('td', null, avg.toFixed(1))); tf.appendChild(tr);
  }
  function drawOdds() {
    var rows = Sample.odds[$('state').value], tb = $('bookodds').tBodies[0]; tb.textContent = '';
    function row(name, o, u, extra) { var tr = el('tr'); var h = el('th', { scope: 'row' }, name); if (extra) h.appendChild(el('span', { 'class': 'best' }, extra)); tr.appendChild(h); tr.appendChild(el('td', null, o)); tr.appendChild(el('td', null, u)); tb.appendChild(tr); return tr; }
    row('Open line', Odds.fmtAmIn(Sample.open[0]), Odds.fmtAmIn(Sample.open[1]));
    var po = 0, pu = 0; rows.forEach(function (r) { po += 1 / Odds.amToDec(r[0]); pu += 1 / Odds.amToDec(r[1]); }); po /= rows.length; pu /= rows.length;
    row('Consensus', Odds.fmtAm(Odds.pToAm(po)), Odds.fmtAm(Odds.pToAm(pu)));
    var best = 0; rows.forEach(function (r, i) { if (Odds.amToDec(r[0]) > Odds.amToDec(rows[best][0])) best = i; });
    rows.forEach(function (r, i) { row(Sample.books[i], Odds.fmtAmIn(r[0]), Odds.fmtAmIn(r[1]), i === best ? 'Best price' : null); });
    var nv = po / (po + pu); row('Fair odds (no vig)', Odds.fmtAm(Odds.pToAm(nv)), Odds.fmtAm(Odds.pToAm(1 - nv))).setAttribute('class', 'fair-row');
    st.best = rows[best];
  }
  $('line').addEventListener('input', function () { st.line = Number(this.value); drawChart(); drawLog(); });
  $('state').addEventListener('change', drawOdds);
  $('use-sample').addEventListener('click', function () { addLeg({ player: st.player + ' (sample)', market: st.stat, line: String(st.line), side: 'Over', odds: Odds.fmtAmIn(st.best[0]), other: Odds.fmtAmIn(st.best[1]) }); say('Added a sample leg. Sample prices are invented.'); });
  renderSample();
})();

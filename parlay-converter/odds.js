// Pure odds math and display formatting (Doc sections 3-6). No I/O.
var Odds = (function () {
  var MAX_AM = 100000, MAX_SHOW = 1e12;
  // American price: optional sign, digits, optional decimals; |A| from 100 to 100000.
  function parseAmerican(s) {
    s = String(s).trim(); if (!/^[+-]?\d{1,7}(\.\d+)?$/.test(s)) return { err: 'Use American odds like -140 or +150.' };
    var a = Number(s.replace(/^\+/, '')); if (!isFinite(a)) return { err: 'Use American odds like -140 or +150.' };
    if (Math.abs(a) < 100 || Math.abs(a) > MAX_AM) return { err: 'American odds must be from 100 to 100000 (plus or minus).' };
    return { v: a };
  }
  // Percent strictly between 0 and 100.
  function parsePct(s) {
    s = String(s).trim().replace(/%$/, '').trim(); if (!/^\d{1,3}(\.\d+)?$/.test(s)) return { err: 'Enter a percent between 0 and 100, e.g. 45.' };
    var v = Number(s); if (!isFinite(v) || v <= 0 || v >= 100) return { err: 'The percent must be above 0 and below 100.' };
    return { v: v / 100 };
  }
  function parseStake(s) {
    s = String(s).trim(); if (!/^\d{1,7}(\.\d+)?$/.test(s)) return { err: 'Enter a stake above $0 and up to $1,000,000.' };
    var v = Number(s); if (!isFinite(v) || v <= 0 || v > 1e6) return { err: 'Enter a stake above $0 and up to $1,000,000.' };
    return { v: v };
  }
  function amToDec(a) { return a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a); }
  function decToP(d) { return 1 / d; }
  function pToAm(p) { if (Math.abs(p - 0.5) < 1e-12) return 100; return p < 0.5 ? 100 * (1 - p) / p : -100 * p / (1 - p); }
  function pToDec(p) { return 1 / p; }
  var BIG = 'too large to display';
  function ok(x) { return typeof x === 'number' && isFinite(x) && Math.abs(x) < MAX_SHOW; }
  function num(x, dp) { if (!ok(x)) return BIG; var s = x.toFixed(dp); return /e/i.test(s) ? BIG : s; }
  function money(x) { if (!ok(x)) return BIG; return '$' + x.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  // Percent with clamping: never rounds up to 100 or down to 0.
  function pct(p, dp) { if (!(p > 0 && p < 1)) return BIG; var v = p * 100, lo = Math.pow(10, -dp), s = v.toFixed(dp);
    if (Number(s) >= 100) return '>' + (100 - lo).toFixed(dp) + '%'; if (Number(s) <= 0) return '<' + lo.toFixed(dp) + '%'; return s + '%'; }
  function fmtAm(a) { if (!ok(a)) return BIG; return (a > 0 ? '+' : '') + a.toFixed(1); }
  function fmtAmIn(a) { return (a > 0 ? '+' : '') + a; }
  function removeVig(a1, a2) { var p1 = decToP(amToDec(a1)), p2 = decToP(amToDec(a2)), s = p1 + p2; return { p1: p1, p2: p2, sum: s, nv1: p1 / s, nv2: p2 / s, hold: s - 1 }; }
  function relDiff(posted, calc) { return Math.abs(posted - calc) / calc; }
  return { parseAmerican: parseAmerican, parsePct: parsePct, parseStake: parseStake, amToDec: amToDec, decToP: decToP, pToAm: pToAm, pToDec: pToDec,
    num: num, money: money, pct: pct, fmtAm: fmtAm, fmtAmIn: fmtAmIn, removeVig: removeVig, relDiff: relDiff, TOL: 0.01, MAX_LEGS: 15, BIG: BIG };
})();

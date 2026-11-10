// Slip parsing: OCR text -> legs, and pasted links -> what the URL itself holds. Pure, no I/O.
var Slip = (function () {
  var DASH = /[\u2212\u2012\u2013\u2014\u2015]/g;
  var LEG = /^(over|under|o|u)\s*(\d{1,3}(?:\.\d)?)\s+(.+?)\s+([+-]\s?\d{3,5})$/i;
  var YES = /^(.+?)\s+([+-]\s?\d{3,5})$/;
  var TOTAL = /(parlay|total odds|sgp)\D*?([+-]\s?\d{3,6})\b/i;
  var STAKE = /(wager|stake)\s*:?\s*\$\s*(\d{1,7}(?:\.\d{1,2})?)/i;
  var NAME = /^[A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+){1,3}$/;
  var SKIP = /(parlay|wager|stake|to pay|payout|total|slip|fixture|legs?\b|cash ?out|share)/i;
  function clean(t) { return String(t || '').replace(DASH, '-').replace(/[|]/g, ' ').replace(/[ \t]+/g, ' '); }
  function odds(s) { return s.replace(/\s/g, ''); }
  function parseText(text) {
    var lines = clean(text).split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var legs = [], total = null, stake = null, lastName = '';
    lines.forEach(function (l) {
      var m;
      if (!total && (m = TOTAL.exec(l))) { total = odds(m[2]); return; }
      if (!stake && (m = STAKE.exec(l))) { stake = m[2]; return; }
      if ((m = LEG.exec(l))) {
        var side = /^o/i.test(m[1]) ? 'Over' : 'Under';
        legs.push({ player: lastName, market: m[3].trim(), line: m[2], side: side, odds: odds(m[4]) }); lastName = ''; return;
      }
      if (SKIP.test(l)) return;
      if (NAME.test(l)) { lastName = l; return; }
      if ((m = YES.exec(l)) && lastName && /[a-z]/i.test(m[1])) {
        legs.push({ player: lastName, market: m[1].trim(), line: '', side: 'Yes', odds: odds(m[2]) }); lastName = '';
      }
    });
    return { legs: legs, total: total, stake: stake };
  }
  var HOSTS = [['fanduel.com', 'FanDuel'], ['draftkings.com', 'DraftKings'], ['betmgm.com', 'BetMGM'], ['caesars.com', 'Caesars'],
    ['thescore.bet', 'theScore Bet'], ['espnbet.com', 'theScore Bet (formerly ESPN Bet)'], ['fanatics.com', 'Fanatics'], ['bet365.com', 'bet365']];
  function parseLink(s) {
    var u; try { u = new URL(String(s).trim()); } catch (e) { return { err: 'That does not look like a link. Upload a screenshot or enter legs manually.' }; }
    if (!/^https?:$/.test(u.protocol)) return { err: 'Only web links can be read. Upload a screenshot or enter legs manually.' };
    var host = u.hostname.toLowerCase(), book = null;
    HOSTS.forEach(function (h) { if (!book && (host === h[0] || host.slice(-h[0].length - 1) === '.' + h[0])) book = h[1]; });
    var ids = [];
    u.searchParams.forEach(function (v, k) { if (/^(marketid|selectionid|outcomes|sharebetid|betslipid|eventid)$/i.test(k)) ids.push(k + '=' + v); });
    var parts = u.pathname.split('/').filter(Boolean);
    return { book: book, host: host, ids: ids, path: parts.join(' / '),
      msg: 'This link holds IDs only, not players, lines, or prices, and the site cannot be read from here (logins and browser security block it). Upload a screenshot or enter legs manually.' };
  }
  return { parseText: parseText, parseLink: parseLink, clean: clean };
})();

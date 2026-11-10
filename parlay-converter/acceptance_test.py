# v3 draft acceptance tests: Chromium + Firefox, phone viewport, local server only.
import json, re, sys, time
from playwright.sync_api import sync_playwright
BASE = 'http://127.0.0.1:8765/'
AXE = open('/workspace/tester/portfolio-live/axe.min.js').read()
SHOTS = '/workspace/proto/parlay-converter-v3-shots/'
FOOT = '21+ only. Gambling problem? Call 1-800-GAMBLER. This tool does math only; it takes no bets and no sportsbook pays us.'
ALLOWED = {'https://sportsbook.fanduel.com/', 'https://sportsbook.draftkings.com/', 'https://sports.betmgm.com/', 'https://sportsbook.caesars.com/', 'https://thescore.bet/', 'https://sportsbook.fanatics.com/', 'https://www.bet365.com/'}
results = []
def rec(br, tid, ok, ev): results.append({'browser': br, 'id': tid, 'pass': bool(ok), 'evidence': ev}); print(('PASS' if ok else 'FAIL'), br, tid, ev)
def leg(pg, i, f): return pg.locator('.leg').nth(i).locator('[data-f=%s]' % f)
def ocr(pg):
    pg.set_input_files('#file', 'fixtures/slip-fixture.png')
    pg.locator('#status').filter(has_text=re.compile('Found|Could')).wait_for(timeout=90000)
def run(bt, name):
    b = bt.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, bypass_csp=(name != 'csp')); pg = ctx.new_page()
    ext = []; pg.on('request', lambda r: ext.append(r.url) if not r.url.startswith(BASE) and not r.url.startswith(('data:', 'blob:')) else None)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_load_state('networkidle')
    if name == 'chromium': pg.screenshot(path=SHOTS + '01-start.png', full_page=False)
    # O1 OCR
    t = time.time(); ocr(pg); dt = round(time.time() - t, 1)
    vals = [[leg(pg, i, f).input_value() for f in ('player', 'market', 'line', 'side', 'odds')] for i in range(pg.locator('.leg').count())]
    exp = [['Jordan Avery', 'Points', '24.5', 'Over', '-115'], ['Marcus Hale', 'Rebounds', '8.5', 'Under', '+120'], ['Tyler Brooks', 'Assists', '6.5', 'Over', '+150']]
    rec(name, 'O1 OCR fixture -> 3 legs', vals == exp and pg.input_value('#posted') == '+850' and pg.input_value('#stake') == '10.00', '%ss %s posted=%s' % (dt, vals, pg.input_value('#posted')))
    if name == 'chromium': pg.locator('#h-legs').scroll_into_view_if_needed(); pg.screenshot(path=SHOTS + '02-ocr-legs.png')
    # L1 edits
    leg(pg, 0, 'odds').fill('\u2212110'); v = leg(pg, 0, 'odds').input_value()
    leg(pg, 0, 'odds').fill('-115'); leg(pg, 1, 'player').fill('Marcus Hale Jr')
    rec(name, 'L1 leg edits (unicode minus normalized, name edit)', v == '-110' and leg(pg, 1, 'player').input_value() == 'Marcus Hale Jr', 'minus->%s' % v)
    pg.click('#convert')
    r1 = pg.locator('.res[data-leg="1"]').inner_text()
    rec(name, 'C1 conversions -115', '-115' in r1 and '1.870' in r1 and '53.5%' in r1, r1.replace('\n', ' | ')[:160])
    rec(name, 'N1 no fair without other side', 'Add the other side' in r1 and pg.locator('#red-flag').count() == 0, 'fair hidden until other side')
    tot = pg.locator('#parlay').inner_text()
    rec(name, 'P1 parlay total + payout', '+928.3' in tot and pg.inner_text('#payout') == '$102.83' and pg.locator('.posted-note').count() == 1, 'payout=%s' % pg.inner_text('#payout'))
    leg(pg, 0, 'other').fill('-105'); pg.click('#convert'); r1 = pg.locator('.res[data-leg="1"]').inner_text()
    rec(name, 'N2 no-vig leg1 -115/-105', '-104.4' in r1 and '51.1%' in r1 and 'hold) is 4.7%' in r1 and 'add to 104.7%' in r1, r1.replace('\n', ' | ')[:200])
    leg(pg, 1, 'other').fill('-150'); leg(pg, 2, 'other').fill('-180'); pg.click('#convert')
    rf = pg.locator('#red-flag')
    rec(name, 'R1 RED flag when book < fair', rf.count() == 1 and rf.inner_text().startswith('RED: Book odds +928.3 vs fair +'), rf.inner_text() if rf.count() else 'none')
    if name == 'chromium':
        pg.locator('#h-res').scroll_into_view_if_needed(); pg.screenshot(path=SHOTS + '03-leg-analysis.png')
        pg.locator('#h-par').scroll_into_view_if_needed(); pg.screenshot(path=SHOTS + '04-your-parlay-red.png')
    # K1 links
    links = pg.locator('.res .links a'); hrefs = [links.nth(i).get_attribute('href') for i in range(links.count())]
    rels = all((links.nth(i).get_attribute('rel') or '') == 'noopener noreferrer' and links.nth(i).get_attribute('target') == '_blank' for i in range(links.count()))
    body = pg.inner_text('body')
    rec(name, 'K1 book links 7/leg, allowed hosts, no pre-fill claim', links.count() == 21 and set(hrefs) == ALLOWED and rels and not re.search(r'pre-?fill', body, re.I), '%d links' % links.count())
    hmin = min(links.nth(i).bounding_box()['height'] for i in range(links.count()))
    # A1 axe
    pg.add_script_tag(content=AXE)
    try: ax = pg.evaluate('async () => (await axe.run()).violations.map(v => v.id + ":" + v.nodes.length)')
    except Exception as e: ax = ['axe-error ' + str(e)[:80]]
    rec(name, 'A1 axe 0 violations (results state)', ax == [], str(ax))
    # OK flag case
    pg.evaluate("() => document.querySelectorAll('.leg [data-rm]').forEach((b,i)=>{ if(i>0) b.click(); })")
    leg(pg, 0, 'odds').fill('+105'); leg(pg, 0, 'other').fill('+105'); pg.click('#convert')
    rec(name, 'R2 no RED when book >= fair; one-leg note', pg.locator('#red-flag').count() == 0 and pg.locator('#ok-flag').count() == 1 and 'One leg' in pg.inner_text('#parlay'), pg.locator('#ok-flag').inner_text() if pg.locator('#ok-flag').count() else 'none')
    # S1 sample badges
    sp = pg.locator('.card.sample'); badges = [sp.nth(i).locator('.badge').inner_text() for i in range(sp.count())]
    rec(name, 'S1 Sample data badge on every sample panel', sp.count() == 4 and badges == ['Sample data'] * 4, str(badges))
    before = pg.inner_text('#over-pct'); pg.locator('#line').fill('30.5'); after = pg.inner_text('#over-pct')
    rec(name, 'S2 line slider updates chart + Over %', before != after and 'line of 30.5' in after and pg.locator('#chart .bar-c').count() == 10, after)
    r_md = pg.inner_text('#bookodds'); pg.select_option('#state', 'NJ'); r_nj = pg.inner_text('#bookodds')
    rec(name, 'S3 state picker, one Best price, fair row', r_md != r_nj and pg.locator('#bookodds .best').count() == 1 and pg.locator('#bookodds .fair-row').count() == 1, 'MD!=NJ')
    pg.click('#sports .chip:has-text("Football")'); rec(name, 'S4 sport/stat chips + tiles', 'Sample Player C' in pg.inner_text('#tiles') and pg.locator('#stats .chip[aria-pressed=true]').inner_text() == 'Pass Yds', pg.inner_text('#stats'))
    pg.click('#sports .chip:has-text("Basketball")')
    if name == 'chromium':
        pg.locator('#h-exp').scroll_into_view_if_needed(); pg.screenshot(path=SHOTS + '05-explore-sample.png')
        pg.locator('#h-chart').scroll_into_view_if_needed(); pg.screenshot(path=SHOTS + '06-prop-analysis-sample.png')
        pg.locator('#h-odds').scroll_into_view_if_needed(); pg.screenshot(path=SHOTS + '07-prop-odds-sample.png')
    # U1 link parse
    pg.fill('#link', 'https://sportsbook.fanduel.com/addToBetslip?marketId=42.1&selectionId=7'); pg.click('#read-link'); s1 = pg.inner_text('#status')
    pg.fill('#link', 'not a link'); pg.click('#read-link'); s2 = pg.inner_text('#status')
    rec(name, 'U1 link: parse URL only, then manual/screenshot message', 'FanDuel link with 2 ID values' in s1 and 'Upload a screenshot or enter legs manually' in s1 and 'enter legs manually' in s2, s1[:90])
    if name == 'chromium':
        pg.fill('#link', 'https://sportsbook.fanduel.com/addToBetslip?marketId=42.1&selectionId=7'); pg.click('#read-link'); pg.locator('#h-in').scroll_into_view_if_needed(); pg.screenshot(path=SHOTS + '08-link-message.png')
    # A2 tap targets
    small = pg.evaluate("""() => [...document.querySelectorAll('button,input:not([type=file]):not([type=range]),select,a.btn,label.btn,.chip,.tile')].filter(e=>e.offsetParent!==null||getComputedStyle(e).position==='fixed').filter(e=>{const r=e.getBoundingClientRect();return r.height<44}).map(e=>e.id||e.className)""")
    rec(name, 'A2 44px tap targets', small == [] and hmin >= 44, 'small=%s linkmin=%s' % (small, hmin))
    # A3 storage
    stg = pg.evaluate("async () => ({ls: localStorage.length, ss: sessionStorage.length, ck: document.cookie, idb: indexedDB.databases ? (await indexedDB.databases()).length : -1})")
    rec(name, 'A3 no storage', stg['ls'] == 0 and stg['ss'] == 0 and stg['ck'] == '' and stg['idb'] in (0, -1) and ctx.cookies() == [], str(stg))
    rec(name, 'A4 no third-party requests', ext == [], str(ext[:3]))
    txt = pg.inner_text('body'); foot = pg.inner_text('footer').strip()
    scan = txt.replace(FOOT, '', 1)
    for i in range(pg.locator('.links a').count()): pass
    scan = re.sub(r'theScore Bet \(was ESPN Bet\)', '', scan)
    rec(name, 'A5 "bet" only in footer (book proper names excluded)', not re.search(r'\bbet\b|\bbets\b|\bwager', scan, re.I), str(re.findall(r'.{0,20}\bbets?\b.{0,20}', scan, re.I)[:3]))
    rec(name, 'A6 footer exact', foot == FOOT, foot)
    # A7 scroll-padding: focused input not under sticky bar
    pg.locator('.leg').last.locator('[data-f=other]').focus(); pg.keyboard.press('Tab'); pg.keyboard.press('Shift+Tab')
    bb = pg.locator('.leg').last.locator('[data-f=other]').bounding_box(); bar = pg.locator('#bar').bounding_box()
    rec(name, 'A7 focused field clear of sticky bar', bb['y'] + bb['height'] <= bar['y'], 'field bottom %.0f bar top %.0f' % (bb['y'] + bb['height'], bar['y']))
    pg.add_script_tag(content=AXE) if pg.evaluate('typeof axe') == 'undefined' else None
    ax2 = pg.evaluate('async () => (await axe.run()).violations.map(v => v.id + ":" + v.nodes.length)')
    rec(name, 'A8 axe 0 violations (sample/link state)', ax2 == [], str(ax2))
    rec(name, 'A9 no page errors', errs == [], str(errs[:3]))
    b.close()
    # O0 OCR under the page's real CSP (no bypass)
    b = bt.launch(); pg = b.new_context(viewport={'width': 390, 'height': 844}).new_page(); ext2 = []
    pg.on('request', lambda r: ext2.append(r.url) if not r.url.startswith(BASE) and not r.url.startswith(('data:', 'blob:')) else None)
    pg.goto(BASE); ocr(pg); rec(name, 'O0 OCR works under page CSP, no third-party requests', 'Found 3 legs' in pg.inner_text('#status') and ext2 == [], pg.inner_text('#status')); b.close()
with sync_playwright() as p:
    import os; os.makedirs(SHOTS, exist_ok=True)
    for bt, nm in ((p.chromium, 'chromium'), (p.firefox, 'firefox')): run(bt, nm)
json.dump(results, open('acceptance_results.json', 'w'), indent=1)
f = [r for r in results if not r['pass']]; print('TOTAL %d PASS %d FAIL %d' % (len(results), len(results) - len(f), len(f))); sys.exit(1 if f else 0)

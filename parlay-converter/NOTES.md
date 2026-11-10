# Parlay Converter v3 draft: notes (Proto, 2026-11-01)
Base: v2 fix1 (`odds.js` reused unchanged). New: `slip.js` (OCR text + link parsing), `sample.js` (SAMPLE DATA), `app.js` (rewritten UI), `vendor/tesseract/`.

## OCR bundle
- tesseract.js 7.0.0 (`tesseract.min.js` 63 KB, `worker.min.js` 111 KB), core 7.0.0 three variants (lstm, simd-lstm, relaxedsimd-lstm; ~3.9 MB each, the browser loads one), `eng.traineddata.gz` 4.0.0_fast (1.98 MB).
- Repo adds ~14 MB. A phone downloads ~6 MB on first upload only (lib + one core + eng). Nothing loads until a photo is chosen.
- No third-party requests (test A4/O0). `cacheMethod:'none'` so nothing goes to IndexedDB (test A3).
- Fixture: `fixtures/slip-fixture.png` is SYNTHETIC (made from `slip-fixture.html`, invented names). No real slip screenshot was provided, so real-slip accuracy is UNKNOWN.

## Pasted links
Only the URL is parsed (book from host, ID params). The page is never fetched; the user is told to upload a screenshot or enter legs manually.

## Book deep links (seen 2026-11-01)
| Book | Pre-filled slip link | Status | Evidence |
|---|---|---|---|
| FanDuel | `sportsbook.fanduel.com/addToBetslip?marketId=..&selectionId=..` (repeatable) | UNVERIFIED | Public example URLs in search results; curl returns 200 SPA shell, which proves nothing about pre-fill. Needs real market/selection IDs from a data feed. |
| DraftKings | `sportsbook.draftkings.com/event/{eventId}?outcomes={id}+{id}` | UNVERIFIED | Third-party docs (deepwiki oddsmash, SharpAPI, OpticOdds changelog); curl of sample ID 404. |
| BetMGM | provider-supplied only | UNVERIFIED | balldontlie docs: deeplinks for player props from BetMGM, BetRivers, Caesars (https://docs.balldontlie.io/). |
| Caesars | provider-supplied only | UNVERIFIED | same balldontlie docs. |
| theScore Bet (ESPN Bet rebranded 2025-12-01) | none found | NO | ESPN BET help center rebrand article; PENN release. |
| Fanatics | none found | NO | curl 403; no public docs found. |
| bet365 | none found | NO | curl 403; no public docs found. |
The Odds API `includeLinks=true` returns betslip links "if available" per book (https://the-odds-api.com/releases/deep-links.html). UI links only open each book's home page and never claim pre-fill.

## Data sources (seen 2026-11-01; nothing bought, no sign-ups, no keys)
| Source | Cost | Free tier | Player props | Caveats | Source |
|---|---|---|---|---|---|
| The Odds API | $30/mo 20K credits; $59 100K; $119 5M; $249 15M | 500 credits/mo | Yes, selected US sports/books | credits = markets x regions; includeLinks deep links | https://the-odds-api.com/ |
| balldontlie | $9.99/mo ALL-STAR, $39.99 GOAT per sport; $299.99 all | 5 req/min, teams/players/games only | GOAT tier (NBA v2, NFL v1); odds 2025+ | per-sport pricing; 48h trial needs card | https://docs.balldontlie.io/ , https://nfl.balldontlie.io/ |
| SportsDataIO | Discovery Lab $99/mo Odds ($599/yr), $149 Fantasy+Odds; commercial = sales | Free trial = scrambled data, not for display | Yes (props listed) | Discovery Lab next-day delayed, personal use, no redistribution | https://sportsdata.io/developers |
| API-Sports (NFL, Basketball) | $15 / $25 / $35 per month | 100 req/day | Odds endpoint yes; player props not confirmed (UNKNOWN) | odds 1-7 days pre-game, updated 4x/day | https://www.api-football.com/news/post/how-to-get-started-with-api-nfl-the-complete-beginners-guide , https://www.api-basketball.com/pricing |
| ESPN (unofficial) | $0 | no key | game logs yes; odds per event; props UNKNOWN | undocumented, can break; ESPN terms restrict automated access | https://github.com/pseudo-r/Public-ESPN-API |
| OddsJam API | not public (sales) | none listed | Yes, with slip deep links (vendor claim) | contract | https://oddsjam.com/odds-api |
| TheOddsAPI (theoddsapi.com, different company) | $29 Pro, $99 Business | 25 req/day h2h only | Business tier | name confusion with the-odds-api.com | https://theoddsapi.com/faq |
Recommendation for Rondo to decide: The Odds API (free 500 credits to prototype; deep links) plus ESPN unofficial or balldontlie ALL-STAR for game logs.

## Sample data
Everything in Explore props, Prop Analysis, Game Log, and Prop Odds by book is invented (`sample.js`), with a "Sample data" badge on each panel. Book names there are placeholders (Book A/B/C).

## Math
Per leg: American, decimal, implied; no-vig only when the other side is entered. Parlay: legs multiplied vs fair product; RED when book implied > fair (same rule as v2). Slip total shown separately with a note if it differs >1%. Payout uses legs multiplied.

## Tests
`acceptance_test.py`: 24 checks x 2 browsers = 48/48 PASS. axe injected with `bypass_csp`; O0 re-runs OCR under the real CSP.

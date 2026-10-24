# Lincoln Lutheran Volleyball: Playoff Guide

Unofficial, static site (no backend). Everything on the page is calculated in the browser from `data.js`.

## Deploy to GitHub Pages
1. Create a repo and commit the contents of this folder (`index.html`, `styles.css`, `app.js`, `engine.js`, `data.js`, plus `tools/` and `data/`).
2. Repo Settings > Pages > Deploy from branch > `main` / root.
3. Share the Pages URL. The page is marked `noindex` so search engines skip it.

## Refresh after each round (about 5 minutes)
1. Download the C1 export from NSAA: https://secure.nsaahome.org/wildcards/schedules/index.php?class=C1&sid=78&sport=vb then "Export Class C1".
2. Upload that CSV to a Claude session and say "refresh the site", or run it yourself:
   `node tools/build-data.mjs path/to/ClassC1Schedule.csv "Mon, Oct 26, 2026"`
3. The script checks all 54 teams, compares every game's points with NSAA's own, and rewrites `data.js`. It prints OK or MISMATCH for Lincoln Lutheran and Valentine against NSAA's published averages.
4. Commit and push `data.js`.

After the subdistricts (Oct 26 to 28): the bracket in `tools/brackets.mjs` is for subdistricts. When NSAA posts the district-final pairings, update the copy or ask Claude to add a "Official district matchup" section.

## Optional
- `node tools/bundle.mjs` makes one self-contained file at `dist/lutheran-playoff-guide.html` (good for email or any host).
- `node tools/test.mjs` prints engine scenarios for checking.

## What the engine models
- Points scale 50/47/44/41 (wins) and 39/36/33/30 (losses) by opponent win-rate division, +2 for playing Class B, +3 for Class A.
- Points re-scored with opponents' current records, including subdistrict results.
- 10 subdistrict winners + 6 best remaining by average = 16 teams, seeded by average, paired 1 v 16 through 8 v 9. Higher seed hosts.
- Games we don't control: the team with the better record wins.

## Known limits
- Records of opponents outside C1 (for example Gretna in Class B) are frozen at the export.
- Tie-breaks between equal averages are not modeled.
- Subdistrict pairings are official; district-final matchups stay "projected" until NSAA posts them.

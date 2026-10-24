// Usage: node tools/build-data.mjs [path/to/nsaa-c1-export.csv] [asOfLabel]
// Reads the NSAA class export, validates it, and writes data.js for the site.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { SUBDISTRICTS, buildGames } from './brackets.mjs';
const require = createRequire(import.meta.url);
const Engine = require('../engine.js');

const csvPath = process.argv[2] || new URL('../data/nsaa-c1-export.csv', import.meta.url).pathname;
const asOf = process.argv[3] || new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const csv = fs.readFileSync(csvPath, 'utf8');

function parseCSV(t) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

const rows = parseCSV(csv).filter(r => r.length >= 10 && r[1] && r[1] !== 'School');
const raw = {};
for (const r of rows) {
  const [date, school, opp, cls, w, l, div, score, notes, pts] = r;
  (raw[school] ??= []);
  if (!opp || pts === '' || !score) continue; // tournament header rows and unplayed games
  const [a, b] = score.replace('&ndash;', '-').split('-').map(Number);
  raw[school].push({ date, opp: opp.replace(/^@ /, ''), cls, w: +w, l: +l, res: a > b ? 'W' : 'L', pts: +pts });
}

// Validate coverage against the official brackets.
const expected = SUBDISTRICTS.flatMap(s => s.teams);
const missing = expected.filter(t => !raw[t] || !raw[t].length);
const extras = Object.keys(raw).filter(t => !expected.includes(t) && raw[t].length);
if (missing.length) { console.error(`MISSING ${missing.length} of ${expected.length} teams in export:\n  ` + missing.join('\n  ')); process.exit(1); }
if (extras.length) console.warn('Teams in export but not in brackets:', extras);

// Team record = most recent record that opponents saw; derive from games played (wins/losses of results).
const teams = {};
for (const t of expected) {
  const games = raw[t];
  const w = games.filter(g => g.res === 'W').length, l = games.length - w;
  teams[t] = { w, l, games: games.map(g => ({ opp: g.opp, cls: g.cls, res: g.res, w: g.w, l: g.l, pts: g.pts })) };
}

// Cross-check: opponent records quoted in rows must match the opponent's own record.
const warnings = [];
for (const t of expected) for (const g of teams[t].games) {
  if (teams[g.opp] && (teams[g.opp].w !== g.w || teams[g.opp].l !== g.l)) warnings.push(`${t} v ${g.opp}: row says ${g.w}-${g.l}, team record ${teams[g.opp].w}-${teams[g.opp].l}`);
}

const subdistricts = SUBDISTRICTS.map(s => ({ id: s.id, host: s.host, teams: s.teams, games: buildGames(s) }));
const data = { asOf, source: 'NSAA wildcard schedules export, Class C1', teams, subdistricts };

// Verify points as recorded by NSAA match our points model.
const eng = Engine.create(data);
let ptsMismatch = 0;
for (const t of expected) for (const g of teams[t].games) {
  const opp = teams[g.opp] ? [teams[g.opp].w, teams[g.opp].l] : [g.w, g.l];
  if (Engine.gamePoints(g.res, opp[0], opp[1], g.cls) !== g.pts) { ptsMismatch++; if (ptsMismatch <= 8) console.warn('points mismatch', t, g); }
}
const cur = eng.current();
const published = { 'Lincoln Lutheran': 43.7333, 'Valentine': 43.6667 };
for (const [t, v] of Object.entries(published)) console.log(`${t}: computed ${cur[t].toFixed(4)} vs NSAA ${v} ${Math.abs(cur[t] - v) < 0.0002 ? 'OK' : 'MISMATCH'}`);
// NSAA's own average uses the points it recorded; compare to ours.
let avgDiff = 0;
for (const t of expected) { const rec = teams[t].games.reduce((a, g) => a + g.pts, 0) / teams[t].games.length; if (Math.abs(rec - cur[t]) > 0.0002) { avgDiff++; if (avgDiff <= 5) console.warn('avg diff', t, rec.toFixed(4), cur[t].toFixed(4)); } }
console.log(`teams ${expected.length}, row/record warnings ${warnings.length}, points mismatches ${ptsMismatch}, avg diffs ${avgDiff}`);
warnings.slice(0, 5).forEach(w => console.warn(w));

// Safety check for the page's "we're still in" claim: after losing our first game, does ANY combination of
// up to MAXK upsets elsewhere leave us out of the 16-team field? Recomputed on every refresh.
const FOCUS = 'Lincoln Lutheran';
const MAXK = 3;
{
  const ovB = eng.branchOverrides(FOCUS, 0), baseEv = eng.evaluate(ovB);
  const ids = Object.keys(baseEv.results).filter(id => baseEv.results[id].a !== FOCUS && baseEv.results[id].b !== FOCUS);
  const combos = (k, start = 0, cur = [], acc = []) => { if (cur.length === k) { acc.push(cur.slice()); return acc; } for (let i = start; i < ids.length; i++) { cur.push(ids[i]); combos(k, i + 1, cur, acc); cur.pop(); } return acc; };
  let safeUpTo = 0, outAt = null;
  for (let k = 1; k <= MAXK && !outAt; k++) {
    let out = false;
    for (const c of combos(k)) { const ov = {}; c.forEach(id => ov[id] = baseEv.results[id].loser); if (!eng.evaluate(eng.merge(ovB, ov)).seedOf[FOCUS]) { out = true; break; } }
    if (out) outAt = k; else safeUpTo = k;
  }
  data.focus = FOCUS;
  data.checks = { firstLossSafeUpTo: safeUpTo, firstLossOutAt: outAt };
  console.log('stay-in check after losing first game:', JSON.stringify(data.checks));
}

fs.writeFileSync(new URL('../data.js', import.meta.url), 'window.NSAA_DATA = ' + JSON.stringify(data) + ';\n');
console.log('wrote data.js');

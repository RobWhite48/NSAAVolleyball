import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Engine = require('../engine.js');
eval(fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8').replace('window.NSAA_DATA', 'globalThis.NSAA_DATA'));
const E = Engine.create(globalThis.NSAA_DATA);
const T = 'Lincoln Lutheran';
const branch = process.argv[2] === 'final' ? E.maxWins(T) - 1 : 0;
const ovB = E.branchOverrides(T, branch);
const baseEv = E.evaluate(ovB);
const ids = Object.keys(baseEv.results).filter(id => { const r = baseEv.results[id]; return r.a !== T && r.b !== T; });
console.log('branch', branch, 'games', ids.length, 'base seed', baseEv.seedOf[T]);

// exhaustive search up to depth D for a set of upsets (underdog wins vs baseline participants) that knocks T out
function underdogOf(id) { const r = baseEv.results[id]; return r.loser; }
function out(ov) { return !E.evaluate(E.merge(ovB, ov)).seedOf[T]; }
const D = +process.argv[3] || 3;
function combos(arr, k, start = 0, cur = [], acc = []) {
  if (cur.length === k) { acc.push(cur.slice()); return acc; }
  for (let i = start; i < arr.length; i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, acc); cur.pop(); }
  return acc;
}
for (let k = 1; k <= D; k++) {
  const t0 = Date.now(); let found = null, n = 0;
  for (const c of combos(ids, k)) {
    n++;
    const ov = {}; c.forEach(id => ov[id] = underdogOf(id));
    if (out(ov)) { found = c; break; }
  }
  console.log(`k=${k}: tested ${n} ${found ? 'OUT with ' + JSON.stringify(found.map(id => `${id}:${underdogOf(id)}`)) : 'never out'} (${Date.now() - t0}ms)`);
  if (found) break;
}

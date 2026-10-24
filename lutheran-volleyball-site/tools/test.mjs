import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Engine = require('../engine.js');
globalThis.window = {};
eval(fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8').replace('window.NSAA_DATA', 'globalThis.NSAA_DATA'));
const E = Engine.create(globalThis.NSAA_DATA);
const T = 'Lincoln Lutheran';
const f = x => x.toFixed(4);

const base = E.evaluate({});
console.log('BASELINE (better record wins everywhere): Lutheran seed', base.seedOf[T] || 'out', 'avg', f(base.avg[T]));
console.log('winners', JSON.stringify(base.winners));
console.log('cutoff avg (6th wildcard)', base.cutoff && f(base.cutoff), 'first out', base.firstOut && base.firstOut.team, base.firstOut && f(base.firstOut.avg));

const max = E.maxWins(T);
console.log('Lutheran max wins in subdistrict', max);
for (const [label, k] of [['TITLE', Infinity], ['LOSE FINAL', max - 1], ['LOSE FIRST', 0]]) {
  const ov = E.branchOverrides(T, k);
  const ev = E.evaluate(ov), m = E.matchup(ev, T);
  console.log(`\n${label}: ov=${JSON.stringify(ov)}`);
  console.log(`  seed ${ev.seedOf[T]} avg ${f(ev.avg[T])} ${m.host ? 'HOST' : 'ROAD'} vs #${m.opp.seed} ${m.opp.team} (${f(m.opp.avg)})`);
  const s = E.sensitivity(T, ov);
  for (const x of s.sort((a, b) => Math.abs(b.seedFlip - b.seedBase) - Math.abs(a.seedFlip - a.seedBase)).slice(0, 8))
    console.log(`  flip ${x.id} ${x.a} v ${x.b}: ${x.underdog} wins -> seed ${x.seedBase}->${x.seedFlip}, host ${x.hostBase}->${x.hostFlip}, opp ${x.oppBase}->${x.oppFlip}`);
}
for (const [label, k] of [['TITLE', Infinity], ['LOSE FIRST', 0]]) {
  const t0 = Date.now(); const s = E.stress(T, E.branchOverrides(T, k), 2000);
  console.log(`STRESS ${label}:`, JSON.stringify(s), (Date.now() - t0) + 'ms');
}
console.log('\nValentine win both:', f(E.evaluate({}).avg['Valentine']));
const v = E.evaluate({ 'C1-10:1': 'Chase County' });
console.log('Field (baseline):'); base.field.forEach(x => console.log(`  #${x.seed} ${x.team} ${f(x.avg)} ${x.champ ? 'champ' : 'wild'} ${x.rec.join('-')}`));

/* NSAA C1 volleyball scenario engine.
 * Works in the browser (window.Engine) and in Node (module.exports).
 * Rules source: 2026 NSAA volleyball manual (points scale, district-final seeding, 1 v 16 pairing).
 */
(function (root) {
  'use strict';

  var BASE = { W: [50, 47, 44, 41], L: [39, 36, 33, 30] };
  var BONUS = { A: 3, B: 2 }; // bonus for a C1 team playing a bigger class
  var HOST_SEEDS = 8; // seeds 1-8 host the district final
  var FIELD = 16, WILDCARDS = 6;

  function division(w, l) {
    var g = w + l, p = g ? w / g : 0;
    return p >= 0.75 ? 1 : p >= 0.5 ? 2 : p >= 0.25 ? 3 : 4;
  }
  function gamePoints(res, oppW, oppL, oppCls) {
    return BASE[res][division(oppW, oppL) - 1] + (BONUS[oppCls] || 0);
  }

  function create(data) {
    var teams = data.teams, subs = data.subdistricts, subOf = {}, subById = {};
    subs.forEach(function (s) {
      subById[s.id] = s;
      s.teams.forEach(function (t, i) { subOf[t] = { sub: s.id, seed: i + 1 }; });
    });
    var gameById = {};
    subs.forEach(function (s) { s.games.forEach(function (g) { gameById[g.id] = { game: g, sub: s }; }); });

    function pct(t) { var x = teams[t]; return x.w / (x.w + x.l); }
    function favorite(a, b) {
      var pa = pct(a), pb = pct(b);
      if (pa !== pb) return pa > pb ? a : b;
      return subOf[a].seed < subOf[b].seed ? a : b;
    }

    // Walk one subdistrict bracket. ov[gameId] = 'Team' (that team wins if playing)
    // or '!Team' (that team loses if playing). hook can force a result.
    function resolveSub(s, ov, hook) {
      var win = {}, res = {};
      s.games.forEach(function (g) {
        var a = g.a.seed ? s.teams[g.a.seed - 1] : win[g.a.win];
        var b = g.b.seed ? s.teams[g.b.seed - 1] : win[g.b.win];
        var w = hook ? hook(g, a, b) : null;
        // A game NSAA already shows as played is a fact, not a projection.
        if (!w && g.winner && (g.winner === a || g.winner === b)) w = g.winner;
        if (!w) {
          var o = ov && ov[g.id];
          if (o) {
            if (o.charAt(0) === '!') { var loser = o.slice(1); if (loser === a) w = b; else if (loser === b) w = a; }
            else if (o === a || o === b) w = o;
          }
        }
        if (!w) w = favorite(a, b);
        win[g.id] = w;
        res[g.id] = { id: g.id, a: a, b: b, winner: w, loser: w === a ? b : a };
      });
      return res;
    }

    function standingsFrom(rec, extra) {
      var avg = {}, pts = {};
      Object.keys(teams).forEach(function (t) {
        var sum = 0, n = 0;
        teams[t].games.forEach(function (g) {
          var r = teams[g.opp] ? rec[g.opp] : [g.w, g.l];
          sum += gamePoints(g.res, r[0], r[1], g.cls); n++;
        });
        ((extra && extra[t]) || []).forEach(function (e) {
          var r = rec[e.opp];
          sum += gamePoints(e.res, r[0], r[1], 'C1'); n++;
        });
        avg[t] = n ? sum / n : 0; pts[t] = sum;
      });
      return { avg: avg, pts: pts };
    }

    function currentRecords() {
      var rec = {};
      Object.keys(teams).forEach(function (t) { rec[t] = [teams[t].w, teams[t].l]; });
      return rec;
    }
    // Averages exactly as NSAA shows them today (no subdistrict games yet).
    function current() { return standingsFrom(currentRecords(), null).avg; }

    function evaluate(ov, hook, opts) {
      ov = ov || {};
      var results = {}, winners = {};
      subs.forEach(function (s) {
        var r = resolveSub(s, ov, hook);
        Object.keys(r).forEach(function (k) { results[k] = r[k]; });
        winners[s.id] = r[s.games[s.games.length - 1].id].winner;
      });
      var rec = currentRecords(), extra = {};
      Object.keys(results).forEach(function (k) {
        var r = results[k];
        if (opts && opts.playedOnly && !gameById[k].game.winner) return; // validation mode: facts only
        rec[r.winner][0]++; rec[r.loser][1]++;
        (extra[r.winner] = extra[r.winner] || []).push({ opp: r.loser, res: 'W' });
        (extra[r.loser] = extra[r.loser] || []).push({ opp: r.winner, res: 'L' });
      });
      var st = standingsFrom(rec, extra), avg = st.avg;
      var champs = Object.keys(winners).map(function (k) { return winners[k]; });
      var isChamp = {}; champs.forEach(function (t) { isChamp[t] = true; });
      function cmp(a, b) {
        if (avg[b] !== avg[a]) return avg[b] - avg[a];
        var pa = rec[a][0] / (rec[a][0] + rec[a][1]), pb = rec[b][0] / (rec[b][0] + rec[b][1]);
        if (pb !== pa) return pb - pa;
        return a < b ? -1 : 1;
      }
      var others = Object.keys(teams).filter(function (t) { return !isChamp[t]; }).sort(cmp);
      var wild = others.slice(0, WILDCARDS), out = others.slice(WILDCARDS);
      var field = champs.concat(wild).sort(cmp).map(function (t, i) {
        return { seed: i + 1, team: t, avg: avg[t], rec: rec[t], sub: subOf[t].sub, champ: !!isChamp[t] };
      });
      var seedOf = {}; field.forEach(function (f) { seedOf[f.team] = f.seed; });
      var pairings = [];
      for (var i = 1; i <= FIELD / 2; i++) pairings.push({ hi: field[i - 1], lo: field[FIELD - i] });
      return {
        results: results, winners: winners, rec: rec, avg: avg, field: field, seedOf: seedOf,
        pairings: pairings, cutoff: wild.length ? avg[wild[wild.length - 1]] : null,
        firstOut: out.length ? { team: out[0], avg: avg[out[0]] } : null
      };
    }

    function matchup(ev, team) {
      var s = ev.seedOf[team];
      if (!s) return null;
      for (var i = 0; i < ev.pairings.length; i++) {
        var p = ev.pairings[i];
        if (p.hi.team === team) return { seed: s, host: true, opp: p.lo, game: i + 1 };
        if (p.lo.team === team) return { seed: s, host: false, opp: p.hi, game: i + 1 };
      }
      return null;
    }

    // Force `team` to win `wins` games in its subdistrict, then lose (or win the title if wins is Infinity).
    function branchOverrides(team, wins) {
      var s = subById[subOf[team].sub], k = 0, done = false, ov = {};
      resolveSub(s, {}, function (g, a, b) {
        if (g.winner && (g.winner === a || g.winner === b)) { // already played: counts toward the path
          if (a === team || b === team) { if (g.winner === team) k++; else done = true; }
          return null;
        }
        if (done || (a !== team && b !== team)) return null;
        var opp = a === team ? b : a;
        if (k < wins) { k++; ov[g.id] = team; return team; }
        done = true; ov[g.id] = '!' + team; return opp;
      });
      return ov;
    }
    function maxWins(team) {
      var s = subById[subOf[team].sub], n = 0;
      resolveSub(s, {}, function (g, a, b) { if (a === team || b === team) { n++; return team; } return null; });
      return n;
    }

    function merge() { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = arguments[i][k]; return o; }

    // One-game-at-a-time sensitivity: which other games change this team's seed?
    function sensitivity(team, ovBase) {
      var base = evaluate(ovBase), baseM = matchup(base, team);
      var baseSeed = base.seedOf[team] || 99;
      var out = [];
      Object.keys(base.results).forEach(function (id) {
        var r = base.results[id];
        if (r.a === team || r.b === team) return;
        if (gameById[id].game.winner) return; // already played
        var fav = r.winner, dog = r.loser;
        var ev = evaluate(merge(ovBase, (function () { var o = {}; o[id] = dog; return o; })()));
        var m = matchup(ev, team), seed = ev.seedOf[team] || 99;
        if (seed === baseSeed && (!m || !baseM || m.opp.team === baseM.opp.team)) return;
        out.push({
          id: id, sub: gameById[id].sub.id, a: r.a, b: r.b, favorite: fav, underdog: dog,
          seedBase: baseSeed, seedFlip: seed,
          hostBase: !!(baseM && baseM.host), hostFlip: !!(m && m.host),
          inBase: !!base.seedOf[team], inFlip: !!ev.seedOf[team],
          oppBase: baseM ? baseM.opp.team : null, oppFlip: m ? m.opp.team : null,
          avgBase: base.avg[team], avgFlip: ev.avg[team]
        });
      });
      return out;
    }

    // Robustness check, not a forecast: play every other game as a coin flip n times
    // (fixed seed, so results are repeatable) and report whether `team` is ever left out.
    function stress(team, ovBase, n) {
      var a = 20261023;
      function rnd() { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
      var out = 0, minMargin = Infinity, worstSeed = 0, hostCount = 0;
      for (var i = 0; i < n; i++) {
        var ev = evaluate(ovBase, function (g, x, y) { if (ovBase[g.id] || g.winner) return null; return rnd() < 0.5 ? x : y; });
        var seed = ev.seedOf[team];
        if (!seed) { out++; continue; }
        if (seed > worstSeed) worstSeed = seed;
        if (seed <= HOST_SEEDS) hostCount++;
        if (ev.firstOut) minMargin = Math.min(minMargin, ev.avg[team] - ev.firstOut.avg);
      }
      return { n: n, out: out, worstSeed: worstSeed, minMargin: minMargin, hostCount: hostCount };
    }

    return {
      stress: stress,
      data: data, teams: teams, subs: subs, subOf: subOf, subById: subById, gameById: gameById,
      favorite: favorite, evaluate: evaluate, current: current, matchup: matchup,
      branchOverrides: branchOverrides, maxWins: maxWins, sensitivity: sensitivity, merge: merge,
      HOST_SEEDS: HOST_SEEDS, division: division, gamePoints: gamePoints
    };
  }

  var api = { create: create, division: division, gamePoints: gamePoints };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);

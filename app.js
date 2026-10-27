(function () {
  'use strict';
  var D = window.NSAA_DATA, E = Engine.create(D), TEAM = D.focus || 'Lincoln Lutheran';
  var TRAVEL = { 'Valentine': 'roughly 4 to 5 hours away' }; // edit as needed
  var SUB = E.subById[E.subOf[TEAM].sub];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function f2(x) { return x.toFixed(2); }
  function seedTxt(seed, host) { return seed ? '#' + seed + (host ? ' (home)' : ' (road)') : 'out of the field'; }
  function when(g) { return g.date + (g.time ? ', ' + g.time : '') ; }

  // ---------- core computations ----------
  var maxW = E.maxWins(TEAM);
  var BASE0 = E.evaluate({});
  var tw = SUB.games.filter(function (g) { return g.winner === TEAM; }).length; // wins already in the books
  var eliminated = SUB.games.some(function (g) { var r = BASE0.results[g.id]; return g.winner && (r.a === TEAM || r.b === TEAM) && g.winner !== TEAM; });
  var BR = [];
  if (eliminated) BR.push({ key: 'done', wins: tw, label: 'finish where we are' });
  else {
    BR.push({ key: 'title', wins: Infinity, label: 'win our subdistrict' });
    for (var w = maxW - 1; w >= tw; w--) BR.push({ key: 'r' + w, wins: w, label: w === maxW - 1 ? 'lose the subdistrict final' : (w === tw ? (tw === 0 ? 'lose our first game' : 'lose our next game') : 'lose after ' + w + ' wins') });
  }
  BR.forEach(function (b) {
    b.ov = E.branchOverrides(TEAM, b.wins);
    b.ev = E.evaluate(b.ov);
    b.m = E.matchup(b.ev, TEAM);
    b.sens = E.sensitivity(TEAM, b.ov);
  });
  var T = BR[0], FIRST = BR[BR.length - 1];
  var FIN = (!eliminated && maxW - 1 >= tw) ? BR.filter(function (b) { return b.wins === maxW - 1; })[0] : null;
  if (FIN === FIRST) FIN = null; // only one losing branch left (e.g. we are already in the final)
  var nextGame = null;

  // our path games under the title branch
  var pathGames = SUB.games.filter(function (g) { var r = T.ev.results[g.id]; return r.a === TEAM || r.b === TEAM; });
  function describeSlot(slot) {
    if (slot.seed) return SUB.teams[slot.seed - 1];
    var fg = E.gameById[slot.win].game;
    function inner(s) { var d = describeSlot(s); return s.seed ? d : '(' + d + ')'; }
    return 'winner of ' + inner(fg.a) + ' v ' + inner(fg.b);
  }
  function oppSlot(g) { var r = T.ev.results[g.id]; return r.a === TEAM ? g.b : g.a; }

  // ---------- hero ----------
  function decisiveFlips(b, wantHostGain) {
    return b.sens.filter(function (x) { return wantHostGain ? (!x.hostBase && x.hostFlip) : (x.hostBase && !x.hostFlip); });
  }
  function groupByFavorite(flips) {
    var by = {}; flips.forEach(function (x) { (by[x.favorite] = by[x.favorite] || []).push(x); });
    return by;
  }
  function hero() {
    var t = T.m;
    if (!t) { $('answer').innerHTML = '<p>We are not projected to reach the district final in any scenario we tested.</p>'; return; }
    if (eliminated) {
      $('answer').innerHTML = '<div class="big cond">Our subdistrict is over. We are ' + (t.host ? 'projected to host.' : 'still in as a wildcard.') + ' <span class="chip proj">Projected</span></div><div class="tiles">' + tile(T, 'Where we stand', t.host ? 'We host if this holds.' : 'We travel unless other results move us up.') + '</div>';
      finishHero(); return;
    }
    var big = t.host ? 'Win the subdistrict and we host the district final.' : 'Win the subdistrict and we are projected #' + t.seed + '.';
    var lostLabel = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
    function tile(b, label, note) {
      var m = b.m;
      if (!m) return '<div class="tile"><div class="tl">' + esc(label) + '</div><div class="trow"><div class="tn">&ndash;</div><div class="tside"><div class="tw">Out of the field</div></div></div><div class="tx">' + note + '</div></div>';
      var trip = (!m.host && TRAVEL[m.opp.team]) ? '<div class="tm">' + esc(TRAVEL[m.opp.team]) + '</div>' : '';
      return '<div class="tile' + (m.host ? ' home' : '') + '"><div class="tl">' + esc(label) + '</div><div class="trow"><div class="tn">#' + m.seed + '</div><div class="tside"><span class="hr ' + (m.host ? 'home' : 'road') + '">' + (m.host ? 'Home' : 'Road') + '</span><div class="tw">' + (m.host ? 'Host' : 'At') + ' #' + m.opp.seed + ' ' + esc(m.opp.team) + '</div>' + trip + '</div></div><div class="tx">' + note + '</div></div>';
    }
    var caveats = decisiveFlips(T, false);
    var n1 = !t.host ? 'We would need help from other results.' : (caveats.length ? '<b>Catch:</b> if ' + esc(caveats[0].underdog) + ' upsets ' + esc(caveats[0].favorite) + ', we drop to ' + seedTxt(caveats[0].seedFlip, caveats[0].hostFlip) + '.' : 'Winning is enough.');
    var n2 = '';
    if (FIN && FIN.m) {
      if (FIN.m.host) n2 = 'We still host.';
      else {
        var gains = decisiveFlips(FIN, true), by = groupByFavorite(gains), keys = Object.keys(by);
        if (keys.length === 1) n2 = 'We move up to #' + gains[0].seedFlip + ' and host if <b>' + esc(keys[0]) + ' loses a game</b>.';
        else if (gains.length) n2 = 'We move up and host if ' + gains.slice(0, 2).map(function (x) { return esc(x.underdog) + ' beats ' + esc(x.favorite); }).join(' or ') + '.';
        else n2 = 'No other single result changes this.';
      }
    }
    var firstHost = FIRST.m && FIRST.m.host;
    var n3 = firstHost ? 'We would still host.' : 'Still in as a wildcard.' + ((D.checks && D.checks.firstLossSafeUpTo > 0 && !D.checks.firstLossOutAt) ? ' Holds up through any ' + D.checks.firstLossSafeUpTo + ' upsets elsewhere.' : '');
    var tiles = tile(T, 'Win the subdistrict', n1);
    if (FIN) tiles += tile(FIN, 'Lose the final', n2);
    tiles += tile(FIRST, lostLabel(FIRST.label), n3);
    $('answer').innerHTML = '<div class="big cond">' + big + ' <span class="chip proj">Projected</span></div><div class="tiles">' + tiles + '</div>';
    finishHero();
  }
  function finishHero() {
    nextGame = pathGames.filter(function (g) { return !g.winner; })[0];
    $('next').innerHTML = nextGame ? '<b>Next game:</b> ' + esc(when(nextGame)) + ' at ' + esc(nextGame.site) + ' vs ' + esc(describeSlot(oppSlot(nextGame))) + '.' : '<b>Our subdistrict games are finished.</b> The district final is next.';
    $('asof').textContent = 'Data as of ' + D.asOf;
    $('foot-asof').textContent = 'Records, averages and brackets as of ' + D.asOf + ' from the NSAA wildcard schedules (' + D.source + '). Updated after each round of play.';
  }

  // ---------- rooting guide ----------
  function rootItems() {
    var by = {};
    BR.forEach(function (b) { b.sens.forEach(function (x) { (by[x.id] = by[x.id] || { id: x.id, x: x, eff: [] }).eff.push({ br: b, x: x }); }); });
    return Object.keys(by).map(function (id) {
      var it = by[id];
      it.eff.forEach(function (e) {
        var x = e.x;
        e.hostSwing = x.hostBase !== x.hostFlip; e.fieldSwing = x.inBase !== x.inFlip;
        e.d = (x.seedFlip - x.seedBase);
        e.score = (e.hostSwing ? 100 : 0) + (e.fieldSwing ? 100 : 0) + Math.abs(e.d) * 10 + (x.oppBase !== x.oppFlip ? 1 : 0);
      });
      it.eff.sort(function (a, b) { return b.score - a.score; });
      it.best = it.eff[0];
      it.score = it.eff.reduce(function (a, e) { return a + e.score; }, 0); // total impact across all our possible results
      var bx = it.best.x;
      it.root = it.best.d > 0 ? bx.favorite : bx.underdog; // flip makes seed number worse => root for favorite
      it.other = it.root === bx.favorite ? bx.underdog : bx.favorite;
      it.directional = it.best.d !== 0 || it.best.hostSwing || it.best.fieldSwing;
      return it;
    }).sort(function (a, b) { return b.score - a.score; });
  }
  function effText(e, root, other) {
    var x = e.x, rootIsFav = root === x.favorite;
    var good = rootIsFav ? { s: x.seedBase, h: x.hostBase, i: x.inBase } : { s: x.seedFlip, h: x.hostFlip, i: x.inFlip };
    var bad = rootIsFav ? { s: x.seedFlip, h: x.hostFlip, i: x.inFlip } : { s: x.seedBase, h: x.hostBase, i: x.inBase };
    var g = good.i ? seedTxt(good.s, good.h) : 'out of the field', b = bad.i ? seedTxt(bad.s, bad.h) : 'out of the field';
    if (good.s === bad.s && good.i === bad.i) return null;
    return 'If we ' + e.br.label + ': ' + g + ' if ' + esc(root) + ' wins, ' + b + ' if ' + esc(other) + ' wins.';
  }
  function renderRoots() {
    var items = rootItems(), dir = items.filter(function (i) { return i.directional; }), neutral = items.filter(function (i) { return !i.directional; });
    var top = dir.filter(function (i) { return i.best.score >= 100; }), rest = dir.filter(function (i) { return i.best.score < 100; });
    function card(it) {
      var x = it.x, g = E.gameById[it.id], sg = g.game;
      var tags = '';
      if (it.best.hostSwing) tags += '<span class="tag host">Decides home or road</span>';
      if (it.best.fieldSwing) tags += '<span class="tag host">Decides if we are in</span>';
      if (!it.best.hostSwing && !it.best.fieldSwing) tags += '<span class="tag mid">Moves our seed</span>';
      var lines = it.eff.slice(0, 2).map(function (e) { return effText(e, it.root, it.other); }).filter(Boolean);
      var inOur = g.sub.id === SUB.id;
      return '<div class="root"><div class="when">' + esc(g.sub.id) + (inOur ? ' (our subdistrict)' : '') + ' &middot; ' + esc(when(sg)) + ' &middot; ' + esc(sg.site) + '</div>' +
        '<div class="pick">Root for <em>' + esc(it.root) + '</em> over ' + esc(it.other) + '</div>' + tags +
        '<p class="why">' + lines.join(' ') + '</p></div>';
    }
    $('roots').innerHTML = top.length ? top.map(card).join('') : '<div class="root"><p class="why">No single result elsewhere decides home or road for us right now.</p></div>';
    var more = '';
    if (rest.length || neutral.length) {
      more = '<details><summary>More games that nudge us (' + (rest.length + neutral.length) + ')</summary>' +
        rest.map(card).join('') +
        neutral.map(function (it) {
          var x = it.x, g = E.gameById[it.id];
          return '<div class="root"><div class="when">' + esc(g.sub.id) + ' &middot; ' + esc(when(g.game)) + '</div><p class="why">If ' + esc(x.underdog) + ' beats ' + esc(x.favorite) + ', our district-final opponent changes from ' + esc(x.oppBase) + ' to ' + esc(x.oppFlip) + '. Same seed either way.</p></div>';
        }).join('') + '</details>';
    }
    $('more-roots').innerHTML = more;
    return items;
  }

  // ---------- scenario paths ----------
  function optionsFor(g) {
    var slot = oppSlot(g);
    if (slot.seed) return [SUB.teams[slot.seed - 1]];
    var r = T.ev.results[slot.win];
    if (E.gameById[slot.win].game.winner) return [r.winner]; // already decided
    var fav = r.winner, dog = r.loser;
    return [fav, dog];
  }
  function cart(arrs) { return arrs.reduce(function (acc, a) { var out = []; acc.forEach(function (p) { a.forEach(function (x) { out.push(p.concat([x])); }); }); return out; }, [[]]); }
  function scenarioRows() {
    var n = pathGames.length, groups = [], pw = pathGames.filter(function (g) { return g.winner === TEAM; }).length;
    for (var stage = n; stage >= pw; stage--) {
      var upto = Math.min(stage, n - 1), opts = [];
      for (var j = 0; j <= upto; j++) opts.push(optionsFor(pathGames[j]));
      var rows = cart(opts).map(function (combo) {
        var ov = {};
        for (var j = 0; j <= upto; j++) {
          var g = pathGames[j], slot = oppSlot(g);
          if (slot.win) ov[slot.win] = combo[j];
          if (j < stage) ov[g.id] = TEAM; else ov[g.id] = '!' + TEAM;
        }
        // keep lookahead games from re-deciding our results
        var ev = E.evaluate(ov), m = E.matchup(ev, TEAM);
        var path = combo.map(function (o, j) { return (j === 0 ? '' : 'then ') + (j < stage ? (j === 0 ? 'Beat ' : 'beat ') : (j === 0 ? 'Lose to ' : 'lose to ')) + o + (j < pw ? ' (done)' : ''); });
        return { text: path.join(', '), ev: ev, m: m };
      });
      groups.push({ stage: stage, rows: rows });
    }
    return groups;
  }
  function groupTitle(stage, n) {
    var pw = pathGames.filter(function (g) { return g.winner === TEAM; }).length;
    if (stage === n) return 'Win the subdistrict';
    if (stage === n - 1) return 'Lose the final';
    if (stage === pw) return pw === 0 ? 'Lose our first game' : 'Lose our next game';
    return 'Lose after ' + stage + ' wins';
  }
  function renderPaths() {
    if (eliminated) {
      var m0 = T.m;
      $('paths').innerHTML = '<div class="group"><h3>Where we stand</h3><div class="row' + (m0 && m0.host ? ' host' : '') + '"><div class="how">Our subdistrict is over</div><div class="res">' + (m0 ? '<span class="hr ' + (m0.host ? 'home' : 'road') + '">' + (m0.host ? 'Home' : 'Road') + '</span> &middot; ' + (m0.host ? 'host' : 'at') + ' #' + m0.opp.seed + ' ' + esc(m0.opp.team) : 'Out of the 16-team field') + '</div>' + (m0 ? '<div class="seedbox"><div class="n">#' + m0.seed + '</div><div class="a">' + f2(T.ev.avg[TEAM]) + '</div></div>' : '') + '</div></div>';
      return;
    }
    var n = pathGames.length, groups = scenarioRows();
    $('paths').innerHTML = groups.map(function (g) {
      return '<div class="group"><h3>' + esc(groupTitle(g.stage, n)) + '</h3>' + g.rows.map(function (r) {
        var m = r.m;
        if (!m) return '<div class="row"><div class="how">' + esc(r.text) + '</div><div class="res">Out of the 16-team field</div><div class="seedbox"><div class="n">&ndash;</div></div></div>';
        return '<div class="row' + (m.host ? ' host' : '') + '"><div class="how">' + esc(r.text) + '</div>' +
          '<div class="res"><span class="hr ' + (m.host ? 'home' : 'road') + '">' + (m.host ? 'Home' : 'Road') + '</span> &middot; ' + (m.host ? 'host' : 'at') + ' #' + m.opp.seed + ' ' + esc(m.opp.team) + '</div>' +
          '<div class="seedbox"><div class="n">#' + m.seed + '</div><div class="a">' + f2(r.ev.avg[TEAM]) + '</div></div></div>';
      }).join('') + '</div>';
    }).join('') + '<p class="small muted" style="margin-top:10px">The small number under each seed is our points average. Only seeds 1 through 8 host.</p>';
  }

  // ---------- possible opponents ----------
  function renderOpps(items) {
    var out = {};
    function add(branch, mm) {
      var o = out[branch.label] = out[branch.label] || {};
      o[mm.opp.team + '|' + mm.opp.seed + '|' + mm.host] = { team: mm.opp.team, seed: mm.opp.seed, host: mm.host };
    }
    BR.forEach(function (b) {
      if (b.m) add(b, b.m);
      b.sens.forEach(function (x) {
        if (!x.oppFlip) return;
        var o = {}; o[x.id] = x.underdog;
        var mm = E.matchup(E.evaluate(E.merge(b.ov, o)), TEAM);
        if (mm) add(b, mm);
      });
    });
    var html = BR.map(function (b) {
      var o = out[b.label] || {};
      var list = Object.keys(o).map(function (k) { return o[k]; }).sort(function (a, c) { return a.seed - c.seed; });
      var chips = list.map(function (x) {
        return '<span class="opp"><b>#' + x.seed + ' ' + esc(x.team) + '</b> &middot; ' + (x.host ? 'we host' : 'road trip' + (TRAVEL[x.team] ? ', ' + TRAVEL[x.team] : '')) + '</span>';
      }).join('');
      return '<p style="margin:14px 0 0"><b>If we ' + esc(b.label) + ':</b></p><div class="opps">' + chips + '</div>';
    }).join('');
    $('opps').innerHTML = html + '<p class="small muted">Opponents shown are from the expected result plus any single upset elsewhere. Many more combinations are possible. Use &ldquo;Try it yourself&rdquo; to explore.</p>';
  }

  // ---------- schedule ----------
  function renderSched() {
    var rows = pathGames.map(function (g) {
      if (g.winner) { var r = T.ev.results[g.id], opp = r.a === TEAM ? r.b : r.a; return '<div class="row"><div class="how">' + esc(g.date) + ' &middot; Played</div><div class="res">' + (g.winner === TEAM ? 'Beat ' : 'Lost to ') + esc(opp) + ' ' + esc(g.score || '') + '</div></div>'; }
      var label = g === pathGames[pathGames.length - 1] ? 'Subdistrict final' : 'Subdistrict semifinal';
      if (pathGames.length === 1) label = 'Subdistrict final';
      return '<div class="row"><div class="how">' + esc(g.date) + ', ' + esc(g.time) + '</div><div class="res">' + label + ' &middot; ' + esc(g.site) + ' &middot; vs ' + esc(describeSlot(oppSlot(g))) + '</div></div>';
    }).join('');
    rows += '<div class="row"><div class="how">Sat, Oct 31</div><div class="res">District final (if we advance). Matchups, times and sites are posted by NSAA after the subdistricts.</div></div>';
    $('sched').innerHTML = '<div class="group" style="margin-top:0">' + rows + '</div>';
  }

  // ---------- picker ----------
  // Starting point: we win our subdistrict; every other game goes to the team with the better record.
  function startPicks() { return E.merge(T.ov); }
  var picks = startPicks();
  var elseIds = [];
  function setupPicker(items) {
    var seen = {};
    items.forEach(function (it) { var g = E.gameById[it.id]; if (g.sub.id !== SUB.id && !seen[it.id] && it.directional) { seen[it.id] = 1; elseIds.push(it.id); } });
    elseIds.sort(function (a, b) { var A = E.gameById[a], B = E.gameById[b]; return A.sub.id === B.sub.id ? A.game.n - B.game.n : (A.sub.id < B.sub.id ? -1 : 1); });
  }
  function teamBtn(g, team, ev) {
    var win = ev.results[g.id].winner === team, locked = !!g.winner;
    var s = E.subOf[team], r = D.teams[team];
    return '<button type="button" class="team' + (team === TEAM ? ' us' : '') + '" data-g="' + esc(g.id) + '" data-t="' + esc(team) + '" aria-pressed="' + win + '"' + (locked ? ' disabled' : '') + '>' + esc(team) + '<small>' + r.w + '-' + r.l + ' &middot; #' + s.seed + ' seed</small></button>';
  }
  function gameRow(id, ev) {
    var gi = E.gameById[id], g = gi.game, r = ev.results[id];
    return '<div class="game"><div class="meta">' + esc(gi.sub.id) + ' &middot; ' + esc(when(g)) + ' &middot; ' + esc(g.site) + (g.winner ? ' &middot; <b>Final: ' + esc(g.winner) + ' ' + esc(g.score || '') + '</b>' : '') + '</div><div class="pickrow">' + teamBtn(g, r.a, ev) + teamBtn(g, r.b, ev) + '</div></div>';
  }
  function renderPicker() {
    var ev = E.evaluate(picks), m = E.matchup(ev, TEAM);
    var res;
    if (!m) res = '<div class="n">OUT<small>of the field</small></div><div><div class="t">We would miss the district final.</div><div class="s">Average ' + f2(ev.avg[TEAM]) + '. Cutoff ' + (ev.cutoff ? f2(ev.cutoff) : '') + '.</div></div>';
    else res = '<div class="n">#' + m.seed + '<small>' + (m.host ? 'HOME' : 'ROAD') + '</small></div><div><div class="t">' + (m.host ? 'We host' : 'We travel to') + ' #' + m.opp.seed + ' ' + esc(m.opp.team) + '</div><div class="s">Our average ' + f2(ev.avg[TEAM]) + (m.host ? '' : (TRAVEL[m.opp.team] ? ' &middot; ' + esc(m.opp.team) + ' is ' + TRAVEL[m.opp.team] : '')) + ' &middot; projected</div></div>';
    $('result').innerHTML = res;
    $('pick-ours').innerHTML = SUB.games.map(function (g) { return gameRow(g.id, ev); }).join('');
    $('pick-else').innerHTML = elseIds.length ? elseIds.map(function (id) { return gameRow(id, ev); }).join('') : '<p class="muted">No outside games change our seed right now.</p>';
    var openAll = document.getElementById('all-subs-wrap') && document.getElementById('all-subs-wrap').open;
    $('all-subs').innerHTML = E.subs.filter(function (s) { return s.id !== SUB.id; }).map(function (s) {
      return '<h3 style="margin-top:16px">' + esc(s.id) + ' &middot; hosted by ' + esc(s.host) + '</h3>' + s.games.map(function (g) { return gameRow(g.id, ev); }).join('');
    }).join('');
    var rows = ev.field.map(function (f) {
      var pi = null; ev.pairings.forEach(function (p) { if (p.hi.team === f.team || p.lo.team === f.team) pi = p; });
      var home = pi.hi.team === f.team, opp = home ? pi.lo : pi.hi;
      return '<tr class="' + (f.team === TEAM ? 'us' : '') + '"><td>#' + f.seed + '</td><td>' + esc(f.team) + '</td><td>' + f2(f.avg) + '</td><td>' + (home ? 'hosts' : 'at') + ' #' + opp.seed + ' ' + esc(opp.team) + '</td></tr>';
    }).join('');
    $('field').innerHTML = '<div class="scroll"><table class="tbl"><thead><tr><th>Seed</th><th>Team</th><th>Avg</th><th>District final</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="small muted">Cutoff for the last wildcard spot: ' + (ev.cutoff ? f2(ev.cutoff) : '') + '. Projected from the results chosen above.</p>';
  }
  // ---------- the bubble: points ladder ----------
  var ladderKey = BR[0].key;
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function renderLadder() {
    var b = BR.filter(function (x) { return x.key === ladderKey; })[0] || BR[0];
    $('seg').innerHTML = BR.map(function (x) {
      return '<button type="button" data-lk="' + x.key + '" aria-pressed="' + (x.key === b.key) + '">' + esc(cap(x.label)) + '</button>';
    }).join('');
    var field = b.ev.field, my = b.ev.seedOf[TEAM], lo = 5, hi = 12;
    if (my && my < lo) lo = my;
    if (my && my > hi) hi = my;
    var rows = field.filter(function (f) { return f.seed >= lo && f.seed <= hi; });
    var vals = rows.map(function (r) { return r.avg; }), min = Math.min.apply(null, vals) - 0.35, max = Math.max.apply(null, vals);
    $('ladder').innerHTML = rows.map(function (f) {
      var w = Math.max(4, (f.avg - min) / (max - min) * 100);
      var out = '<div class="lrow' + (f.team === TEAM ? ' us' : '') + '"><div class="s">' + f.seed + '</div><div class="t">' + esc(f.team) + '<small>' + (f.champ ? 'Subdistrict winner' : 'Wildcard') + '</small><div class="bar"><i style="width:' + w.toFixed(1) + '%"></i></div></div><div class="v">' + f2(f.avg) + '</div></div>';
      if (f.seed === 8) out += '<div class="lcap">Home games stop here</div>';
      return out;
    }).join('');
    var cp;
    if (!my) cp = 'In this result we miss the 16-team field.';
    else if (my <= 8) { var nxt = field[8]; cp = 'We sit ' + f2(b.ev.avg[TEAM] - nxt.avg) + ' points above the first road seed (#9 ' + esc(nxt.team) + ').'; }
    else { var eight = field[7]; cp = 'We sit ' + f2(eight.avg - b.ev.avg[TEAM]) + ' points below the last home seed (#8 ' + esc(eight.team) + '), so we would need help from other results to host.'; }
    $('ladder-cap').innerHTML = cp + ' Bars compare points averages. Seeds 5 through 12 shown.';
  }
  function bind() {
    document.addEventListener('click', function (e) {
      var lk = e.target.closest ? e.target.closest('[data-lk]') : null;
      if (lk) { ladderKey = lk.getAttribute('data-lk'); renderLadder(); return; }
      var b = e.target.closest ? e.target.closest('button.team') : null;
      if (b) { picks[b.getAttribute('data-g')] = b.getAttribute('data-t'); renderPicker(); return; }
      if (e.target && e.target.id === 'reset') { picks = startPicks(); renderPicker(); }
    });
  }

  hero();
  var items = renderRoots();
  renderPaths();
  renderLadder();
  renderOpps(items);
  renderSched();
  setupPicker(items);
  renderPicker();
  bind();
  window.__NSAA = { E: E, BR: BR, items: items };
})();

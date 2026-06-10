/* ============================================================
   Monte Carlo tournament engine.
   Model: Elo → expected score → Poisson goals.
   - Win expectancy: We = 1 / (1 + 10^(-dElo/400))
   - Goal means split a ~2.7-goal match by Elo odds, so W/D/L
     and goal difference both emerge from the same draw.
   - Knockout draws go to extra time (λ/3), then a shootout
     leaning 55/45 to the higher-Elo side.

   opts accepted throughout:
     locked   — real results/teams from the live feed:
                { group: {'AAA|BBB': {gh,ga}},        (sorted key)
                  koTeams: {73: {home:'AAA', away:'BBB'}},
                  koResults: {73: {gh,ga,winner:'AAA'}} }
     momentum — update Elo within each simulated tournament (K=50)
     eloDelta — {teamId: ±points} rating adjustment (what-if slider)
     onPair   — callback(idA, idB, stageIdx) for every knockout tie
   ============================================================ */

const teamById = Object.fromEntries(TEAMS.map(t => [t.id, t]));

function effElo(t) { return t.elo + (t.host ? HOST_BOOST : 0); }

function baseRatings(eloDelta) {
  const R = {};
  for (const t of TEAMS) R[t.id] = effElo(t) + (eloDelta?.[t.id] || 0);
  return R;
}

function winExpectancyR(ra, rb) {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}
function winExpectancy(a, b) { return winExpectancyR(effElo(a), effElo(b)); }

function poisson(lambda) {
  // Knuth — fine for λ < 10
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function goalMeansR(ra, rb) {
  const we = winExpectancyR(ra, rb);
  const total = 2.7;
  const ratio = Math.pow(we / (1 - we), 0.85); // odds-ratio split, tempered
  const la = (total * ratio) / (1 + ratio);
  return [Math.max(0.15, la), Math.max(0.15, total - la)];
}

/* in-tournament Elo update (momentum mode), eloratings.net-style */
function bumpElo(R, aId, bId, ga, gb) {
  const K = 50;
  const diff = Math.abs(ga - gb);
  const G = diff <= 1 ? 1 : diff === 2 ? 1.5 : (11 + diff) / 8;
  const we = winExpectancyR(R[aId], R[bId]);
  const w = ga > gb ? 1 : ga === gb ? 0.5 : 0;
  const d = K * G * (w - we);
  R[aId] += d; R[bId] -= d;
}

const pairKey = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;

/* ---- group stage ---- */

function simulateGroup(teams, log, R, opts) {
  const table = teams.map(t => ({ t, pts: 0, gf: 0, ga: 0, w: 0, d: 0, l: 0 }));
  const row = Object.fromEntries(table.map(r => [r.t.id, r]));
  const lockedGroup = opts.locked?.group;
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const A = teams[i], B = teams[j];
    let ga, gb, real = false;
    const lock = lockedGroup?.[`${A.id}|${B.id}`];
    const lockR = lockedGroup?.[`${B.id}|${A.id}`];
    if (lock)       { ga = lock.gh;  gb = lock.ga;  real = true; }
    else if (lockR) { ga = lockR.ga; gb = lockR.gh; real = true; }
    else {
      const [la, lb] = goalMeansR(R[A.id], R[B.id]);
      ga = poisson(la); gb = poisson(lb);
    }
    if (opts.momentum) bumpElo(R, A.id, B.id, ga, gb);
    const ra = row[A.id], rb = row[B.id];
    ra.gf += ga; ra.ga += gb; rb.gf += gb; rb.ga += ga;
    if (ga > gb)      { ra.pts += 3; ra.w++; rb.l++; }
    else if (gb > ga) { rb.pts += 3; rb.w++; ra.l++; }
    else              { ra.pts++; rb.pts++; ra.d++; rb.d++; }
    if (log) log.push({ stage: 'group', a: A, b: B, ga, gb, note: '', real });
  }
  table.sort((x, y) =>
    y.pts - x.pts ||
    (y.gf - y.ga) - (x.gf - x.ga) ||
    y.gf - x.gf ||
    Math.random() - 0.5 // drawing of lots
  );
  return table;
}

function playKnockoutR(A, B, R, opts, matchId, log, stageKey) {
  const lock = opts.locked?.koResults?.[matchId];
  let ga, gb, note = '', winner;
  if (lock && (lock.home === A.id || lock.home === undefined)) {
    ga = lock.gh; gb = lock.ga;
    winner = teamById[lock.winner];
    note = lock.note || '';
  } else {
    const [la, lb] = goalMeansR(R[A.id], R[B.id]);
    ga = poisson(la); gb = poisson(lb);
    if (ga === gb) {
      ga += poisson(la / 3); gb += poisson(lb / 3);
      note = ' aet';
      if (ga === gb) {
        const we = winExpectancyR(R[A.id], R[B.id]);
        if (Math.random() < 0.5 + (we - 0.5) * 0.2) ga++; else gb++;
        note = ' pens';
      }
    }
    winner = ga > gb ? A : B;
  }
  if (opts.momentum && !lock) bumpElo(R, A.id, B.id, ga, gb);
  if (log) log.push({ stage: stageKey, a: A, b: B, ga, gb, note, real: !!lock });
  return winner;
}

/* Best-third allocation: rank the 12 thirds, take 8, then
   backtrack-assign them to the 8 constrained bracket slots. */
function allocateThirds(ranked) { // ranked: [{g, t}] best-first, length 8
  const slots = R32.filter(m => m.away.t).map(m => m.id);
  const pools = Object.fromEntries(R32.filter(m => m.away.t).map(m => [m.id, m.away.t]));
  const used = new Set(), out = {};
  (function bt(i) {
    if (i === slots.length) return true;
    for (const cand of ranked) {
      if (used.has(cand.g) || !pools[slots[i]].includes(cand.g)) continue;
      used.add(cand.g); out[slots[i]] = cand.t;
      if (bt(i + 1)) return true;
      used.delete(cand.g); delete out[slots[i]];
    }
    return false;
  })(0);
  return out; // matchId -> team
}

function rankThirds(thirdsByGroup) {
  return GROUPS
    .map(g => ({ g, r: thirdsByGroup[g] }))
    .sort((x, y) =>
      y.r.pts - x.r.pts ||
      (y.r.gf - y.r.ga) - (x.r.gf - x.r.ga) ||
      y.r.gf - x.r.gf ||
      Math.random() - 0.5
    )
    .slice(0, 8)
    .map(x => ({ g: x.g, t: x.r.t }));
}

/* ---- one full tournament ---- */
function simulateTournament(withLog = false, opts = {}) {
  const log = withLog ? [] : null;
  const R = baseRatings(opts.eloDelta);
  const reached = {};
  TEAMS.forEach(t => reached[t.id] = 0);

  const winners = {}, runners = {}, thirds = {};
  for (const g of GROUPS) {
    const table = simulateGroup(TEAMS.filter(t => t.group === g), log, R, opts);
    winners[g] = table[0].t; runners[g] = table[1].t; thirds[g] = table[2];
  }
  const thirdSlots = allocateThirds(rankThirds(thirds));

  const koTeams = opts.locked?.koTeams;
  const matchWinner = {};
  const playRound = (matches, stageIdx, getTeam) => {
    const stageKey = STAGES[stageIdx];
    for (const m of matches) {
      // real bracket overrides simulated standings once teams are known
      const lockT = koTeams?.[m.id];
      const A = lockT ? teamById[lockT.home] : getTeam(m, 'home');
      const B = lockT ? teamById[lockT.away] : getTeam(m, 'away');
      reached[A.id] = Math.max(reached[A.id], stageIdx);
      reached[B.id] = Math.max(reached[B.id], stageIdx);
      if (opts.onPair) opts.onPair(A.id, B.id, stageIdx);
      const w = playKnockoutR(A, B, R, opts, m.id, log, stageKey);
      matchWinner[m.id] = w;
      reached[w.id] = stageIdx + 1;
    }
  };

  playRound(R32, 1, (m, side) => {
    const s = m[side];
    return s.t ? thirdSlots[m.id] : s.w ? winners[s.w] : runners[s.r];
  });
  playRound(R16, 2, (m, side) => matchWinner[m[side]]);
  playRound(QF, 3, (m, side) => matchWinner[m[side]]);
  playRound(SF, 4, (m, side) => matchWinner[m[side]]);
  playRound([FINAL], 5, (m, side) => matchWinner[m[side]]);

  return { reached, champion: matchWinner[FINAL.id], log };
}

/* ---- deterministic "most likely path" ----
   No dice: analytic W/D/L from the same Poisson model, groups ranked
   by expected points (real points for played matches), knockout slots
   resolved favorite-wins. */

function pmf(lambda, kMax = 10) {
  const out = [Math.exp(-lambda)];
  for (let k = 1; k <= kMax; k++) out.push(out[k - 1] * lambda / k);
  return out;
}

function matchProbsR(ra, rb) { // exact W/D/L for the Poisson model
  const [la, lb] = goalMeansR(ra, rb);
  const pa = pmf(la), pb = pmf(lb);
  let pW = 0, pD = 0, pL = 0;
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) {
    const p = pa[i] * pb[j];
    if (i > j) pW += p; else if (i === j) pD += p; else pL += p;
  }
  return { pW, pD, pL };
}
function matchProbs(a, b) { return matchProbsR(effElo(a), effElo(b)); }

function groupExpectedTable(g, R, locked) {
  const teams = TEAMS.filter(t => t.group === g);
  const rows = teams.map(t => ({ t, xp: 0, played: 0 }));
  const row = Object.fromEntries(rows.map(r => [r.t.id, r]));
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const A = teams[i], B = teams[j];
    const lock = locked?.group?.[`${A.id}|${B.id}`] || locked?.group?.[`${B.id}|${A.id}`];
    if (lock) {
      const k = locked.group[`${A.id}|${B.id}`] ? lock : { gh: lock.ga, ga: lock.gh };
      row[A.id].xp += k.gh > k.ga ? 3 : k.gh === k.ga ? 1 : 0;
      row[B.id].xp += k.ga > k.gh ? 3 : k.gh === k.ga ? 1 : 0;
      row[A.id].played++; row[B.id].played++;
    } else {
      const { pW, pD, pL } = matchProbsR(R[A.id], R[B.id]);
      row[A.id].xp += 3 * pW + pD;
      row[B.id].xp += 3 * pL + pD;
    }
  }
  return rows.sort((a, b) => b.xp - a.xp || effElo(b.t) - effElo(a.t));
}

function deterministicPath(team, opts = {}) {
  const R = baseRatings(opts.eloDelta);
  const locked = opts.locked;

  const tables = {};
  for (const g of GROUPS) tables[g] = groupExpectedTable(g, R, locked);
  const winners = {}, runners = {};
  GROUPS.forEach(g => { winners[g] = tables[g][0].t; runners[g] = tables[g][1].t; });

  let thirds = GROUPS.map(g => ({ g, t: tables[g][2].t, xp: tables[g][2].xp }))
    .sort((a, b) => b.xp - a.xp || effElo(b.t) - effElo(a.t));
  const myRank = tables[team.group].findIndex(r => r.t.id === team.id);
  let qualNote = null;
  if (myRank >= 2) {
    thirds = thirds.filter(x => x.g !== team.group);
    thirds.unshift({ g: team.group, t: team, xp: tables[team.group][myRank].xp });
    qualNote = myRank === 2
      ? 'needs a best-third finish'
      : 'projected 4th — path assumes they sneak through as a third';
  }
  const thirdSlot = allocateThirds(thirds.slice(0, 8).map(x => ({ g: x.g, t: x.t })));

  const occupant = {};
  const steps = [];
  const decide = (m, A, B) => {
    const lockT = locked?.koTeams?.[m.id];
    if (lockT) { A = teamById[lockT.home]; B = teamById[lockT.away]; }
    if (!A || !B) { occupant[m.id] = A || B; return; }
    const res = locked?.koResults?.[m.id];
    if (A.id === team.id || B.id === team.id) {
      const opp = A.id === team.id ? B : A;
      steps.push({
        matchId: m.id, opp,
        winProb: winExpectancyR(R[team.id], R[opp.id]),
        real: res ? { won: res.winner === team.id, gh: res.gh, ga: res.ga, note: res.note } : null,
      });
      // a real loss ends the run; otherwise our team advances on its path
      occupant[m.id] = res && res.winner !== team.id ? teamById[res.winner] : team;
    } else {
      occupant[m.id] = res ? teamById[res.winner]
        : R[A.id] >= R[B.id] ? A : B;
    }
  };
  const r32Team = (m, side) => {
    const s = m[side];
    return s.t ? thirdSlot[m.id] : s.w ? winners[s.w] : runners[s.r];
  };
  R32.forEach(m => decide(m, r32Team(m, 'home'), r32Team(m, 'away')));
  [R16, QF, SF, [FINAL]].forEach(round =>
    round.forEach(m => decide(m, occupant[m.home], occupant[m.away])));

  const groupSteps = [];
  for (const o of TEAMS.filter(t => t.group === team.group && t.id !== team.id)) {
    const lock = locked?.group?.[`${team.id}|${o.id}`] || locked?.group?.[`${o.id}|${team.id}`];
    if (lock) {
      const mine = locked.group[`${team.id}|${o.id}`] ? lock : { gh: lock.ga, ga: lock.gh };
      groupSteps.push({ opp: o, real: { gf: mine.gh, ga: mine.ga } });
    } else {
      groupSteps.push({ opp: o, ...matchProbsR(R[team.id], R[o.id]) });
    }
  }

  return { groupSteps, koSteps: steps, myRank, qualNote, tables, occupant };
}

/* favorite-wins occupants for the whole tree — used by the bracket view */
function projectedBracket(opts = {}) {
  const R = baseRatings(opts.eloDelta);
  const locked = opts.locked;
  const tables = {};
  for (const g of GROUPS) tables[g] = groupExpectedTable(g, R, locked);
  const winners = {}, runners = {};
  GROUPS.forEach(g => { winners[g] = tables[g][0].t; runners[g] = tables[g][1].t; });
  const thirds = GROUPS.map(g => ({ g, t: tables[g][2].t, xp: tables[g][2].xp }))
    .sort((a, b) => b.xp - a.xp || effElo(b.t) - effElo(a.t))
    .slice(0, 8);
  const thirdSlot = allocateThirds(thirds);

  const matches = {}; // id -> {a, b, winner, prob, real}
  const occupant = {};
  const decide = (m, A, B) => {
    const lockT = locked?.koTeams?.[m.id];
    if (lockT) { A = teamById[lockT.home]; B = teamById[lockT.away]; }
    const res = locked?.koResults?.[m.id];
    let winner, prob;
    if (res) { winner = teamById[res.winner]; prob = 1; }
    else {
      winner = R[A.id] >= R[B.id] ? A : B;
      prob = winExpectancyR(R[winner.id], R[winner.id === A.id ? B.id : A.id]);
    }
    matches[m.id] = { a: A, b: B, winner, prob, real: res || null };
    occupant[m.id] = winner;
  };
  const r32Team = (m, side) => {
    const s = m[side];
    return s.t ? thirdSlot[m.id] : s.w ? winners[s.w] : runners[s.r];
  };
  R32.forEach(m => decide(m, r32Team(m, 'home'), r32Team(m, 'away')));
  [R16, QF, SF, [FINAL]].forEach(round =>
    round.forEach(m => decide(m, occupant[m.home], occupant[m.away])));
  return matches;
}

/* ---- aggregation over N runs ---- */
function createAggregator() {
  const stats = {};
  TEAMS.forEach(t => { stats[t.id] = { stage: new Array(7).fill(0) }; });
  const meets = {}; // 'AAA|BBB' -> knockout meetings count
  let runs = 0;
  const onPair = (a, b) => { const k = pairKey(a, b); meets[k] = (meets[k] || 0) + 1; };
  return {
    run(n, opts = {}) {
      const o = { ...opts, onPair };
      for (let i = 0; i < n; i++) {
        const { reached } = simulateTournament(false, o);
        for (const id in reached) {
          const s = stats[id];
          for (let k = 0; k <= reached[id]; k++) s.stage[k]++;
        }
        runs++;
      }
    },
    get runs() { return runs; },
    /* probability team reaches at least stage k (k=1 r32 … 6 champion) */
    prob(id, k) { return runs ? stats[id].stage[k] / runs : 0; },
    snapshot() {
      return {
        runs,
        stage: Object.fromEntries(TEAMS.map(t => [t.id, stats[t.id].stage.slice()])),
        meets: { ...meets },
      };
    },
  };
}

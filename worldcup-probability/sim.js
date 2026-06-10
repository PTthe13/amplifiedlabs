/* ============================================================
   Monte Carlo tournament engine.
   Model: Elo → expected score → Poisson goals.
   - Win expectancy: We = 1 / (1 + 10^(-dElo/400))
   - Goal means split a ~2.7-goal match by Elo odds, so W/D/L
     and goal difference both emerge from the same draw.
   - Knockout draws go to extra time (λ/3), then a shootout
     leaning 55/45 to the higher-Elo side.
   ============================================================ */

const teamIndex = Object.fromEntries(TEAMS.map((t, i) => [t.id, i]));

function effElo(t) { return t.elo + (t.host ? HOST_BOOST : 0); }

function winExpectancy(a, b) {
  return 1 / (1 + Math.pow(10, (effElo(b) - effElo(a)) / 400));
}

function poisson(lambda) {
  // Knuth — fine for λ < 10
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function goalMeans(a, b) {
  const we = winExpectancy(a, b);
  const total = 2.7;
  // odds-ratio split, exponent tempers blowouts
  const ratio = Math.pow(we / (1 - we), 0.85);
  const la = (total * ratio) / (1 + ratio);
  return [Math.max(0.15, la), Math.max(0.15, total - la)];
}

function playGroupMatch(a, b) {
  const [la, lb] = goalMeans(a, b);
  return [poisson(la), poisson(lb)];
}

function playKnockout(a, b) {
  const [la, lb] = goalMeans(a, b);
  let ga = poisson(la), gb = poisson(lb);
  let note = '';
  if (ga === gb) {
    ga += poisson(la / 3); gb += poisson(lb / 3);
    note = ' aet';
    if (ga === gb) {
      const we = winExpectancy(a, b);
      const pPens = 0.5 + (we - 0.5) * 0.2; // mild Elo edge in shootouts
      if (Math.random() < pPens) ga++; else gb++;
      note = ' pens';
    }
  }
  return { ga, gb, note, winner: ga > gb ? a : b };
}

/* ---- group stage ---- */

function simulateGroup(teams, log) {
  const table = teams.map(t => ({ t, pts: 0, gf: 0, ga: 0, w: 0, d: 0, l: 0 }));
  const row = Object.fromEntries(table.map(r => [r.t.id, r]));
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const A = teams[i], B = teams[j];
    const [ga, gb] = playGroupMatch(A, B);
    const ra = row[A.id], rb = row[B.id];
    ra.gf += ga; ra.ga += gb; rb.gf += gb; rb.ga += ga;
    if (ga > gb)      { ra.pts += 3; ra.w++; rb.l++; }
    else if (gb > ga) { rb.pts += 3; rb.w++; ra.l++; }
    else              { ra.pts++; rb.pts++; ra.d++; rb.d++; }
    if (log) log.push({ stage: 'group', a: A, b: B, ga, gb, note: '' });
  }
  table.sort((x, y) =>
    y.pts - x.pts ||
    (y.gf - y.ga) - (x.gf - x.ga) ||
    y.gf - x.gf ||
    Math.random() - 0.5 // drawing of lots
  );
  return table;
}

/* Best-third allocation: rank the 12 thirds, take 8, then
   backtrack-assign them to the 8 constrained bracket slots.
   (FIFA's published table reduces to exactly this matching.) */
function assignThirds(thirdsByGroup) {
  const ranked = GROUPS
    .map(g => ({ g, r: thirdsByGroup[g] }))
    .sort((x, y) =>
      y.r.pts - x.r.pts ||
      (y.r.gf - y.r.ga) - (x.r.gf - x.r.ga) ||
      y.r.gf - x.r.gf ||
      Math.random() - 0.5
    )
    .slice(0, 8);
  const slots = R32.filter(m => m.away.t).map(m => m.id);
  const pools = Object.fromEntries(R32.filter(m => m.away.t).map(m => [m.id, m.away.t]));
  const used = new Set();
  const out = {};
  function bt(i) {
    if (i === slots.length) return true;
    const slot = slots[i];
    for (const cand of ranked) {
      if (used.has(cand.g) || !pools[slot].includes(cand.g)) continue;
      used.add(cand.g); out[slot] = cand.r.t;
      if (bt(i + 1)) return true;
      used.delete(cand.g); delete out[slot];
    }
    return false;
  }
  bt(0);
  return out; // matchId -> team
}

/* ---- one full tournament ----
   Returns { reached: {teamId: stageIdx}, log? } */
function simulateTournament(withLog = false) {
  const log = withLog ? [] : null;
  const reached = {};
  TEAMS.forEach(t => reached[t.id] = 0); // 0 = group stage

  const winners = {}, runners = {}, thirds = {};
  for (const g of GROUPS) {
    const table = simulateGroup(TEAMS.filter(t => t.group === g), log);
    winners[g] = table[0].t; runners[g] = table[1].t; thirds[g] = table[2];
    reached[table[0].t.id] = 1; reached[table[1].t.id] = 1;
  }
  const thirdSlots = assignThirds(thirds);
  Object.values(thirdSlots).forEach(t => reached[t.id] = 1);

  const resolve = s =>
    s.w ? winners[s.w] : s.r ? runners[s.r] : null; // thirds handled per match

  const matchWinner = {};
  const playRound = (matches, stageIdx, getTeam) => {
    for (const m of matches) {
      const A = getTeam(m, 'home'), B = getTeam(m, 'away');
      const res = playKnockout(A, B);
      matchWinner[m.id] = res.winner;
      reached[res.winner.id] = stageIdx + 1;
      if (log) log.push({ stage: STAGES[stageIdx], a: A, b: B, ga: res.ga, gb: res.gb, note: res.note });
    }
  };

  playRound(R32, 1, (m, side) => {
    const s = m[side];
    return s.t ? thirdSlots[m.id] : resolve(s);
  });
  playRound(R16, 2, (m, side) => matchWinner[m[side]]);
  playRound(QF, 3, (m, side) => matchWinner[m[side]]);
  playRound(SF, 4, (m, side) => matchWinner[m[side]]);
  playRound([FINAL], 5, (m, side) => matchWinner[m[side]]);

  // champion sits at stage index 6
  return { reached, champion: matchWinner[FINAL.id], log };
}

/* ---- deterministic "most likely path" ----
   No dice: analytic W/D/L from the same Poisson model, groups ranked
   by expected points, knockout slots resolved favorite-wins. */

function pmf(lambda, kMax = 10) {
  const out = [Math.exp(-lambda)];
  for (let k = 1; k <= kMax; k++) out.push(out[k - 1] * lambda / k);
  return out;
}

function matchProbs(a, b) { // exact W/D/L for the Poisson model
  const [la, lb] = goalMeans(a, b);
  const pa = pmf(la), pb = pmf(lb);
  let pW = 0, pD = 0, pL = 0;
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) {
    const p = pa[i] * pb[j];
    if (i > j) pW += p; else if (i === j) pD += p; else pL += p;
  }
  return { pW, pD, pL };
}

function expectedPoints(t, group) {
  return group.filter(o => o.id !== t.id)
    .reduce((sum, o) => { const { pW, pD } = matchProbs(t, o); return sum + 3 * pW + pD; }, 0);
}

function deterministicPath(team) {
  // 1. every group ranked by expected points
  const tables = {};
  for (const g of GROUPS) {
    const teams = TEAMS.filter(t => t.group === g);
    tables[g] = teams
      .map(t => ({ t, xp: expectedPoints(t, teams) }))
      .sort((a, b) => b.xp - a.xp || effElo(b.t) - effElo(a.t));
  }
  const winners = {}, runners = {};
  GROUPS.forEach(g => { winners[g] = tables[g][0].t; runners[g] = tables[g][1].t; });

  // 2. best thirds by expected points; our team forced in if needed
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
  const top8 = thirds.slice(0, 8);

  // 3. thirds → slots (same backtracking, deterministic order)
  const slots = R32.filter(m => m.away.t).map(m => m.id);
  const pools = Object.fromEntries(R32.filter(m => m.away.t).map(m => [m.id, m.away.t]));
  const used = new Set(), thirdSlot = {};
  (function bt(i) {
    if (i === slots.length) return true;
    for (const cand of top8) {
      if (used.has(cand.g) || !pools[slots[i]].includes(cand.g)) continue;
      used.add(cand.g); thirdSlot[slots[i]] = cand.t;
      if (bt(i + 1)) return true;
      used.delete(cand.g); delete thirdSlot[slots[i]];
    }
    return false;
  })(0);

  // 4. favorite-wins occupants, our team always advances through its slot
  const occupant = {};
  const r32Team = (m, side) => {
    const s = m[side];
    return s.t ? thirdSlot[m.id] : s.w ? winners[s.w] : runners[s.r];
  };
  const steps = [];
  const decide = (m, A, B) => {
    if (!A || !B) { occupant[m.id] = A || B; return; }
    const mine = A.id === team.id || B.id === team.id;
    if (mine) {
      const opp = A.id === team.id ? B : A;
      steps.push({ matchId: m.id, opp, winProb: winExpectancy(team, opp) });
      occupant[m.id] = team;
    } else {
      occupant[m.id] = effElo(A) >= effElo(B) ? A : B;
    }
  };
  R32.forEach(m => decide(m, r32Team(m, 'home'), r32Team(m, 'away')));
  [R16, QF, SF, [FINAL]].forEach(round =>
    round.forEach(m => decide(m, occupant[m.home], occupant[m.away])));

  // 5. group-stage steps (analytic) prepended
  const groupSteps = TEAMS.filter(t => t.group === team.group && t.id !== team.id)
    .map(o => ({ opp: o, ...matchProbs(team, o) }));

  return { groupSteps, koSteps: steps, myRank, qualNote, tables };
}

/* ---- aggregation over N runs ----
   Chunked so the UI can animate the counter. */
function createAggregator() {
  const stats = {};
  TEAMS.forEach(t => {
    stats[t.id] = {
      stage: new Array(7).fill(0), // counts of reaching stage idx >= k
      runs: 0,
    };
  });
  let runs = 0;
  return {
    run(n) {
      for (let i = 0; i < n; i++) {
        const { reached } = simulateTournament(false);
        for (const id in reached) {
          const s = stats[id];
          for (let k = 0; k <= reached[id]; k++) s.stage[k]++;
          s.runs++;
        }
        runs++;
      }
    },
    get runs() { return runs; },
    /* probability team reaches at least stage k (k=1 r32 … 6 champion) */
    prob(id, k) { return runs ? stats[id].stage[k] / runs : 0; },
  };
}

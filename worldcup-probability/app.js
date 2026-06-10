/* UI: worker-pool sims, live-results conditioning, almanac table,
   projected bracket, head-to-head, upset index, group cards, and a
   team drawer (likely path / random universe / exit profile / what-if). */

const $ = sel => document.querySelector(sel);
const els = {
  runBtn: $('#run'),
  simCount: $('#sim-count'),
  counter: $('#counter'),
  momentum: $('#momentum'),
  liveStatus: $('#live-status'),
  table: $('#prob-table tbody'),
  groups: $('#groups'),
  bracket: $('#bracket-view'),
  h2h: $('#h2h'),
  upsets: $('#upsets'),
  drawer: $('#drawer'),
  scrim: $('#drawer-scrim'),
};

/* merged view over all workers' counters */
const agg = {
  runs: 0,
  stage: {},
  meets: {},
  prob(id, k) { return this.runs ? (this.stage[id]?.[k] || 0) / this.runs : 0; },
  meetProb(a, b) { return this.runs ? (this.meets[pairKey(a, b)] || 0) / this.runs : 0; },
};

let selected = null;
let currentRun = null;       // one simulated tournament, stable while drawer open
let drawerMode = 'likely';   // 'likely' | 'random'
let drawerEloDelta = 0;      // what-if slider value for the selected team
let adjusted = null;         // {runs, stage} from a what-if mini-run
let LIVE = null;             // parsed live feed
let baseline = null;         // pre-tournament probs for delta arrows

const fmt = p => p >= 0.995 ? '>99' : p < 0.005 ? (p === 0 ? '—' : '<1') : Math.round(p * 100);
const simOpts = () => ({
  locked: LIVE?.locked,
  momentum: els.momentum.checked,
});

function heatCell(p) {
  const alpha = Math.pow(p, 0.7);
  return `<td class="num"><span class="heat" style="--a:${alpha.toFixed(3)}">${fmt(p)}</span></td>`;
}

/* ---- main table ---- */
function deltaTag(id) {
  if (!baseline || !LIVE?.played) return '';
  const d = (agg.prob(id, 6) - baseline[id]) * 100;
  if (Math.abs(d) < 0.5) return '';
  return `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'}${Math.abs(d).toFixed(1)}</span>`;
}

function renderTable() {
  const rows = [...TEAMS].sort((a, b) => agg.prob(b.id, 6) - agg.prob(a.id, 6) || effElo(b) - effElo(a));
  els.table.innerHTML = rows.map((t, i) => `
    <tr data-team="${t.id}" class="${selected === t.id ? 'selected' : ''}">
      <td class="num rank">${i + 1}</td>
      <td class="team"><span class="flag">${t.flag}</span>${t.name}<span class="grp">${t.group}</span>${deltaTag(t.id)}</td>
      <td class="num elo">${effElo(t)}</td>
      ${[1, 2, 3, 4, 5, 6].map(k => heatCell(agg.prob(t.id, k))).join('')}
    </tr>`).join('');
}

/* ---- group cards ---- */
function renderGroups() {
  els.groups.innerHTML = GROUPS.map(g => {
    const teams = TEAMS.filter(t => t.group === g)
      .sort((a, b) => agg.prob(b.id, 1) - agg.prob(a.id, 1));
    return `<div class="group-card">
      <h3>Group ${g}</h3>
      ${teams.map(t => `
        <button class="group-row" data-team="${t.id}">
          <span class="flag">${t.flag}</span>
          <span class="gname">${t.name}</span>
          <span class="bar"><i style="width:${(agg.prob(t.id, 1) * 100).toFixed(1)}%"></i></span>
          <span class="gpct">${fmt(agg.prob(t.id, 1))}%</span>
        </button>`).join('')}
    </div>`;
  }).join('');
}

/* ---- projected bracket ---- */
function renderBracket() {
  const matches = projectedBracket(simOpts());
  const rounds = [
    { label: 'Round of 32', ms: R32 },
    { label: 'Round of 16', ms: R16 },
    { label: 'Quarter-finals', ms: QF },
    { label: 'Semi-finals', ms: SF },
    { label: 'Final', ms: [FINAL] },
  ];
  els.bracket.innerHTML = rounds.map(r => `
    <div class="bv-col">
      <h5>${r.label}</h5>
      ${r.ms.map(m => {
        const x = matches[m.id];
        if (!x) return '';
        const side = (team, isWinner) => `
          <button class="bv-team ${isWinner ? 'fav' : ''}" data-team="${team.id}">
            <span class="flag">${team.flag}</span>
            <span class="bv-name">${team.name}</span>
            <span class="bv-pct">${x.real ? (team.id === x.winner.id ? '✓' : '✕') : (isWinner ? Math.round(x.prob * 100) + '%' : '')}</span>
          </button>`;
        return `<div class="bv-match ${x.real ? 'played' : ''}">
          ${side(x.a, x.winner.id === x.a.id)}
          ${side(x.b, x.winner.id === x.b.id)}
        </div>`;
      }).join('')}
    </div>`).join('');
  const champ = matches[FINAL.id]?.winner;
  if (champ) els.bracket.innerHTML += `
    <div class="bv-col"><h5>Champion</h5>
      <div class="bv-match champ"><button class="bv-team fav" data-team="${champ.id}">
        <span class="flag">${champ.flag}</span><span class="bv-name">${champ.name}</span><span class="bv-pct">🏆</span>
      </button></div>
    </div>`;
}

/* ---- head-to-head ---- */
function renderH2H() {
  const opts = TEAMS.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  if (!$('#h2h-a')) {
    els.h2h.innerHTML = `
      <div class="h2h-controls">
        <select id="h2h-a">${opts}</select>
        <span class="h2h-vs">vs</span>
        <select id="h2h-b">${opts}</select>
      </div>
      <div id="h2h-out"></div>`;
    $('#h2h-a').value = 'POR'; $('#h2h-b').value = 'ESP';
    $('#h2h-a').onchange = $('#h2h-b').onchange = updateH2H;
  }
  updateH2H();
}

function updateH2H() {
  const a = teamById[$('#h2h-a').value], b = teamById[$('#h2h-b').value];
  if (a.id === b.id) { $('#h2h-out').innerHTML = '<p class="hint">Pick two different teams.</p>'; return; }
  const { pW, pD, pL } = matchProbs(a, b);
  const sameGroup = a.group === b.group;
  const meet = agg.meetProb(a.id, b.id);
  const bar = (lbl, p, cls) => `
    <div class="h2h-row">
      <span class="h2h-lbl">${lbl}</span>
      <span class="bar big"><i class="${cls}" style="width:${(p * 100).toFixed(1)}%"></i></span>
      <span class="h2h-pct">${fmt(p)}%</span>
    </div>`;
  $('#h2h-out').innerHTML = `
    ${bar(`${a.flag} ${a.name} win`, pW, 'win')}
    ${bar('Draw', pD, 'draw')}
    ${bar(`${b.flag} ${b.name} win`, pL, 'lose')}
    <p class="h2h-meet">${sameGroup
      ? `Same group (${a.group}) — they meet for certain in the group stage.`
      : agg.runs
        ? `They meet somewhere in the knockouts in <strong>${(meet * 100).toFixed(1)}%</strong> of simulated tournaments.`
        : ''}</p>`;
}

/* ---- upset index ---- */
function renderUpsets() {
  // candidate matches: unplayed real group fixtures (or all group pairs
  // offline), plus the projected round of 32
  const cands = [];
  if (LIVE?.fixtures?.length) {
    for (const f of LIVE.fixtures) {
      if (f.finished) continue;
      cands.push({ a: teamById[f.home], b: teamById[f.away], stage: `Group ${f.group}` });
    }
  } else {
    for (const g of GROUPS) {
      const ts = TEAMS.filter(t => t.group === g);
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++)
        cands.push({ a: ts[i], b: ts[j], stage: `Group ${g}` });
    }
  }
  const matches = projectedBracket(simOpts());
  for (const m of R32) {
    const x = matches[m.id];
    if (x && !x.real) cands.push({ a: x.a, b: x.b, stage: 'Round of 32 (projected)' });
  }
  const rows = cands.map(c => {
    const [fav, dog] = effElo(c.a) >= effElo(c.b) ? [c.a, c.b] : [c.b, c.a];
    const { pW } = matchProbs(dog, fav); // underdog outright win
    return { fav, dog, stage: c.stage, p: pW, gap: effElo(fav) - effElo(dog) };
  }).sort((x, y) => y.p - x.p).slice(0, 10);

  els.upsets.innerHTML = `
    <div class="upset-head"><span>Underdog</span><span></span><span>Favourite</span><span>Stage</span><span>Upset odds</span></div>
    ${rows.map(r => `
      <div class="upset-row">
        <button class="ulink" data-team="${r.dog.id}">${r.dog.flag} ${r.dog.name}</button>
        <span class="uvs">beats</span>
        <button class="ulink" data-team="${r.fav.id}">${r.fav.flag} ${r.fav.name}</button>
        <span class="ustage">${r.stage}</span>
        <span class="upct"><span class="bar"><i style="width:${(r.p * 100 / 0.45).toFixed(1)}%"></i></span>${fmt(r.p)}%</span>
      </div>`).join('')}`;
}

/* ---- survival curve (optionally vs a what-if run) ---- */
function survivalSVG(t) {
  const stages = [1, 2, 3, 4, 5, 6];
  const labels = ['R32', 'R16', 'QF', 'SF', 'Final', 'Champ'];
  const W = 560, H = 170, pad = 28, bw = (W - pad * 2) / stages.length;
  let bars = '';
  const pts = [];
  const adjProb = k => adjusted && adjusted.runs ? (adjusted.stage[t.id]?.[k] || 0) / adjusted.runs : null;
  stages.forEach((k, i) => {
    const p = agg.prob(t.id, k);
    const h = Math.max(2, p * (H - 50));
    const x = pad + i * bw + bw * 0.18, y = H - 30 - h;
    const ap = adjProb(k);
    let adj = '';
    if (ap !== null) {
      const ah = Math.max(2, ap * (H - 50));
      adj = `<rect x="${x + bw * 0.34}" y="${H - 30 - ah}" width="${bw * 0.30}" height="${ah}" rx="2" class="sbar adj"/>`;
    }
    bars += `<rect x="${x}" y="${y}" width="${bw * (ap !== null ? 0.30 : 0.64)}" height="${h}" rx="2" class="sbar ${ap !== null ? 'base' : ''}"/>${adj}
      <text x="${x + bw * 0.32}" y="${Math.min(y, ap !== null ? H - 30 - Math.max(2, ap * (H - 50)) : y) - 6}" class="sval">${ap !== null ? fmt(ap) : fmt(p)}%</text>
      <text x="${x + bw * 0.32}" y="${H - 12}" class="slab">${labels[i]}</text>`;
    pts.push([x + bw * 0.32, y]);
  });
  const line = `<polyline points="${pts.map(p => p.join(',')).join(' ')}" class="sline"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="survival">${bars}${line}</svg>`;
}

/* ---- exit profile (#10) ---- */
function exitProfileHTML(t) {
  if (!agg.runs) return '';
  const labels = ['Out in group', 'Out in R32', 'Out in R16', 'Out in QF', 'Out in SF', 'Lose final', 'Champions'];
  const ps = [];
  for (let k = 0; k < 6; k++) ps.push(agg.prob(t.id, k) - agg.prob(t.id, k + 1));
  ps.push(agg.prob(t.id, 6));
  const max = Math.max(...ps, 0.0001);
  const mode = ps.indexOf(Math.max(...ps));
  return `<div class="exit-profile">
    ${ps.map((p, i) => `
      <div class="ep-row ${i === mode ? 'mode' : ''}">
        <span class="ep-lbl">${labels[i]}</span>
        <span class="bar"><i style="width:${(p / max * 100).toFixed(1)}%"></i></span>
        <span class="ep-pct">${fmt(p)}%</span>
      </div>`).join('')}
  </div>`;
}

/* ---- qualification scenarios (#4) ---- */
function qualScenariosHTML(t) {
  const group = TEAMS.filter(x => x.group === t.group);
  const lockedG = LIVE?.locked?.group || {};
  const pairs = [];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const A = group[i], B = group[j];
    const lock = lockedG[`${A.id}|${B.id}`] || lockedG[`${B.id}|${A.id}`];
    pairs.push({ A, B, lock: lock ? (lockedG[`${A.id}|${B.id}`] || { gh: lock.ga, ga: lock.gh }) : null });
  }
  const open = pairs.filter(p => !p.lock);
  if (!open.length) return ''; // group finished
  const mine = open.filter(p => p.A.id === t.id || p.B.id === t.id);
  const others = open.filter(p => p.A.id !== t.id && p.B.id !== t.id);

  // enumerate every remaining result (hypothetical wins as 1–0)
  const byPts = {}; // own points from remaining games -> {top2, third, total}
  const outcomes = ['W', 'D', 'L'];
  const enumRec = (idx, results) => {
    if (idx === open.length) {
      const pts = {}, gd = {};
      group.forEach(x => { pts[x.id] = 0; gd[x.id] = 0; });
      for (const p of pairs) {
        let gh, ga;
        if (p.lock) ({ gh, ga } = p.lock);
        else {
          const r = results[open.indexOf(p)];
          [gh, ga] = r === 'W' ? [1, 0] : r === 'L' ? [0, 1] : [0, 0];
        }
        pts[p.A.id] += gh > ga ? 3 : gh === ga ? 1 : 0;
        pts[p.B.id] += ga > gh ? 3 : gh === ga ? 1 : 0;
        gd[p.A.id] += gh - ga; gd[p.B.id] += ga - gh;
      }
      const order = [...group].sort((a, b) =>
        pts[b.id] - pts[a.id] || gd[b.id] - gd[a.id] || effElo(b) - effElo(a));
      const rank = order.findIndex(x => x.id === t.id);
      let ownPts = 0;
      mine.forEach(p => {
        const r = results[open.indexOf(p)];
        const home = p.A.id === t.id;
        ownPts += r === 'D' ? 1 : (r === 'W') === home ? 3 : 0;
      });
      const key = ownPts;
      const slot = byPts[key] || (byPts[key] = { top2: 0, third: 0, total: 0 });
      slot.total++;
      if (rank <= 1) slot.top2++;
      else if (rank === 2) slot.third++;
      return;
    }
    for (const o of outcomes) { results[idx] = o; enumRec(idx + 1, results); }
  };
  enumRec(0, []);

  const lockedPts = (() => { // points already banked
    let pts = 0;
    pairs.filter(p => p.lock && (p.A.id === t.id || p.B.id === t.id)).forEach(p => {
      const home = p.A.id === t.id;
      const gf = home ? p.lock.gh : p.lock.ga, ga = home ? p.lock.ga : p.lock.gh;
      pts += gf > ga ? 3 : gf === ga ? 1 : 0;
    });
    return pts;
  })();

  const rows = Object.keys(byPts).map(Number).sort((a, b) => b - a).map(p => {
    const s = byPts[p];
    return `<div class="qs-row">
      <span class="qs-pts">${lockedPts + p} pts</span>
      <span class="qs-note">+${p} from ${mine.length} remaining</span>
      <span class="bar"><i class="win" style="width:${(s.top2 / s.total * 100).toFixed(0)}%"></i></span>
      <span class="qs-pct">${Math.round(s.top2 / s.total * 100)}% top two</span>
      <span class="qs-third">${s.third ? Math.round(s.third / s.total * 100) + '% third (best-third race)' : ''}</span>
    </div>`;
  }).join('');

  return `
    <h4>Qualification scenarios <span class="sub">every remaining group result enumerated — how ${t.name}'s final points convert</span></h4>
    ${rows}`;
}

/* ---- bracket trajectory (drawer) ---- */
function matchCard(t, m) {
  const home = m.a.id === t.id;
  const opp = home ? m.b : m.a;
  const gf = home ? m.ga : m.gb, ga = home ? m.gb : m.ga;
  const res = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
  return `<div class="bk-card ${res}">
    <span class="bk-res">${m.real ? '✓ ' : ''}${res}</span>
    <span class="bk-opp"><span class="flag">${opp.flag}</span>${opp.name}</span>
    <span class="bk-score">${gf}–${ga}${m.note ? `<em>${m.note.trim()}</em>` : ''}</span>
  </div>`;
}

function bracketHTML(t) {
  if (!currentRun) return '<p class="hint">Run the simulation first.</p>';
  const { log, champion } = currentRun;
  const mine = log.filter(m => m.a.id === t.id || m.b.id === t.id);
  const group = mine.filter(m => m.stage === 'group');
  const koKeys = ['r32', 'r16', 'qf', 'sf', 'final'];

  let cols = `<div class="bk-col"><h5>Group ${t.group}</h5>${group.map(m => matchCard(t, m)).join('')}</div>`;
  let alive = true;
  koKeys.forEach((key, i) => {
    const m = mine.find(x => x.stage === key);
    cols += `<div class="bk-col ${m ? '' : 'ghost'}">
      <h5>${KO_LABELS[i]}</h5>
      ${m ? matchCard(t, m)
          : `<div class="bk-card ghost"><span class="bk-ghost-pct">${fmt(agg.prob(t.id, i + 1))}%</span><span class="bk-ghost-lbl">odds of<br>getting here</span></div>`}
    </div>`;
    if (!m) alive = false;
  });
  const won = champion.id === t.id;
  cols += champCol(t, won);
  const last = mine[mine.length - 1];
  const note = won
    ? `🏆 ${t.name} win the World Cup in this universe.`
    : `Run ends: ${STAGE_LABELS[last.stage] || last.stage}.`;
  return `<div class="bracket">${cols}</div><p class="exit">${note}</p>`;
}

function champCol(t, isChamp) {
  return `<div class="bv-col ${isChamp ? 'champ' : 'ghost'} bk-col">
    <h5>World Champion</h5>
    ${isChamp
      ? `<div class="bk-card trophy">🏆<span class="bk-opp">${t.name}</span></div>`
      : `<div class="bk-card ghost"><span class="bk-ghost-pct">${fmt(agg.prob(t.id, 6))}%</span><span class="bk-ghost-lbl">odds of<br>the title</span></div>`}
  </div>`;
}

/* ---- deterministic most-likely-path (drawer) ---- */
const KO_LABELS = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

function probCard(opp, winProb, extra = '', real = null) {
  if (real) {
    const res = real.won ? 'W' : real.gh === real.ga ? 'D' : 'L';
    return `<div class="bk-card ${res} ${extra}">
      <span class="bk-res">✓ ${res}</span>
      <span class="bk-opp"><span class="flag">${opp.flag}</span>${opp.name}</span>
      <span class="bk-score">played</span>
    </div>`;
  }
  const pct = Math.round(winProb * 100);
  return `<div class="bk-card P ${winProb >= 0.5 ? 'W' : 'L'} ${extra}">
    <span class="bk-res">${pct}%</span>
    <span class="bk-opp"><span class="flag">${opp.flag}</span>${opp.name}</span>
    <span class="bk-score">${pct}% to win</span>
  </div>`;
}

function likelyBracketHTML(t) {
  const opts = { ...simOpts() };
  if (drawerEloDelta) opts.eloDelta = { [t.id]: drawerEloDelta };
  const { groupSteps, koSteps, qualNote } = deterministicPath(t, opts);

  let cols = `<div class="bk-col">
    <h5>Group ${t.group}</h5>
    ${groupSteps.map(s => s.real
      ? `<div class="bk-card ${s.real.gf > s.real.ga ? 'W' : s.real.gf === s.real.ga ? 'D' : 'L'}">
          <span class="bk-res">✓</span>
          <span class="bk-opp"><span class="flag">${s.opp.flag}</span>${s.opp.name}</span>
          <span class="bk-score">${s.real.gf}–${s.real.ga}</span>
        </div>`
      : probCard(s.opp, s.pW)).join('')}
    ${qualNote ? `<p class="bk-note">${qualNote}</p>` : ''}
  </div>`;

  let exited = false, exitStep = null, exitStage = null;
  koSteps.forEach((s, i) => {
    const lostForReal = s.real && !s.real.won;
    const isExit = !exited && (lostForReal || (!s.real && s.winProb < 0.5));
    if (isExit) { exited = true; exitStep = s; exitStage = KO_LABELS[i]; }
    cols += `<div class="bk-col ${exited && !isExit ? 'ghost' : ''}">
      <h5>${KO_LABELS[i]}</h5>
      ${probCard(s.opp, s.winProb, `${isExit ? 'exit-here' : ''} ${exited && !isExit ? 'dimmed' : ''}`, s.real)}
    </div>`;
  });

  const champ = !exited;
  cols += champCol(t, champ);
  const note = champ
    ? `🏆 ${t.name} are favourites in every projected round — most likely champions of this path.`
    : exitStep.real && !exitStep.real.won
      ? `Eliminated for real: ${exitStage} vs ${exitStep.opp.flag} ${exitStep.opp.name} (${exitStep.real.gh}–${exitStep.real.ga}).`
      : `Most likely exit: ${exitStage} vs ${exitStep.opp.flag} ${exitStep.opp.name} (${Math.round(exitStep.winProb * 100)}% to advance). Later rounds show who they'd face if they survive.`;
  return `<div class="bracket">${cols}</div><p class="exit">${note}</p>`;
}

/* ---- what-if Elo slider (#5) ---- */
let whatIfWorker = null, whatIfTimer = null;

function runWhatIf(t) {
  if (whatIfWorker) { whatIfWorker.terminate(); whatIfWorker = null; }
  if (!drawerEloDelta) { adjusted = null; refreshDrawerBody(t); return; }
  if (location.protocol === 'file:' || typeof Worker === 'undefined') {
    const local = createAggregator();
    local.run(10000, { ...simOpts(), eloDelta: { [t.id]: drawerEloDelta } });
    adjusted = local.snapshot();
    refreshDrawerBody(t);
    return;
  }
  whatIfWorker = new Worker('worker.js');
  whatIfWorker.onmessage = ev => {
    if (!ev.data.done) return;
    adjusted = ev.data;
    refreshDrawerBody(t);
  };
  whatIfWorker.postMessage({ n: 20000, opts: { ...simOpts(), eloDelta: { [t.id]: drawerEloDelta } } });
}

/* ---- drawer ---- */
function openDrawer(id) {
  if (!teamById[id]) return;
  selected = id;
  drawerEloDelta = 0; adjusted = null;
  currentRun = agg.runs ? simulateTournament(true, simOpts()) : null;
  history.replaceState(null, '', '#' + id);
  renderDrawer();
  renderTable();
  document.body.classList.add('drawer-open');
}

function closeDrawer() {
  selected = null;
  history.replaceState(null, '', location.pathname + location.search);
  document.body.classList.remove('drawer-open');
  renderTable();
}

function refreshDrawerBody(t) {
  const box = $('#bracket-box');
  if (box) box.innerHTML = drawerMode === 'likely' ? likelyBracketHTML(t) : bracketHTML(t);
  const sv = $('#survival-box');
  if (sv) sv.innerHTML = survivalSVG(t) + (adjusted
    ? `<p class="adj-legend"><span class="sw base"></span> baseline · <span class="sw adj"></span> with ${drawerEloDelta > 0 ? '+' : ''}${drawerEloDelta} Elo (20k-run what-if)</p>` : '');
}

function renderDrawer() {
  if (!selected) return;
  const t = teamById[selected];
  els.drawer.innerHTML = `
    <div class="drawer-handle" aria-hidden="true"></div>
    <div class="panel-head">
      <h2><span class="flag big">${t.flag}</span> ${t.name}</h2>
      <p class="meta">Group ${t.group} · Elo ${effElo(t)}${t.host ? ' · co-host (+' + HOST_BOOST + ')' : ''}</p>
      <button id="close-panel" aria-label="Close">×</button>
    </div>
    <div class="replay-head">
      <h4>${drawerMode === 'likely'
        ? 'Most likely path <span class="sub">deterministic — expected opponents and win odds each round</span>'
        : 'One simulated tournament <span class="sub">a single random universe — the bracket as it happened</span>'}</h4>
      <span class="mode-btns">
        <button id="mode-likely" class="btn small toggle ${drawerMode === 'likely' ? 'active' : ''}">Most likely path</button>
        <button id="mode-random" class="btn small toggle ${drawerMode === 'random' ? 'active' : ''}">${drawerMode === 'random' ? '↻ ' : ''}Random universe</button>
      </span>
    </div>
    <div id="bracket-box"></div>
    ${qualScenariosHTML(t)}
    <h4>Survival curve <span class="sub">probability of reaching each stage, ${agg.runs.toLocaleString()} simulations</span></h4>
    <div id="survival-box"></div>
    <h4>Where the run ends <span class="sub">share of simulated universes per exit stage — most common highlighted</span></h4>
    ${exitProfileHTML(t)}
    <h4>What if they were stronger? <span class="sub">drag to adjust ${t.name}'s Elo and re-simulate</span></h4>
    <div class="whatif">
      <input type="range" id="elo-delta" min="-150" max="150" step="10" value="${drawerEloDelta}">
      <span class="mono" id="elo-delta-val">${drawerEloDelta > 0 ? '+' : ''}${drawerEloDelta}</span>
    </div>
    <p class="whatif-note">Elo rates team strength from results history — +100 points roughly turns a coin-flip
    into a 64/36 favourite. Slide to imagine a stronger (or weaker) ${t.name}: a key player returning, a bad
    camp, altitude struggles. The orange bars re-run 20,000 tournaments at the adjusted rating; the grey bars
    keep today's rating. The likely path above adjusts too.</p>`;
  refreshDrawerBody(t);
  $('#close-panel').onclick = closeDrawer;
  $('#mode-likely').onclick = () => { drawerMode = 'likely'; renderDrawer(); };
  $('#mode-random').onclick = () => {
    currentRun = agg.runs ? simulateTournament(true, simOpts()) : null;
    drawerMode = 'random';
    renderDrawer();
  };
  $('#elo-delta').oninput = e => {
    drawerEloDelta = +e.target.value;
    $('#elo-delta-val').textContent = (drawerEloDelta > 0 ? '+' : '') + drawerEloDelta;
    clearTimeout(whatIfTimer);
    whatIfTimer = setTimeout(() => runWhatIf(t), 350);
  };
}

function renderAll() {
  renderTable(); renderGroups(); renderBracket(); renderH2H(); renderUpsets();
  if (selected) renderDrawer();
}

/* ---- simulation runs: worker pool, main-thread fallback ---- */
let pool = [];
let lastPaint = 0;

function startRun() {
  pool.forEach(w => w.terminate());
  pool = [];
  agg.runs = 0; agg.stage = {}; agg.meets = {};
  els.runBtn.disabled = true;
  els.counter.classList.remove('done');
  lastPaint = 0;
}

function paint(final) {
  els.counter.textContent = agg.runs.toLocaleString();
  const now = performance.now();
  if (final || now - lastPaint > 250) {
    lastPaint = now;
    renderTable(); renderGroups();
  }
  if (final) {
    els.runBtn.disabled = false;
    els.counter.classList.add('done');
    renderBracket(); renderH2H(); renderUpsets();
    maybeStoreBaseline();
    if (selected) {
      if (drawerMode === 'random') currentRun = simulateTournament(true, simOpts());
      renderDrawer();
    }
  }
}

function runSimulations(total) {
  if (location.protocol === 'file:' || typeof Worker === 'undefined') {
    return runOnMainThread(total);
  }
  startRun();
  const opts = simOpts();
  const nWorkers = total <= 10000 ? 1 : Math.min(navigator.hardwareConcurrency || 4, 8);
  const share = Math.ceil(total / nWorkers);
  const latest = [];
  let finished = 0;
  for (let i = 0; i < nWorkers; i++) {
    const w = new Worker('worker.js');
    w.onerror = () => {
      pool.forEach(x => x.terminate()); pool = [];
      runOnMainThread(total);
    };
    w.onmessage = ev => {
      latest[i] = ev.data;
      agg.runs = 0; agg.stage = {}; agg.meets = {};
      for (const snap of latest) {
        if (!snap) continue;
        agg.runs += snap.runs;
        for (const id in snap.stage) {
          const dst = agg.stage[id] || (agg.stage[id] = new Array(7).fill(0));
          snap.stage[id].forEach((v, k) => dst[k] += v);
        }
        for (const k in snap.meets) agg.meets[k] = (agg.meets[k] || 0) + snap.meets[k];
      }
      if (ev.data.done) finished++;
      paint(finished === nWorkers);
    };
    w.postMessage({ n: i === nWorkers - 1 ? total - share * (nWorkers - 1) : share, opts });
    pool.push(w);
  }
}

function runOnMainThread(total) {
  startRun();
  const opts = simOpts();
  const local = createAggregator();
  const tick = () => {
    local.run(Math.min(1000, total - local.runs), opts);
    const snap = local.snapshot();
    agg.runs = snap.runs; agg.stage = snap.stage; agg.meets = snap.meets;
    paint(local.runs >= total);
    if (local.runs < total) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---- pre-tournament baseline for delta arrows (#8) ---- */
const BASELINE_KEY = 'wc26-baseline-v1';

function maybeStoreBaseline() {
  if (LIVE?.played) return; // only an unconditioned run can be the baseline
  if (agg.runs < 50000) return;
  baseline = Object.fromEntries(TEAMS.map(t => [t.id, agg.prob(t.id, 6)]));
  try { localStorage.setItem(BASELINE_KEY, JSON.stringify(baseline)); } catch {}
}

try { baseline = JSON.parse(localStorage.getItem(BASELINE_KEY)); } catch {}

/* ---- live feed (#1) ---- */
async function refreshLive(rerun) {
  try {
    const next = await fetchLiveResults();
    const changed = !LIVE || next.played !== LIVE.played
      || JSON.stringify(next.locked) !== JSON.stringify(LIVE.locked);
    LIVE = next;
    const when = new Date(next.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    els.liveStatus.innerHTML = next.played
      ? `<span class="live-dot on"></span>live: <strong>${next.played}/${next.total}</strong> matches locked in · ${when}`
      : `<span class="live-dot on"></span>live feed connected · awaiting kickoff · ${when}`;
    if (changed && rerun) runSimulations(+els.simCount.value);
  } catch {
    els.liveStatus.innerHTML = `<span class="live-dot"></span>live feed unavailable — showing pre-tournament odds`;
  }
}

/* ---- events ---- */
els.runBtn.addEventListener('click', () => runSimulations(+els.simCount.value));
els.momentum.addEventListener('change', () => runSimulations(+els.simCount.value));

document.addEventListener('click', e => {
  const row = e.target.closest('[data-team]');
  if (row) openDrawer(row.dataset.team);
});
els.scrim.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && selected) closeDrawer(); });
window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (id && teamById[id]) openDrawer(id);
});

/* ---- boot ---- */
renderAll();
(async () => {
  await refreshLive(false);            // condition the first run if data exists
  runSimulations(+els.simCount.value);
  setInterval(() => refreshLive(true), 5 * 60 * 1000); // re-fetch + re-sim every 5 min
  const id = location.hash.slice(1);
  if (id && teamById[id]) openDrawer(id);
})();

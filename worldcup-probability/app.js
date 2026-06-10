/* UI: run sims in chunks, render almanac table, group cards,
   and a bottom drawer with survival curve + bracket trajectory. */

const $ = sel => document.querySelector(sel);
const els = {
  runBtn: $('#run'),
  simCount: $('#sim-count'),
  counter: $('#counter'),
  table: $('#prob-table tbody'),
  groups: $('#groups'),
  drawer: $('#drawer'),
  scrim: $('#drawer-scrim'),
};

let agg = createAggregator();
let selected = null;
let currentRun = null;       // one simulated tournament, kept stable while drawer open
let drawerMode = 'likely';   // 'likely' (deterministic) | 'random' (one universe)

const fmt = p => p >= 0.995 ? '>99' : p < 0.005 ? (p === 0 ? '—' : '<1') : Math.round(p * 100);

function heatCell(p) {
  const pct = fmt(p);
  const alpha = Math.pow(p, 0.7);
  return `<td class="num"><span class="heat" style="--a:${alpha.toFixed(3)}">${pct}</span></td>`;
}

/* ---- main table ---- */
function renderTable() {
  const rows = [...TEAMS].sort((a, b) => agg.prob(b.id, 6) - agg.prob(a.id, 6) || effElo(b) - effElo(a));
  els.table.innerHTML = rows.map((t, i) => `
    <tr data-team="${t.id}" class="${selected === t.id ? 'selected' : ''}">
      <td class="num rank">${i + 1}</td>
      <td class="team"><span class="flag">${t.flag}</span>${t.name}<span class="grp">${t.group}</span></td>
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

/* ---- survival curve ---- */
function survivalSVG(t) {
  const stages = [1, 2, 3, 4, 5, 6];
  const labels = ['R32', 'R16', 'QF', 'SF', 'Final', 'Champ'];
  const W = 560, H = 170, pad = 28, bw = (W - pad * 2) / stages.length;
  let bars = '';
  const pts = [];
  stages.forEach((k, i) => {
    const p = agg.prob(t.id, k);
    const h = Math.max(2, p * (H - 50));
    const x = pad + i * bw + bw * 0.18, y = H - 30 - h;
    bars += `<rect x="${x}" y="${y}" width="${bw * 0.64}" height="${h}" rx="2" class="sbar"/>
      <text x="${x + bw * 0.32}" y="${y - 6}" class="sval">${fmt(p)}%</text>
      <text x="${x + bw * 0.32}" y="${H - 12}" class="slab">${labels[i]}</text>`;
    pts.push([x + bw * 0.32, y]);
  });
  const line = `<polyline points="${pts.map(p => p.join(',')).join(' ')}" class="sline"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="survival">${bars}${line}</svg>`;
}

/* ---- bracket trajectory ---- */
function matchCard(t, m) {
  const home = m.a.id === t.id;
  const opp = home ? m.b : m.a;
  const gf = home ? m.ga : m.gb, ga = home ? m.gb : m.ga;
  const res = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
  return `<div class="bk-card ${res}">
    <span class="bk-res">${res}</span>
    <span class="bk-opp"><span class="flag">${opp.flag}</span>${opp.name}</span>
    <span class="bk-score">${gf}–${ga}${m.note ? `<em>${m.note.trim()}</em>` : ''}</span>
  </div>`;
}

function bracketHTML(t) {
  if (!currentRun) return '<p class="hint">Run the simulation first.</p>';
  const { log, champion } = currentRun;
  const mine = log.filter(m => m.a.id === t.id || m.b.id === t.id);
  const group = mine.filter(m => m.stage === 'group');
  const koStages = [
    { key: 'r32', label: 'Round of 32', k: 1 },
    { key: 'r16', label: 'Round of 16', k: 2 },
    { key: 'qf',  label: 'Quarter-final', k: 3 },
    { key: 'sf',  label: 'Semi-final', k: 4 },
    { key: 'final', label: 'Final', k: 5 },
  ];

  let cols = `<div class="bk-col">
    <h5>Group ${t.group}</h5>
    ${group.map(m => matchCard(t, m)).join('')}
  </div>`;

  let alive = true;
  for (const s of koStages) {
    const m = mine.find(x => x.stage === s.key);
    cols += `<div class="bk-col ${m ? '' : 'ghost'}">
      <h5>${s.label}</h5>
      ${m ? matchCard(t, m)
          : `<div class="bk-card ghost"><span class="bk-ghost-pct">${fmt(agg.prob(t.id, s.k))}%</span><span class="bk-ghost-lbl">odds of<br>getting here</span></div>`}
    </div>`;
    if (!m) alive = false;
  }

  const won = champion.id === t.id;
  cols += `<div class="bk-col ${won ? 'champ' : 'ghost'}">
    <h5>World Champion</h5>
    ${won
      ? `<div class="bk-card trophy">🏆<span class="bk-opp">${t.name}</span></div>`
      : `<div class="bk-card ghost"><span class="bk-ghost-pct">${fmt(agg.prob(t.id, 6))}%</span><span class="bk-ghost-lbl">odds of<br>the title</span></div>`}
  </div>`;

  const last = mine[mine.length - 1];
  const exitNote = won
    ? `🏆 ${t.name} win the World Cup in this universe.`
    : `Run ends: ${STAGE_LABELS[last.stage] || last.stage}.`;
  return `<div class="bracket">${cols}</div><p class="exit">${exitNote}</p>`;
}

/* ---- deterministic most-likely-path bracket ---- */
const KO_LABELS = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

function probCard(opp, winProb, extra = '') {
  const pct = Math.round(winProb * 100);
  const cls = winProb >= 0.5 ? 'W' : 'L';
  return `<div class="bk-card P ${cls} ${extra}">
    <span class="bk-res">${pct}%</span>
    <span class="bk-opp"><span class="flag">${opp.flag}</span>${opp.name}</span>
    <span class="bk-score">${pct}% to win</span>
  </div>`;
}

function likelyBracketHTML(t) {
  const { groupSteps, koSteps, qualNote } = deterministicPath(t);

  let cols = `<div class="bk-col">
    <h5>Group ${t.group}</h5>
    ${groupSteps.map(s => probCard(s.opp, s.pW)).join('')}
    ${qualNote ? `<p class="bk-note">${qualNote}</p>` : ''}
  </div>`;

  let exited = false, exitStep = null, exitStage = null;
  koSteps.forEach((s, i) => {
    const isExit = !exited && s.winProb < 0.5;
    if (isExit) { exited = true; exitStep = s; exitStage = KO_LABELS[i]; }
    cols += `<div class="bk-col ${exited && !isExit ? 'ghost' : ''}">
      <h5>${KO_LABELS[i]}</h5>
      ${probCard(s.opp, s.winProb, `${isExit ? 'exit-here' : ''} ${exited && !isExit ? 'dimmed' : ''}`)}
    </div>`;
  });

  const champ = !exited;
  cols += `<div class="bk-col ${champ ? 'champ' : 'ghost'}">
    <h5>World Champion</h5>
    ${champ
      ? `<div class="bk-card trophy">🏆<span class="bk-opp">${t.name}</span></div>`
      : `<div class="bk-card ghost"><span class="bk-ghost-pct">${fmt(agg.prob(t.id, 6))}%</span><span class="bk-ghost-lbl">odds of<br>the title</span></div>`}
  </div>`;

  const note = champ
    ? `🏆 ${t.name} are favourites in every projected round — most likely champions of this path.`
    : `Most likely exit: ${exitStage} vs ${exitStep.opp.flag} ${exitStep.opp.name} (${Math.round(exitStep.winProb * 100)}% to advance). Later rounds show who they'd face if they survive.`;
  return `<div class="bracket">${cols}</div><p class="exit">${note}</p>`;
}

/* ---- drawer ---- */
function openDrawer(id) {
  selected = id;
  currentRun = agg.runs ? simulateTournament(true) : null;
  renderDrawer();
  renderTable();
  document.body.classList.add('drawer-open');
}

function closeDrawer() {
  selected = null;
  document.body.classList.remove('drawer-open');
  renderTable();
}

function renderDrawer() {
  if (!selected) return;
  const t = TEAMS.find(x => x.id === selected);
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
    <div id="bracket-box">${drawerMode === 'likely' ? likelyBracketHTML(t) : bracketHTML(t)}</div>
    <h4>Survival curve <span class="sub">probability of reaching each stage, ${agg.runs.toLocaleString()} simulations</span></h4>
    ${survivalSVG(t)}`;
  $('#close-panel').onclick = closeDrawer;
  $('#mode-likely').onclick = () => { drawerMode = 'likely'; renderDrawer(); };
  $('#mode-random').onclick = () => {
    currentRun = agg.runs ? simulateTournament(true) : null; // re-roll on every click
    drawerMode = 'random';
    renderDrawer();
  };
}

function renderAll() { renderTable(); renderGroups(); if (selected) renderDrawer(); }

/* ---- chunked run loop ---- */
function runSimulations(total) {
  agg = createAggregator();
  els.runBtn.disabled = true;
  const chunk = 250;
  const tick = () => {
    agg.run(Math.min(chunk, total - agg.runs));
    els.counter.textContent = agg.runs.toLocaleString();
    if (agg.runs % 2000 === 0 || agg.runs >= total) { renderTable(); renderGroups(); }
    if (agg.runs < total) requestAnimationFrame(tick);
    else {
      els.runBtn.disabled = false;
      els.counter.classList.add('done');
      if (selected) { currentRun = simulateTournament(true); renderDrawer(); }
    }
  };
  els.counter.classList.remove('done');
  requestAnimationFrame(tick);
}

els.runBtn.addEventListener('click', () => runSimulations(+els.simCount.value));

document.addEventListener('click', e => {
  const row = e.target.closest('[data-team]');
  if (row) openDrawer(row.dataset.team);
});
els.scrim.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && selected) closeDrawer(); });

renderAll();
runSimulations(10000);

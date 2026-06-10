/* UI: run sims in chunks, render almanac table, group cards,
   team trajectory panel with survival funnel + one-shot replay. */

const $ = sel => document.querySelector(sel);
const els = {
  runBtn: $('#run'),
  simCount: $('#sim-count'),
  counter: $('#counter'),
  table: $('#prob-table tbody'),
  groups: $('#groups'),
  panel: $('#team-panel'),
};

let agg = createAggregator();
let selected = null;

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

/* ---- team trajectory panel ---- */
function survivalSVG(t) {
  const stages = [1, 2, 3, 4, 5, 6];
  const labels = ['R32', 'R16', 'QF', 'SF', 'Final', 'Champ'];
  const W = 560, H = 180, pad = 28, bw = (W - pad * 2) / stages.length;
  let bars = '', line = '';
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
  line = `<polyline points="${pts.map(p => p.join(',')).join(' ')}" class="sline"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="survival">${bars}${line}</svg>`;
}

function replayHTML(t) {
  const { log, champion } = simulateTournament(true);
  const mine = log.filter(m => m.a.id === t.id || m.b.id === t.id);
  const rows = mine.map(m => {
    const home = m.a.id === t.id;
    const opp = home ? m.b : m.a;
    const gf = home ? m.ga : m.gb, ga = home ? m.gb : m.ga;
    const res = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
    return `<div class="replay-row ${res}">
      <span class="rstage">${STAGE_LABELS[m.stage] || m.stage}</span>
      <span class="rres">${res}</span>
      <span class="rscore">${gf}–${ga}<em>${m.note}</em></span>
      <span class="ropp">${opp.flag} ${opp.name}</span>
    </div>`;
  }).join('');
  const last = mine[mine.length - 1];
  const won = champion.id === t.id;
  const exitNote = won
    ? `🏆 ${t.name} win the World Cup in this universe.`
    : `Run ends: ${STAGE_LABELS[last.stage] || last.stage}.`;
  return `<div class="replay">${rows}<p class="exit">${exitNote}</p></div>`;
}

function renderPanel() {
  if (!selected) { els.panel.innerHTML = ''; els.panel.classList.remove('open'); return; }
  const t = TEAMS.find(x => x.id === selected);
  els.panel.classList.add('open');
  els.panel.innerHTML = `
    <div class="panel-head">
      <h2><span class="flag big">${t.flag}</span> ${t.name}</h2>
      <p class="meta">Group ${t.group} · Elo ${effElo(t)}${t.host ? ' · co-host (+' + HOST_BOOST + ')' : ''}</p>
      <button id="close-panel" aria-label="Close">×</button>
    </div>
    <h4>Survival curve <span class="sub">probability of reaching each stage, ${agg.runs.toLocaleString()} simulations</span></h4>
    ${survivalSVG(t)}
    <div class="replay-head">
      <h4>One simulated tournament <span class="sub">a single random universe</span></h4>
      <button id="resim" class="btn small">↻ Simulate again</button>
    </div>
    <div id="replay-box">${agg.runs ? replayHTML(t) : '<p class="hint">Run the simulation first.</p>'}</div>`;
  $('#close-panel').onclick = () => { selected = null; renderAll(); };
  $('#resim').onclick = () => { $('#replay-box').innerHTML = replayHTML(t); };
  els.panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderAll() { renderTable(); renderGroups(); renderPanel(); }

/* ---- chunked run loop ---- */
function runSimulations(total) {
  agg = createAggregator();
  els.runBtn.disabled = true;
  const chunk = 250;
  const tick = () => {
    agg.run(Math.min(chunk, total - agg.runs));
    els.counter.textContent = agg.runs.toLocaleString();
    if (agg.runs % 2000 === 0 || agg.runs >= total) renderAll();
    if (agg.runs < total) requestAnimationFrame(tick);
    else { els.runBtn.disabled = false; els.counter.classList.add('done'); }
  };
  els.counter.classList.remove('done');
  requestAnimationFrame(tick);
}

els.runBtn.addEventListener('click', () => runSimulations(+els.simCount.value));

document.addEventListener('click', e => {
  const row = e.target.closest('[data-team]');
  if (!row) return;
  selected = row.dataset.team;
  renderAll();
});

renderAll();
runSimulations(10000);

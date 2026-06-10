# worldcup-probability

**World Cup probability** — an Elo + Monte Carlo simulator for the 2026 FIFA World Cup. 48 teams, 12 groups, the new round-of-32 format, up to a million simulated tournaments running across your CPU cores. No build step, no backend, no API keys.

## What it does

- **Live during the tournament**: polls FIFA's public match feed every five minutes. Finished matches are locked into every simulation, real knockout pairings override simulated standings, and title odds show movement vs the pre-tournament baseline (▲▼ in the table).
- **The full roster** — heat-mapped probability of reaching every stage for all 48 teams, from 1k to 1,000,000 simulations (Web Worker pool, one per core).
- **The projected bracket** — favorite-wins walk through the whole tree, with each projected winner's odds; real results tick in with ✓.
- **Head to head** — any two teams: single-match W/D/L odds plus how often they actually meet in simulated tournaments.
- **The upset index** — upcoming ties ranked by the underdog's outright win odds.
- **Team drawer** (click any team, or deep-link with `#POR`):
  - *Most likely path* — deterministic: expected group finish, projected opponents and win odds each round, most likely exit highlighted.
  - *Random universe* — one simulated tournament with real scorelines.
  - *Qualification scenarios* — every remaining group result enumerated: how final points convert to top-two or the best-third race.
  - *Survival curve* and *where the run ends* (exit-stage distribution).
  - *What-if slider* — drag the team's Elo ±150 and re-simulate 20k tournaments against the baseline.
- **Momentum mode** — optional in-tournament Elo updates (K=50): winners gather steam within each simulated tournament.

## The model

1. **Win expectancy** from Elo: `We = 1 / (1 + 10^(−ΔElo/400))`, June 2026 [eloratings.net](https://www.eloratings.net) snapshot, co-hosts +50.
2. **Goals, not coin flips**: each match draws scores from two Poisson distributions whose means split a 2.7-goal match by Elo odds — so W/D/L, goal difference, and group tiebreaks all fall out of the same dice.
3. **Knockouts**: extra time (means ÷ 3), then a shootout with a mild Elo lean.
4. **Best thirds**: ranked, then backtrack-assigned to the round-of-32 slots respecting FIFA's group-pool constraints.
5. **Deterministic views** (likely path, bracket, upsets) use exact Poisson W/D/L probabilities — no sampling noise.

## Run it

Open `index.html` in a browser (or serve the folder — workers and the live feed prefer http).

## Files

| File | What |
|---|---|
| `data.js` | 48 teams, Elo snapshot, groups, full bracket structure |
| `sim.js` | match model, tournament engine, deterministic projections, aggregator |
| `live.js` | FIFA public feed → locked results/pairings |
| `worker.js` | off-thread simulation runner |
| `app.js` | worker pool, live conditioning, all views |
| `style.css` | Amplified Creations house style |

MIT, like everything in this repo.

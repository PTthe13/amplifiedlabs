# worldcup-probability

**The Probability Almanac** — an Elo + Monte Carlo simulator for the 2026 FIFA World Cup. 48 teams, 12 groups, the new round-of-32 format, and 10,000 simulated tournaments running entirely in your browser. No APIs, no build step.

## What it does

- Simulates the full tournament match by match: group round-robins, best-third allocation, and the complete knockout bracket through the final.
- Aggregates every run into per-team probabilities of reaching each stage (R32 → R16 → QF → SF → Final → Champion), rendered as a heat-mapped almanac table.
- Click any team for its **trajectory** in a bottom drawer: a bracket view with two modes — **Most likely path** (deterministic: expected group finish, projected opponents and win odds each round, likely exit highlighted) and **Random universe** (one simulated tournament with real scorelines) — plus a survival curve across stages.
- Choose 1k / 10k / 50k simulations; the universe counter ticks live while it runs.

## The model

1. **Win expectancy** from Elo: `We = 1 / (1 + 10^(−ΔElo/400))`, using a June 2026 [eloratings.net](https://www.eloratings.net) snapshot. Co-hosts (MEX/USA/CAN) get +50.
2. **Goals**, not coin flips: each match draws scores from two Poisson distributions whose means split a 2.7-goal match by Elo odds. Wins, draws and goal difference all fall out of the same dice — so group tiebreaks (points → GD → GF → lots) work naturally.
3. **Knockouts**: drawn matches go to extra time (means ÷ 3), then a shootout with a mild Elo lean (55/45 at most).
4. **Best thirds**: the 8 best third-placed teams are ranked, then backtrack-assigned to the round-of-32 slots respecting FIFA's group-pool constraints per match.

Groups follow the Final Draw (Washington D.C., Dec 2025) plus the March 2026 playoff winners. Elo ratings are static within a simulation — no in-tournament rating updates.

## Run it

Open `index.html` in a browser. That's it.

## Files

| File | What |
|---|---|
| `data.js` | 48 teams, Elo snapshot, groups, full bracket structure |
| `sim.js` | match model + tournament engine + aggregator |
| `app.js` | chunked sim loop, table/groups/trajectory rendering |
| `style.css` | Amplified Creations house style — paper, white cards, brand orange, Instrument Serif accents |

MIT, like everything in this repo.

# Jofit

Editorial-dark preview of a fitness & wellness coach. A single-page mock of the daily Jofit screen: water intake, energy balance, training load, a 7-day intake-vs-burn chart, and a tiered ML suggestion card sourced from clinical literature.

Pure HTML + inline CSS + ~30 lines of JS. No build, no framework, no keys.

## What it shows

- **Hydration** — 8-glass tracker, click to log
- **Energy balance** — kcal in/out with deficit goal
- **Training** — today's session checklist
- **7-day chart** — intake vs burn, hand-rolled SVG
- **JAI nudge** — 4 swappable suggestions, each tagged URGENTE / IMP / AVALIAR / VIGIAR and linked to its source paper
- **Supplement stack** — derived from a sample blood panel, ranked by urgency tier

## Why

The real app is a Next.js PWA with Drizzle, Recharts, OCR for lab uploads, and a small ranker that scores candidate interventions on evidence weight × personal delta × adherence cost. This preview strips all that out — just the visual language so anyone can open it in a browser and read the design system.

## Run

```sh
open index.html
```

That's it. Works offline. Click glasses to log water, click 01/02/03/04 to swap the nudge.

## Stack on the preview

HTML · CSS custom properties · inline SVG · vanilla JS · Inter / Inter Tight from Google Fonts

## Disclaimer

Not medical advice. Numbers are illustrative.

## Featured on

https://amplifiedcreations.com/lab/jofit · live demo at https://ptthe13.github.io/amplifiedlabs/jofit/

# Colour System Generator

Drop in one brand hex. Get an 11-step scale (50–950), semantic tokens (success / warning / danger / info), dark-mode pairing, and copy-paste output for **CSS custom properties**, **Tailwind config**, **SCSS variables**, and **Figma Tokens Studio JSON**.

Single-file. No build step. Works offline.

## Why

Designers re-derive the same colour scale from a brand hex on every new project. The arithmetic is mechanical — `chroma.js`, Tailwind's `colors`, Material's `palette` — but the surface area to copy between them is annoying. This tool runs the maths once and dumps every format you'd reasonably hand to a developer.

## How

- HSL space, with lightness anchored to perceptually-even targets (97 → 10) across the 11 steps
- Saturation gently dampened at the extremes so the lightest tints and deepest shades don't read fluorescent
- Semantic tokens derived from hue rotations around your brand colour (configurable hue spread)
- Light + dark surface pairings auto-mapped to scale steps

## Run

```sh
# It's static HTML. Just open it.
open index.html
```

## Featured on

https://amplifiedcreations.com/lab/colour-system-generator

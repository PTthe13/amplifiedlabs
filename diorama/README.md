# Diorama

An isometric cutaway room, rendered in real time and yours to rearrange.

Drag furniture across a snap grid, recolour any piece from a palette, re-skin the
walls (paint or wood slats), swap the floor tone and rug, flick the lamps, or
change the whole mood with a one-click theme. Everything is procedural — no
model files, no textures on disk, no build step. Your layout persists in
`localStorage`.

**Live:** https://ptthe13.github.io/amplifiedlabs/diorama/

## Controls

| Action | How |
|---|---|
| Move a piece | Click it, drag on the floor (snaps to a 0.5-unit grid) |
| Rotate | Select, press **R** (or the Rotate button) — 45° steps |
| Remove | Select, press **Del** (or Remove) |
| Recolour | Select a piece → tap a swatch |
| Duplicate | Select → Duplicate |
| Walls / floor / rug | Swatch rows in the dock; **Slats** toggles the wood skin |
| Whole-room moods | Studio · Warm · Cool |
| Orbit | Drag empty space (azimuth is clamped so the cutaway stays open) |

## How it's built

- **Three.js** (`0.161`, via CDN importmap) — orthographic camera at an
  isometric angle for that clean dollhouse cutaway.
- **Procedural furniture** — every sofa, shelf and chair is composed from
  `RoundedBoxGeometry` primitives in [`catalog.js`](./catalog.js), each tagged
  with a footprint and its recolourable materials.
- **Lighting** — a warm key `DirectionalLight` with 2k PCF-soft shadows, a cool
  hemisphere/fill pair, and a per-lamp `PointLight` that moves with the piece.
- **Post** — `EffectComposer` chain: bloom for the glowing screens and lamp
  shade, an `OutlinePass` for the orange selection edge, `OutputPass` for ACES
  tone mapping.
- **Textures** — floor planks and the rug are drawn to a `<canvas>` at runtime,
  so tones and patterns are generated, never loaded.

## Files

```
index.html   markup, importmap, control dock
app.js       scene, camera, lights, post, drag/selection, UI, persistence
catalog.js   procedural furniture factories + default layout
style.css    dock + overlay UI
```

## Running

Static. Open `index.html` over any local server (ES modules need `http://`, not
`file://`):

```bash
python3 -m http.server
# → http://localhost:8000/diorama/
```

## License

MIT.

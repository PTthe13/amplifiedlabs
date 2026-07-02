# Resonance

A real-time WebGL2 experience in three scenes, each of which periodically dissolves into the **amplified®** wordmark:

1. **Dreamscape** — a raymarched gyroid field you fly through, iridescent with an orange core bloom. Cursor steers; it drifts on its own.
2. **Field** — ~340,000 GPU particles driven by curl-noise flow. Every ~15s the storm reassembles into the wordmark, holds, then scatters. Drag to repel, hover to attract.
3. **Nebula** — an audio-reactive particle cloud. A built-in procedural synth (five generative tracks) or your microphone drives radius, size and colour; strong beats flash the wordmark.

All GPU. No build step, no textures, no external assets. Three.js via importmap, raw GLSL, Web Audio API.

## Why the audio is synthesised, not streamed

The five "tracks" are generated live in the browser with the Web Audio API — oscillators, envelopes, a convolver reverb, a small step sequencer. No MP3s, no third-party CDN, no licensing, nothing to rot. The visuals react to the exact signal we produce (via an `AnalyserNode`). Hit **MIC** to drive the nebula with live sound instead.

## Run

Static. Serve the folder and open it (ES modules need http, not `file://`):

```sh
npx serve .      # or: python3 -m http.server
```

Then open the printed URL. Needs a WebGL2 browser (any recent Chrome, Safari, Firefox, Edge).

## Files

| File | What |
|---|---|
| `index.html` | Structure, importmap, HUD |
| `style.css` | Dark glass UI, brand orange |
| `app.js` | Three.js orchestrator, the three scenes, all GLSL, wordmark sampling |
| `audio.js` | Procedural five-track synth + analyser + mic |

## Controls

- **Dreamscape / Field / Nebula** — switch scene
- **AUTO** — cycle the scenes hands-free (~16s each)
- **▶ / ❚❚ · track · MIC** — nebula audio (appears in the Nebula scene)
- Move / drag anywhere to steer

Part of [Amplified Labs](https://github.com/PTthe13/amplifiedlabs). MIT.

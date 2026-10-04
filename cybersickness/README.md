# cybersickness — Queasy Street

A test bench for cybersickness. You stand on a quiet street at an index of zero, then change one condition at a time and find what breaks it: camera motion, a car reversing beside you, sound, eye height, frame rate, head-tracking delay, a slow 0.2 Hz sway, and more. Each condition links to its source.

Runs in any browser; a WebXR headset can enter VR, where the comfort aids (vignette, virtual nose, horizon ring) are drawn in 3D and the controller trigger moves you.

## What you can do

- **Break the zero.** 16 conditions. Points for what makes people sick, a percentage off for what helps (it never goes below zero).
- **Tell it how you feel.** Rate yourself on the Misery Scale (MISC, 0–10) as you go. Your answers are drawn in orange on the chart next to the estimate. From 6 up, the page tells you to stop.
- **Profile yourself.** The nine-item MSSQ-short scales the index to your own motion-sickness history, using Golding's published percentiles.
- **Finish and get tips.** A short report: how long you stayed, the peaks, what was driving them, and evidence-based tips for real VR.
- **Presets.** Back to zero, a comfort recipe (everything the evidence says helps), and a worst case.

## How the index works

`index = (sum of points) × (1 − each help) × profile × time`

The research gives the direction of each effect and roughly how strong it is, not numbers that add up, so the weights are ours: large where the evidence is strong, small where it is weak. Sickness grows with time in a headset (Kennedy et al., 2000), so the index rises 3% a minute up to +60%; it eases up and down at the same pace, because recovery mirrors build-up (Bos et al., 2005). It is a teaching model, not a medical measure.

Sudden loud noise is the one condition with no study behind it; its weight is a placeholder, and the page says so.

The full source list is on the page under *All sources*. The key ones: So et al. 2001 (speed), Farmani & Teather 2020 (snap turning), Stanney & Hash 1998 (user control), Hettinger et al. 1990 and Keshavarz et al. 2015 (vection), Keshavarz & Hecht 2014 (pleasant music), Fernandes & Feiner 2016 (field-of-view restriction), Wang et al. 2023 (frame rate), Stauffert et al. 2020 (latency), Cao et al. 2018 (rest frames), Golding et al. 2001 (0.2 Hz), Kennedy et al. 2000 (exposure), Golding 2006 (MSSQ-short), Bos et al. 2005 (MISC).

## How it's built

Three.js r161 from a CDN via an import map, no build step. The street is generated from a seed and repeats every 200 m around you; buildings, trees and cars are instanced, so the scene stays around 100 draw calls and runs on ordinary laptops. Quality steps down on its own if the frame rate drops below ~48 fps. Sound is synthesised with the Web Audio API: a city bed, a beach for the "wrong scene", an engine placed with an HRTF panner (mirrored for the "mirrored L/R" condition), a generated chord loop for "pleasant music", and the occasional horn.

Serve the folder over HTTP and open `index.html`.

## Credits

- Buildings, cars, trees and people: [Kenney](https://kenney.nl) — City Kit (Commercial), Car Kit, Nature Kit, Mini Characters. CC0.
- The jeep you drive: "Car" by jeremy, [Poly Pizza](https://poly.pizza/m/bTcqWpYqeeM). CC-BY 3.0.
- Made by [amplified®](https://amplifiedcreations.com).

## Licence

Code MIT. Models under their own licences above.

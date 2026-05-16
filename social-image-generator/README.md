# Social Image Generator

A browser-based studio that generates ready-to-download social media posts — 1:1 and 9:16 — for a travel agency. Fill in a few fields, pick a layout, drop a photo, download PNG.

Single-file. No build step. Works offline.

## Why

Small travel-agency teams need to ship Instagram and Facebook posts every week and don't want to open Figma or Canva for every variation. The compositions are repetitive — same destination card, same price tag, same brand mark — but the surface area to keep on-brand across feed and stories is annoying. This tool runs the layout decisions once and exports both formats as PNG.

## How

- React 18 loaded from CDN, Babel Standalone for JSX, html2canvas for PNG export
- 5 layout compositions (full-bleed photo, panel, postcard, editorial, inset card)
- 3 visual directions, each with its own colour system
- 3 type treatments (italic editorial serif, modern sans, display uppercase)
- All content fields optional — empty fields disappear from the output
- Exports 1080×1080 (feed) and 1080×1920 (stories/reels)
- `box-shadow` on a rotated element renders incorrectly in html2canvas; swapped to `filter: drop-shadow()` so the capture matches the preview

## Run

```sh
# It's static HTML. Just open it.
open index.html
```

## Featured on

https://amplifiedcreations.com/lab/social-image-generator

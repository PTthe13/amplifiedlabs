# Amplified Labs

Open-source demos, experiments and tools by [Amplified Creations](https://amplifiedcreations.com).

Each folder is a self-contained piece — generative art, shaders, utility scripts, or proofs of concept we ran internally and decided to share. Some are featured on [amplifiedcreations.com/lab](https://amplifiedcreations.com/lab).

## Demos

| Folder | Description | Stack |
|---|---|---|
| [`brand-colour-pipeline-tester`](./brand-colour-pipeline-tester) | A tiny WebGL viewer that shows a single hero colour rendered under three light conditions side-by-side. Drop in a hex, see if it survives Lisbon overcast. | WebGL · Three.js · GLSL · Vue 3 |
| [`matterport-tour-audit`](./matterport-tour-audit) | A small Node script that crawls a Matterport tour and flags common quality issues: unreachable rooms, missing hotspots, broken transitions. | Node.js · Matterport SDK · TypeScript |
| [`php-image-proxy-webp`](./php-image-proxy-webp) | A 30-line PHP proxy that fetches images from a headless CMS, negotiates WebP via Accept header, and caches them with 30-day immutable headers. | PHP · cURL · WebP |
| [`generative-svg-covers`](./generative-svg-covers) | Server-side generative SVG cover images. Deterministic geometry from a slug + crc32. No designer, no upload, no asset pipeline. | PHP · SVG · crc32 · Cache-Control |
| [`static-php-i18n-ovh`](./static-php-i18n-ovh) | An i18n stack that works on cheap shared hosting where mod_rewrite QSA breaks: URL path parsing in PHP + a JS link-rewriter at boot. No frameworks, no build step. | PHP · JavaScript · Apache · Cockpit CMS |
| [`canvas-demos`](./canvas-demos) | Inline canvas generative pieces: orbital trace, flow field, Truchet tiles. Pure browser, no framework. | Canvas 2D · requestAnimationFrame · JavaScript |
| [`colour-system-generator`](./colour-system-generator) | Single brand hex → 11-step scale, semantic tokens, dark-mode pairing, CSS / Tailwind / SCSS / Figma Tokens output. | HTML · JS · HSL |
| [`responsive-type-scale`](./responsive-type-scale) | Fluid modular type scale using CSS `clamp()`. Pick base + ratio, get h1–h6 + body ladder. | HTML · CSS · clamp() |
| [`webxr-lost-room`](./webxr-lost-room) | A small 3D room that exists between dimensions — floating orbs, glowing obelisk, orbital ring, drift fog. Inline 3D for any browser, headset opt-in via WebXR. | Three.js · WebXR · importmap |
| [`jofit`](./jofit) | Editorial-dark preview of a fitness & wellness coach: hydration, energy balance, training load, weekly chart, and an ML nudge ranked by clinical-evidence weight × personal delta × adherence cost. | HTML · CSS · SVG · vanilla JS |
| [`presend`](./presend) | MCP server that answers "should I send this?" before you hit send. Scores a draft, flags risky phrasing (implied commitments, vague timeframes, off-tone), and offers a rewrite. Modes for email, LinkedIn, proposals, feedback. | TypeScript · MCP SDK · Anthropic SDK |

## Running

Each folder has its own README with run instructions. Most are static — open `index.html` in a browser. Node/PHP demos need their respective runtime.

## Contributing

Bug fixes welcome. Feature requests we'll probably ignore — these are intentionally small. PRs that bloat scope will be closed politely.

## License

MIT. Do whatever you want, no warranty.

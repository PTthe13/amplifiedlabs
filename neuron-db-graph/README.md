# DB Neuron Graph — 3D database network

Database records rendered as a neuron-like brain. Every node is a record, every thread a relationship, and every travelling pulse is a link "firing" like a synapse. The spider-web shape isn't drawn — it's what a force-directed layout produces when ~500 related records pull on each other in 3D.

A white-on-black take on the question "what does our data actually look like when you can see every connection at once?"

## Run

Open `index.html` in any modern browser. No build, no server, no install — `3d-force-graph` (which bundles Three.js + `d3-force-3d`) is loaded over a CDN from jsDelivr.

- **Drag** to orbit, **scroll** to zoom.
- **Hover** any node to trace its relationships — neighbours stay white, everything else dims, and the connecting synapses light cyan and fire.
- **Fit view** re-frames the whole network. **Firing** toggles the ambient synapse pulses. **Re-cluster** re-runs the physics for a fresh layout.
- Respects `prefers-reduced-motion` — firing is off by default for users who ask for less motion.

## Data

A self-contained **public sample** — ~500 generated records across four tables (clients → projects → invoices, plus shared tags), wired by their foreign-key relationships. Account names are fictional (Acme, Globex, Initech…). No real data, no backend, no tracking.

Swap the `nodes`/`links` builder at the top of the script for a `fetch('/graph.json')` and it visualises any `{nodes, links}` set — a CRM, a content graph, or a raw SQL schema (tables as nodes, foreign keys as edges).

## Stack

- `3d-force-graph` (Three.js + `d3-force-3d`) over CDN, no bundler
- WebGL rendering, force-directed 3D layout
- Vanilla JS, single file
- Brand orange `#f16622` on `#0e0a08`

## Why

Most "database viewers" are tables. But the value in a database is the *relationships*, and a table hides them. Drawn as a 3D force graph, densely-connected records cluster on their own — so structure, hubs and orphans become visible at a glance. Built as a proof of concept for turning any relational dataset into an explorable map. Written up on [amplifiedcreations.com/lab](https://amplifiedcreations.com/lab).

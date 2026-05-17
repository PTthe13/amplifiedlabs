# Lost Room — WebXR

A small 3D room that exists between dimensions. A glowing obelisk, twenty-four floating orbs, a slowly rotating orbital ring, and a soft fog you can drift through.

## Run

Open `index.html` in any modern browser. No build, no server, no dependencies installed — Three.js is loaded over `importmap` from jsDelivr.

- **Regular computer:** drag to orbit, scroll to zoom, watch.
- **VR headset (Quest, Vive, Pico, Vision Pro):** click "Enter VR →" once detected.
- **No WebXR API:** the button stays grey, the inline scene still runs.

## Stack

- Three.js r165 (via importmap, no bundler)
- WebXR Device API — feature-detected, gracefully degrades
- OrbitControls + VRButton from `three/addons/`
- Brand orange `#f16622` everywhere it makes sense

## Why

A continuation of the "Reality desync" easter egg on [amplifiedcreations.com/404](https://amplifiedcreations.com/404). If a URL gets lost, this is where it ends up.

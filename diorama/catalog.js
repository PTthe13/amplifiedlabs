// catalog.js — procedural low-poly furniture. Each factory returns a THREE.Group
// tagged with userData: { type, footprint:{w,d}, paint:[materials] }.
// `paint` lists the materials the recolour picker drives. Materials are created
// fresh per call, so every placed instance recolours independently.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---- helpers ---------------------------------------------------------------

const rbox = (w, h, d, r = 0.05, seg = 3) => {
  const rad = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  return new RoundedBoxGeometry(w, h, d, seg, Math.max(rad, 0.001));
};

export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({
  color,
  roughness: o.rough ?? 0.72,
  metalness: o.metal ?? 0.0,
  emissive: o.emissive ?? 0x000000,
  emissiveIntensity: o.emI ?? 1,
});

const CYL = (rt, rb, h, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg);

// small mesh helper
const M = (geo, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
};

// palette accents reused across pieces
const METAL = () => mat(0x0d0d10, { rough: 0.35, metal: 0.9 });
const CHROME = () => mat(0xbfc3c9, { rough: 0.25, metal: 1.0 });
const WOOD = (c = 0x6b4a30) => mat(c, { rough: 0.62 });

// ---- pieces ----------------------------------------------------------------

function sofa() {
  const g = new THREE.Group();
  const body = mat(0x24263a, { rough: 0.85 }); // deep navy like the render
  const legMat = METAL();

  g.add(M(rbox(3.0, 0.42, 1.5, 0.12), body, 0, 0.4, 0));          // base
  g.add(M(rbox(3.0, 0.9, 0.32, 0.12), body, 0, 0.78, -0.6));       // backrest
  g.add(M(rbox(0.34, 0.62, 1.5, 0.1), body, -1.35, 0.62, 0));      // arm L
  g.add(M(rbox(0.34, 0.62, 1.5, 0.1), body, 1.35, 0.62, 0));       // arm R
  // seat cushions
  g.add(M(rbox(1.3, 0.28, 1.05, 0.09), body, -0.66, 0.66, 0.08));
  g.add(M(rbox(1.3, 0.28, 1.05, 0.09), body, 0.66, 0.66, 0.08));
  // back cushions
  g.add(M(rbox(1.3, 0.5, 0.2, 0.08), body, -0.66, 0.78, -0.44));
  g.add(M(rbox(1.3, 0.5, 0.2, 0.08), body, 0.66, 0.78, -0.44));
  // legs
  for (const [x, z] of [[-1.3, 0.6], [1.3, 0.6], [-1.3, -0.6], [1.3, -0.6]])
    g.add(M(CYL(0.05, 0.04, 0.2), legMat, x, 0.1, z));

  g.userData = { type: 'sofa', footprint: { w: 3, d: 2 }, paint: [body] };
  return g;
}

function floorLamp() {
  const g = new THREE.Group();
  const shade = mat(0xf6efe2, { rough: 0.5, emissive: 0xffcf8a, emI: 0.9 });
  const poleMat = METAL();

  g.add(M(CYL(0.34, 0.28, 0.5, 24), shade, 0, 1.72, 0));   // drum shade
  g.add(M(CYL(0.025, 0.025, 1.55), poleMat, 0, 0.9, 0));    // pole
  // tripod
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = M(CYL(0.02, 0.02, 0.95), poleMat, Math.cos(a) * 0.28, 0.42, Math.sin(a) * 0.28);
    leg.rotation.z = Math.cos(a) * 0.32;
    leg.rotation.x = -Math.sin(a) * 0.32;
    g.add(leg);
  }
  const bulb = new THREE.PointLight(0xffce8f, 0, 6, 2); // intensity set live via lamps toggle
  bulb.position.set(0, 1.6, 0);
  bulb.userData.isLamp = true;
  g.add(bulb);

  g.userData = { type: 'lamp', footprint: { w: 1, d: 1 }, paint: [shade], light: bulb };
  return g;
}

function coffeeTable() {
  const g = new THREE.Group();
  const top = WOOD(0x2c2c30);
  g.add(M(rbox(1.9, 0.1, 1.05, 0.05), top, 0, 0.52, 0));
  const legMat = METAL();
  for (const [x, z] of [[-0.8, 0.4], [0.8, 0.4], [-0.8, -0.4], [0.8, -0.4]])
    g.add(M(CYL(0.03, 0.03, 0.5), legMat, x, 0.26, z));
  // props
  const book = mat(0xc9683a, { rough: 0.8 });
  g.add(M(rbox(0.5, 0.09, 0.34, 0.02), book, -0.3, 0.61, 0.1));
  g.add(M(rbox(0.46, 0.07, 0.3, 0.02), mat(0xece3d2, { rough: 0.9 }), -0.3, 0.69, 0.08));
  const vase = mat(0xd8b48a, { rough: 0.55 });
  g.add(M(CYL(0.06, 0.09, 0.22, 14), vase, 0.45, 0.63, -0.05));

  g.userData = { type: 'table', footprint: { w: 2, d: 1 }, paint: [top] };
  return g;
}

function plant() {
  const g = new THREE.Group();
  const pot = mat(0xb98a5e, { rough: 0.6 });
  g.add(M(CYL(0.26, 0.34, 0.5, 20), pot, 0, 0.25, 0));
  g.add(M(CYL(0.27, 0.27, 0.04, 20), mat(0x2a1f16), 0, 0.5, 0)); // soil
  const leaf = mat(0x3f6b3a, { rough: 0.85 });
  const leaf2 = mat(0x4f7d43, { rough: 0.85 });
  const blobs = [
    [0, 1.15, 0, 0.55], [0.28, 0.95, 0.1, 0.4], [-0.26, 1.05, -0.12, 0.42],
    [0.12, 1.45, -0.05, 0.36], [-0.15, 1.35, 0.18, 0.32], [0.3, 1.3, -0.1, 0.3],
  ];
  blobs.forEach(([x, y, z, s], i) => {
    const m = M(new THREE.IcosahedronGeometry(s, 0), i % 2 ? leaf2 : leaf, x, y, z);
    m.rotation.set(x, y, z);
    g.add(m);
  });
  g.userData = { type: 'plant', footprint: { w: 1, d: 1 }, paint: [pot] };
  return g;
}

function desk() {
  const g = new THREE.Group();
  const top = mat(0x17181c, { rough: 0.45, metal: 0.2 });
  const legMat = METAL();
  g.add(M(rbox(2.7, 0.08, 1.25, 0.04), top, 0, 0.78, 0));
  // hairpin-ish legs
  for (const x of [-1.15, 1.15]) {
    g.add(M(rbox(0.06, 0.78, 0.06, 0.02), legMat, x, 0.39, 0.5));
    g.add(M(rbox(0.06, 0.78, 0.06, 0.02), legMat, x, 0.39, -0.5));
  }
  // monitor — curved screen via slightly bent box
  const stand = M(rbox(0.1, 0.34, 0.1, 0.03), legMat, 0, 0.99, -0.35);
  g.add(stand);
  g.add(M(rbox(0.44, 0.06, 0.26, 0.02), legMat, 0, 0.82, -0.35));
  const screen = M(rbox(1.5, 0.62, 0.06, 0.03), mat(0x0a0b0f, { rough: 0.3 }), 0, 1.32, -0.36);
  g.add(screen);
  const glow = M(new THREE.PlaneGeometry(1.4, 0.52),
    mat(0x1a2030, { emissive: 0x3a6ea5, emI: 1.6, rough: 1 }), 0, 1.32, -0.325);
  g.add(glow);
  // laptop
  const lapBase = M(rbox(0.5, 0.03, 0.34, 0.01), legMat, -0.85, 0.81, 0.18);
  g.add(lapBase);
  const lapScr = M(rbox(0.5, 0.32, 0.02, 0.01), mat(0x0a0b0f), -0.85, 0.97, 0.02);
  lapScr.rotation.x = -0.35;
  g.add(lapScr);
  const lapGlow = M(new THREE.PlaneGeometry(0.44, 0.27),
    mat(0x14181f, { emissive: 0x6fae8f, emI: 1.3, rough: 1 }), -0.85, 0.98, 0.035);
  lapGlow.rotation.x = -0.35;
  g.add(lapGlow);
  // keyboard + mug
  g.add(M(rbox(0.7, 0.03, 0.24, 0.01), mat(0x1c1d22), 0.15, 0.81, 0.28));
  g.add(M(CYL(0.07, 0.07, 0.16, 14), mat(0xd9552a), 0.75, 0.87, 0.35));

  g.userData = { type: 'desk', footprint: { w: 3, d: 2 }, paint: [top], screens: [glow, lapGlow] };
  return g;
}

function chair() {
  const g = new THREE.Group();
  const body = mat(0x1b1c22, { rough: 0.6 });
  g.add(M(rbox(0.62, 0.12, 0.6, 0.06), body, 0, 0.52, 0));       // seat
  g.add(M(rbox(0.58, 0.72, 0.1, 0.06), body, 0, 0.92, -0.28));    // back
  g.add(M(CYL(0.04, 0.04, 0.42), CHROME(), 0, 0.28, 0));           // gas cyl
  // 5-star base
  const chrome = CHROME();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = M(rbox(0.42, 0.05, 0.08, 0.02), chrome, Math.cos(a) * 0.2, 0.09, Math.sin(a) * 0.2);
    spoke.rotation.y = -a;
    g.add(spoke);
    g.add(M(CYL(0.05, 0.05, 0.08, 12), body, Math.cos(a) * 0.36, 0.05, Math.sin(a) * 0.36));
  }
  g.userData = { type: 'chair', footprint: { w: 1, d: 1 }, paint: [body] };
  return g;
}

function cabinet() {
  const g = new THREE.Group();
  const body = mat(0x121317, { rough: 0.4, metal: 0.15 });
  g.add(M(rbox(2.0, 0.92, 0.62, 0.05), body, 0, 0.55, 0));
  // door seam + handles
  g.add(M(rbox(0.02, 0.7, 0.01), mat(0x2c2d33), 0, 0.55, 0.315));
  g.add(M(CYL(0.015, 0.015, 0.16, 8), CHROME(), -0.12, 0.55, 0.33).rotateZ(Math.PI / 2));
  g.add(M(CYL(0.015, 0.015, 0.16, 8), CHROME(), 0.12, 0.55, 0.33).rotateZ(Math.PI / 2));
  for (const [x, z] of [[-0.9, 0.25], [0.9, 0.25], [-0.9, -0.25], [0.9, -0.25]])
    g.add(M(CYL(0.03, 0.03, 0.18), METAL(), x, 0.09, z));
  // decor on top
  g.add(M(CYL(0.09, 0.11, 0.28, 16), mat(0xcf6a34, { rough: 0.5 }), 0.6, 1.15, 0));
  g.add(M(new THREE.TorusGeometry(0.14, 0.045, 10, 24), mat(0xece3d2, { rough: 0.7 }), -0.5, 1.16, 0));

  g.userData = { type: 'cabinet', footprint: { w: 2, d: 1 }, paint: [body] };
  return g;
}

function shelf() {
  const g = new THREE.Group();
  const frame = WOOD(0x6b4a30);
  const W = 2.6, H = 3.6, D = 0.5;
  // back panel with vertical slats
  g.add(M(rbox(W, H, 0.06, 0.02), mat(0x161310, { rough: 0.8 }), 0, H / 2, -D / 2 + 0.02));
  const slN = 12;
  for (let i = 0; i < slN; i++) {
    const x = -W / 2 + 0.12 + (i / (slN - 1)) * (W - 0.24);
    g.add(M(rbox(0.08, H - 0.2, 0.05, 0.02), frame, x, H / 2, -D / 2 + 0.07));
  }
  // sides + shelves
  g.add(M(rbox(0.08, H, D, 0.02), frame, -W / 2, H / 2, 0));
  g.add(M(rbox(0.08, H, D, 0.02), frame, W / 2, H / 2, 0));
  const shelfY = [0.02, 0.95, 1.75, 2.5, 3.25];
  shelfY.forEach(y => g.add(M(rbox(W, 0.07, D, 0.02), frame, 0, y, 0)));
  // black cabinet in lower-mid
  g.add(M(rbox(W - 0.2, 0.72, D - 0.08, 0.04), mat(0x101115, { rough: 0.4 }), 0, 1.35, 0.02));
  g.add(M(rbox(0.02, 0.6, 0.01), mat(0x2c2d33), 0, 1.35, 0.24));

  // decor objects across shelves
  const dec = [
    () => M(new THREE.TorusGeometry(0.16, 0.05, 10, 24), mat(0xece3d2, { rough: 0.7 }), -0.7, 2.02, 0),
    () => M(CYL(0.07, 0.1, 0.34, 16), mat(0xb5482a, { rough: 0.5 }), 0.9, 2.02, 0),
    () => M(rbox(0.3, 0.22, 0.24, 0.02), mat(0xc98a55, { rough: 0.6 }), 0.2, 1.96, 0),
    () => M(new THREE.IcosahedronGeometry(0.13, 0), mat(0x2b2b30, { rough: 0.5 }), -0.9, 2.82, 0),
    () => M(rbox(0.5, 0.12, 0.34, 0.02), mat(0x2a2a2e), 0.5, 2.82, 0),   // books
    () => M(rbox(0.34, 0.4, 0.16, 0.03), mat(0x161616, { rough: 0.3 }), 0.7, 3.55, 0), // bag
    () => M(CYL(0.11, 0.11, 0.2, 6), mat(0xdcd3c2, { rough: 0.8 }), -0.6, 3.55, 0),
    () => M(new THREE.ConeGeometry(0.12, 0.3, 4), mat(0x6f7d55, { rough: 0.85 }), 0.0, 3.58, 0), // plant
  ];
  dec.forEach(fn => g.add(fn()));

  g.userData = { type: 'shelf', footprint: { w: 3, d: 1 }, paint: [frame], tall: true };
  return g;
}

function tv() {
  const g = new THREE.Group();
  const cab   = mat(0x141319, { rough: 0.4, metal: 0.2 });  // media console body
  const frame = mat(0x0c0c10, { rough: 0.4, metal: 0.3 });  // tv bezel + pedestal

  // low media console
  g.add(M(rbox(3.4, 0.5, 0.56, 0.05), cab, 0, 0.3, 0));
  g.add(M(rbox(0.02, 0.36, 0.01), mat(0x2c2d33), 0, 0.3, 0.285)); // door seam
  for (const x of [-1.5, 1.5]) g.add(M(rbox(0.12, 0.12, 0.5, 0.03), frame, x, 0.06, 0)); // plinth feet

  // pedestal + big flat panel sitting on the console
  const bezelY = 1.62;
  g.add(M(rbox(0.9, 0.05, 0.4, 0.02), frame, 0, 0.56, -0.02));   // pedestal base
  g.add(M(rbox(0.5, 0.16, 0.26, 0.03), frame, 0, 0.64, -0.02));  // neck
  g.add(M(rbox(3.24, 1.86, 0.1, 0.04), frame, 0, bezelY, -0.04)); // bezel

  // screen — MeshBasic so loaded media shows true-colour and bright (reads as a lit panel)
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x0a0b12 });
  const screen = M(new THREE.PlaneGeometry(3.02, 1.66), screenMat, 0, bezelY, 0.015);
  screen.userData.noShadow = true;
  g.add(screen);
  // standby dot
  g.add(M(new THREE.CircleGeometry(0.016, 10), new THREE.MeshBasicMaterial({ color: 0xf16622 }), 1.5, 0.68, 0.05));

  g.userData = { type: 'tv', footprint: { w: 3, d: 1 }, paint: [cab, frame], screen, screenMat };
  return g;
}

// ---- registry --------------------------------------------------------------

export const FACTORIES = { sofa, lamp: floorLamp, table: coffeeTable, plant, desk, chair, cabinet, shelf, tv };

export const CATALOG = [
  { type: 'sofa', label: 'Sofa' },
  { type: 'lamp', label: 'Lamp' },
  { type: 'table', label: 'Table' },
  { type: 'plant', label: 'Plant' },
  { type: 'desk', label: 'Desk' },
  { type: 'chair', label: 'Chair' },
  { type: 'cabinet', label: 'Cabinet' },
  { type: 'shelf', label: 'Shelf' },
  { type: 'tv', label: 'TV' },
];

// default arrangement — approximates the reference render.
// x,z in world units (room spans -5..5). rot in radians. color optional hex.
export const DEFAULT_LAYOUT = [
  { type: 'shelf', x: 0.6, z: -4.4, rot: 0 },
  { type: 'cabinet', x: -1.8, z: -4.35, rot: 0 },
  { type: 'sofa', x: -3.1, z: -0.6, rot: Math.PI / 2, color: '#7a4a32' },
  { type: 'lamp', x: -4.2, z: 1.7 },
  { type: 'table', x: -2.9, z: 1.4, rot: 0 },
  { type: 'plant', x: -0.3, z: -3.6 },
  { type: 'desk', x: 1.4, z: 1.0, rot: Math.PI },
  { type: 'chair', x: 1.4, z: 2.1, rot: 0 },
];

export function build(type) {
  const fn = FACTORIES[type];
  if (!fn) return null;
  const g = fn();
  g.traverse(o => {
    if (o.isMesh && !o.userData.noShadow) { o.castShadow = true; o.receiveShadow = true; }
  });
  return g;
}

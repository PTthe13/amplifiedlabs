// Diorama — an isometric cutaway room you can rearrange, recolour and re-skin.
// Three.js, orthographic iso camera, soft shadows, bloom, outline selection.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { build, CATALOG, DEFAULT_LAYOUT } from './catalog.js?v=2';

const ROOM = 10;          // floor is ROOM x ROOM, centred on origin
const HALF = ROOM / 2;
const WALL_H = 5.2;
const SNAP = 0.5;         // grid snap resolution
const MARGIN = 0.6;       // keep pieces off the walls

const $ = s => document.querySelector(s);
const canvas = $('#c');

// ---------------------------------------------------------------------------
// renderer / scene / camera
// ---------------------------------------------------------------------------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
} catch (e) { showNoWebGL(); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0806);

const FRUST = 9;          // orthographic half-height in world units
let aspect = innerWidth / innerHeight;
const camera = new THREE.OrthographicCamera(-FRUST * aspect, FRUST * aspect, FRUST, -FRUST, 0.1, 100);
camera.position.set(14, 13, 14);
camera.lookAt(0, 1.5, 0);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minZoom = 0.7;
controls.maxZoom = 2.2;
controls.target.set(0, 1.2, 0);
// keep the open corner facing the viewer
controls.minAzimuthAngle = Math.PI * 0.12;
controls.maxAzimuthAngle = Math.PI * 0.38;
controls.minPolarAngle = Math.PI * 0.16;
controls.maxPolarAngle = Math.PI * 0.42;

// ---------------------------------------------------------------------------
// lighting
// ---------------------------------------------------------------------------
const hemi = new THREE.HemisphereLight(0xbfd0ff, 0x1a120c, 0.55);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffe6c2, 2.2);
key.position.set(9, 14, 8);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1;
key.shadow.camera.far = 50;
const s = 11;
Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
key.shadow.radius = 3;
scene.add(key);
scene.add(key.target);
key.target.position.set(0, 0, 0);

const fill = new THREE.DirectionalLight(0x9fb4ff, 0.4);
fill.position.set(-8, 6, -6);
scene.add(fill);

// ---------------------------------------------------------------------------
// procedural textures
// ---------------------------------------------------------------------------
function plankTexture(base, line) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 512, 512);
  const plankH = 64;
  for (let i = 0; i < 512; i += plankH) {
    // subtle per-plank tint
    const t = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    x.fillStyle = `rgba(0,0,0,${0.05 + Math.abs(t) * 0.06})`;
    x.fillRect(0, i, 512, plankH);
    x.strokeStyle = line; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke();
    // grain streaks
    for (let k = 0; k < 40; k++) {
      const gy = i + Math.random() * plankH;
      x.strokeStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
      x.beginPath(); x.moveTo(Math.random() * 512, gy); x.lineTo(Math.random() * 512, gy); x.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function rugTexture(cols) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const n = 4, cell = 256 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    x.fillStyle = cols[(i * n + j + i) % cols.length];
    x.fillRect(j * cell, i * cell, cell, cell);
    if ((i + j) % 3 === 0) { // stripe accents
      x.fillStyle = 'rgba(255,255,255,0.08)';
      for (let k = 0; k < cell; k += 8) x.fillRect(j * cell, i * cell + k, cell, 3);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// room shell
// ---------------------------------------------------------------------------
const FLOOR_TONES = {
  walnut: ['#7a5232', '#3a2617'],
  oak: ['#a67c4e', '#5c3f24'],
  ash: ['#8a8378', '#4a463f'],
  ebony: ['#2c2622', '#151210'],
};
const RUG_PRESETS = {
  ember: ['#151515', '#f16622', '#8a8577', '#e9e2d2'],
  slate: ['#1b1d26', '#3a3f52', '#8a8fa3', '#d7dae2'],
  sand: ['#2a2018', '#c98a55', '#e6d3b3', '#5c4326'],
};

const room = new THREE.Group();
scene.add(room);

const floorMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.05 });
floorMat.map = plankTexture('#7a5232', 'rgba(0,0,0,0.35)');
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
room.add(floor);

// two back walls (L-shape) — plaster base + optional wood-slat skin
const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.95 });
function makeWall(w) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.PlaneGeometry(w, WALL_H), wallMat);
  base.position.y = WALL_H / 2;
  base.receiveShadow = true;
  g.add(base);
  // slat skin (hidden by default)
  const slats = new THREE.Group();
  slats.visible = false;
  const slatMat = new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.62 });
  const n = Math.floor(w / 0.34);
  for (let i = 0; i < n; i++) {
    const sx = -w / 2 + 0.17 + i * (w / n);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, WALL_H - 0.2, 0.06), slatMat);
    bar.position.set(sx, WALL_H / 2, 0.035); // front face ~0.065 off wall — stays behind DECOR_OFF
    bar.castShadow = true; bar.receiveShadow = true;
    slats.add(bar);
  }
  g.add(slats);
  g.userData = { base, slats, slatMat };
  return g;
}

const wallBack = makeWall(ROOM);
wallBack.position.set(0, 0, -HALF);
room.add(wallBack);

const wallLeft = makeWall(ROOM);
wallLeft.position.set(-HALF, 0, 0);
wallLeft.rotation.y = Math.PI / 2;
room.add(wallLeft);
const WALLS = [wallBack, wallLeft];

// thin baseboards + floor edge trim for a crisp cutaway
const trimMat = new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 0.8 });
[[0, -HALF, 0], [-HALF, 0, Math.PI / 2]].forEach(([x, z, ry]) => {
  const bb = new THREE.Mesh(new THREE.BoxGeometry(ROOM, 0.16, 0.08), trimMat);
  bb.position.set(x, 0.08, z); bb.rotation.y = ry; bb.castShadow = true;
  room.add(bb);
});

// rug
const rugMat = new THREE.MeshStandardMaterial({ roughness: 0.9, map: rugTexture(RUG_PRESETS.ember) });
const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.4), rugMat);
rug.rotation.x = -Math.PI / 2;
rug.position.set(1.2, 0.01, 1.4);
rug.receiveShadow = true;
room.add(rug);

// wall decor (fixed, not draggable): clock + framed art on left wall.
// Mounted DECOR_OFF from the wall so it always clears the wood-slat skin
// (slat front ~0.065) — otherwise the slats slice through the art.
const DECOR_OFF = 0.14;
function wallDecor() {
  const clock = new THREE.Group();
  clock.add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0x111, roughness: 0.5 })));
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xe8e8e8 }));
  hand.position.y = 0.15; clock.add(hand);
  const hand2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xe8e8e8 }));
  hand2.position.x = 0.1; clock.add(hand2);
  clock.position.set(-HALF + DECOR_OFF, 3.4, -2.2);
  clock.rotation.y = Math.PI / 2;
  clock.traverse(o => { if (o.isMesh) o.castShadow = false; });
  room.add(clock);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xcbb894, roughness: 0.6 });
  [[3.9, -0.6, 1.1, 1.4], [3.4, 1.1, 0.9, 1.1], [2.6, -1.0, 0.8, 1.0]].forEach(([y, z, w, h]) => {
    const f = new THREE.Group();
    f.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), frameMat));
    const art = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.14, h - 0.14),
      new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random() * 0.15 + 0.05, 0.3, 0.6), roughness: 0.9 }));
    art.position.z = 0.03; f.add(art);
    f.position.set(-HALF + DECOR_OFF, y, z); f.rotation.y = Math.PI / 2;
    room.add(f);
  });
}
wallDecor();

// ---------------------------------------------------------------------------
// post-processing
// ---------------------------------------------------------------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.7, 0.85);
composer.addPass(bloom);
const outline = new OutlinePass(new THREE.Vector2(innerWidth, innerHeight), scene, camera);
outline.edgeStrength = 4; outline.edgeGlow = 0.3; outline.edgeThickness = 1.2;
outline.visibleEdgeColor.set('#f16622'); outline.hiddenEdgeColor.set('#5a2a12');
composer.addPass(outline);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------
// furniture state + placement
// ---------------------------------------------------------------------------
const pieces = [];            // placed groups
let selected = null;
let lampsOn = true;

const snap = v => Math.round(v / SNAP) * SNAP;
function clampToRoom(g) {
  const box = new THREE.Box3().setFromObject(g);
  const hw = (box.max.x - box.min.x) / 2, hd = (box.max.z - box.min.z) / 2;
  g.position.x = THREE.MathUtils.clamp(g.position.x, -HALF + hw + MARGIN * 0.3, HALF - hw - 0.1);
  g.position.z = THREE.MathUtils.clamp(g.position.z, -HALF + hd + MARGIN * 0.3, HALF - hd - 0.1);
}

function place(type, opts = {}) {
  const g = build(type);
  if (!g) return null;
  g.position.set(opts.x ?? 0, 0, opts.z ?? 0);
  g.rotation.y = opts.rot ?? 0;
  if (opts.color != null) recolour(g, opts.color);
  clampToRoom(g);
  scene.add(g);
  pieces.push(g);
  if (g.userData.light) setLampState(g, lampsOn);
  return g;
}

// on/off for a lamp piece — kills the cast light AND dims the shade glow,
// so toggling reads as the lamp actually switching off (not just dimmer room).
function setLampState(g, on) {
  if (!g.userData.light) return;
  g.userData.light.intensity = on ? 9 : 0;
  (g.userData.paint || []).forEach(m => { if (m.emissive) m.emissiveIntensity = on ? 1.1 : 0.04; });
}

function recolour(g, hex) {
  if (g.userData.light) {
    // lamp: the swatch is the BULB colour — tint the glow + the cast light,
    // keep the shade luminous so a dark pick never reads as "switched off".
    const c = new THREE.Color(hex);
    (g.userData.paint || []).forEach(m => { m.color.set(0xf6efe2); if (m.emissive) m.emissive.set(c); });
    g.userData.light.color.set(c);
    if (lampsOn) setLampState(g, true); // ensure glow intensity restored
  } else {
    (g.userData.paint || []).forEach(m => m.color.set(hex));
  }
  g.userData.color = hex;
}

function removePiece(g) {
  scene.remove(g);
  pieces.splice(pieces.indexOf(g), 1);
  g.traverse(o => { if (o.isMesh) { o.geometry.dispose(); } });
  if (selected === g) select(null);
}

function loadLayout(layout) {
  [...pieces].forEach(removePiece);
  layout.forEach(p => place(p.type, p));
}

// ---------------------------------------------------------------------------
// selection + drag
// ---------------------------------------------------------------------------
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let dragging = null, dragOffset = new THREE.Vector3(), downXY = null, moved = false;

function rootOf(obj) {
  let o = obj;
  while (o && !pieces.includes(o)) o = o.parent;
  return o;
}
function setPtr(e) {
  const r = canvas.getBoundingClientRect();
  ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
}

function select(g) {
  selected = g;
  outline.selectedObjects = g ? [g] : [];
  updatePanel();
}

canvas.addEventListener('pointerdown', e => {
  setPtr(e);
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(pieces, true);
  downXY = { x: e.clientX, y: e.clientY }; moved = false;
  if (hits.length) {
    const g = rootOf(hits[0].object);
    select(g);
    dragging = g;
    controls.enabled = false;
    const hit = new THREE.Vector3();
    ray.ray.intersectPlane(floorPlane, hit);
    dragOffset.set(g.position.x - hit.x, 0, g.position.z - hit.z);
    canvas.setPointerCapture(e.pointerId);
  }
});

canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  if (downXY && Math.hypot(e.clientX - downXY.x, e.clientY - downXY.y) > 3) moved = true;
  setPtr(e);
  ray.setFromCamera(ptr, camera);
  const hit = new THREE.Vector3();
  if (ray.ray.intersectPlane(floorPlane, hit)) {
    dragging.position.x = snap(hit.x + dragOffset.x);
    dragging.position.z = snap(hit.z + dragOffset.z);
    clampToRoom(dragging);
  }
});

function endDrag(e) {
  if (!dragging) return;
  if (!moved) { /* was a click: keep selection */ }
  else saveState();
  dragging = null;
  controls.enabled = true;
  try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// click empty space to deselect
canvas.addEventListener('pointerdown', e => {
  setPtr(e);
  ray.setFromCamera(ptr, camera);
  if (!ray.intersectObjects(pieces, true).length) select(null);
}, true);

addEventListener('keydown', e => {
  if (!selected) return;
  if (e.key === 'r' || e.key === 'R') { selected.rotation.y += Math.PI / 4; saveState(); updatePanel(); }
  if (e.key === 'Delete' || e.key === 'Backspace') { removePiece(selected); saveState(); }
});

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
const SWATCHES = ['#24263a', '#2a2a30', '#7a5232', '#3f6b3a', '#b5482a', '#c98a55', '#8a8577', '#e9e2d2', '#1b1c22', '#3a6ea5'];
const LAMP_SWATCHES = ['#ffd9a0', '#ffbf7a', '#ff7a3c', '#ffe8c2', '#ffffff', '#9ecbff', '#c9a0ff', '#ff9ecf']; // bulb colours
const WALL_COLORS = ['#1a1512', '#141414', '#20262e', '#2a2320', '#3a3f52', '#e9e2d2'];

const objPanel = $('#obj-controls');
const objSwatches = $('#obj-swatches');
// rebuilt per selection — lamps get a warm bulb palette, everything else the material palette
function renderObjSwatches() {
  objSwatches.innerHTML = '';
  const cols = (selected && selected.userData.light) ? LAMP_SWATCHES : SWATCHES;
  cols.forEach(c => {
    const b = document.createElement('button');
    b.className = 'sw'; b.style.background = c;
    b.onclick = () => { if (selected) { recolour(selected, c); saveState(); updatePanel(); } };
    objSwatches.append(b);
  });
}

const wallSwatches = $('#wall-swatches');
WALL_COLORS.forEach(c => {
  const b = document.createElement('button');
  b.className = 'sw'; b.style.background = c;
  b.onclick = () => { wallMat.color.set(c); roomState.wall = c; saveState(); markSw(wallSwatches, b); };
  wallSwatches.append(b);
});

const floorRow = $('#floor-swatches');
Object.entries(FLOOR_TONES).forEach(([name, [base, line]]) => {
  const b = document.createElement('button');
  b.className = 'sw'; b.style.background = base; b.title = name;
  b.onclick = () => { setFloor(name); saveState(); markSw(floorRow, b); };
  floorRow.append(b);
});

const rugRow = $('#rug-swatches');
Object.entries(RUG_PRESETS).forEach(([name, cols]) => {
  const b = document.createElement('button');
  b.className = 'sw'; b.style.background = `linear-gradient(135deg,${cols[1]},${cols[3]})`; b.title = name;
  b.onclick = () => { setRug(name); saveState(); markSw(rugRow, b); };
  rugRow.append(b);
});

const addRow = $('#add-row');
CATALOG.forEach(({ type, label }) => {
  const b = document.createElement('button');
  b.className = 'chip'; b.textContent = '+ ' + label;
  b.onclick = () => { const g = place(type, { x: snap(Math.random() * 4 - 2), z: snap(Math.random() * 3) }); select(g); saveState(); };
  addRow.append(b);
});

function markSw(row, active) {
  [...row.children].forEach(c => c.classList.toggle('on', c === active));
}
function setFloor(name) {
  const [base, line] = FLOOR_TONES[name];
  floorMat.map.dispose();
  floorMat.map = plankTexture(base, line);
  floorMat.needsUpdate = true;
  roomState.floor = name;
}
function setRug(name) {
  rugMat.map.dispose();
  rugMat.map = rugTexture(RUG_PRESETS[name]);
  rugMat.needsUpdate = true;
  roomState.rug = name;
}
function setSlats(on) {
  WALLS.forEach(w => w.userData.slats.visible = on);
  roomState.slats = on;
}

$('#rotate-btn').onclick = () => { if (selected) { selected.rotation.y += Math.PI / 4; saveState(); } };
$('#dup-btn').onclick = () => {
  if (!selected) return;
  const g = place(selected.userData.type, {
    x: snap(selected.position.x + 1), z: snap(selected.position.z + 1),
    rot: selected.rotation.y, color: selected.userData.color,
  });
  select(g); saveState();
};
$('#del-btn').onclick = () => { if (selected) { removePiece(selected); saveState(); } };

$('#slat-toggle').onclick = e => { const on = !roomState.slats; setSlats(on); e.target.classList.toggle('on', on); saveState(); };
$('#lamp-toggle').onclick = e => {
  lampsOn = !lampsOn;
  pieces.forEach(g => setLampState(g, lampsOn));
  e.target.classList.toggle('on', lampsOn);
  e.target.textContent = lampsOn ? 'Lamps on' : 'Lamps off';
  roomState.lamps = lampsOn; saveState();
};

// themes
const THEMES = {
  studio: { wall: '#1a1512', floor: 'walnut', rug: 'ember', slats: false, sofa: '#24263a' },
  warm: { wall: '#2a2320', floor: 'oak', rug: 'sand', slats: true, sofa: '#7a4a32' },
  cool: { wall: '#20262e', floor: 'ash', rug: 'slate', slats: false, sofa: '#2f3646' },
};
$('#themes').querySelectorAll('button').forEach(btn => {
  btn.onclick = () => applyTheme(btn.dataset.theme);
});
function applyTheme(name) {
  const t = THEMES[name]; if (!t) return;
  wallMat.color.set(t.wall); roomState.wall = t.wall;
  setFloor(t.floor); setRug(t.rug); setSlats(t.slats);
  pieces.forEach(g => { if (g.userData.type === 'sofa') recolour(g, t.sofa); });
  $('#slat-toggle').classList.toggle('on', t.slats);
  saveState();
}

// ---- share --------------------------------------------------------------
let toastT;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastT);
  toastT = setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.hidden = true, 300); }, 2400);
}

$('#share-link').onclick = async () => {
  const enc = encodeURIComponent(encodeState(statePayload()));
  const url = location.origin + location.pathname + '#s=' + enc;
  history.replaceState(null, '', '#s=' + enc);
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied — your room travels with it');
  } catch (_) {
    prompt('Copy your room link:', url);
  }
};

$('#share-png').onclick = () => {
  const prev = outline.selectedObjects;
  outline.selectedObjects = [];        // no selection outline in the shot
  composer.render();
  const data = renderer.domElement.toDataURL('image/png');
  outline.selectedObjects = prev;
  const a = document.createElement('a');
  a.href = data; a.download = 'diorama.png'; a.click();
  toast('Saved diorama.png');
};

$('#reset-btn').onclick = () => {
  localStorage.removeItem('diorama');
  if (location.hash) history.replaceState(null, '', location.pathname);
  roomState = { ...DEFAULT_ROOM };
  applyRoomState();
  loadLayout(DEFAULT_LAYOUT);
  select(null);
};

$('#panel-toggle').onclick = () => $('#dock').classList.toggle('collapsed');

function updatePanel() {
  if (selected) {
    objPanel.hidden = false;
    $('#obj-name').textContent = selected.userData.type === 'lamp' ? 'lamp · bulb colour' : selected.userData.type;
    renderObjSwatches();
    [...objSwatches.children].forEach(c => c.classList.toggle('on', c.style.background && rgbEq(c.style.background, selected.userData.color)));
  } else {
    objPanel.hidden = true;
  }
}
function rgbEq(a, hex) {
  if (!hex) return false;
  const t = document.createElement('div'); t.style.color = hex; document.body.append(t);
  const want = getComputedStyle(t).color; t.remove();
  return a.replace(/\s/g, '') === want.replace(/\s/g, '');
}

// ---------------------------------------------------------------------------
// persistence
// ---------------------------------------------------------------------------
// default room = the Warm theme (wood-slat walls, oak floor, sand rug)
const DEFAULT_ROOM = { wall: '#2a2320', floor: 'oak', rug: 'sand', slats: true, lamps: true };
let roomState = { ...DEFAULT_ROOM };

function statePayload() {
  return {
    layout: pieces.map(g => ({
      type: g.userData.type,
      x: +g.position.x.toFixed(2), z: +g.position.z.toFixed(2),
      rot: +g.rotation.y.toFixed(3), color: g.userData.color,
    })),
    room: roomState,
  };
}
function saveState() {
  localStorage.setItem('diorama', JSON.stringify(statePayload()));
}

// pack the whole room into a URL-safe string (base64 of UTF-8 JSON)
function encodeState(p) { return btoa(unescape(encodeURIComponent(JSON.stringify(p)))); }
function decodeState(s) { return JSON.parse(decodeURIComponent(escape(atob(s)))); }
function applyRoomState() {
  wallMat.color.set(roomState.wall);
  setFloor(roomState.floor); setRug(roomState.rug); setSlats(roomState.slats);
  lampsOn = roomState.lamps;
  $('#slat-toggle').classList.toggle('on', roomState.slats);
  $('#lamp-toggle').classList.toggle('on', roomState.lamps);
  $('#lamp-toggle').textContent = roomState.lamps ? 'Lamps on' : 'Lamps off';
}
function boot() {
  let src = null;
  // a shared link (#s=…) wins over local storage
  const m = location.hash.match(/[#&]s=([^&]+)/);
  if (m) { try { src = decodeState(decodeURIComponent(m[1])); } catch (_) {} }
  if (!src) { try { src = JSON.parse(localStorage.getItem('diorama')); } catch (_) {} }
  if (src && src.layout && src.layout.length) {
    roomState = { ...DEFAULT_ROOM, ...src.room };
    applyRoomState();
    loadLayout(src.layout);
  } else {
    applyRoomState();
    loadLayout(DEFAULT_LAYOUT);
  }
  $('#loader').classList.add('gone');
}

// ---------------------------------------------------------------------------
// resize + loop
// ---------------------------------------------------------------------------
function resize() {
  aspect = innerWidth / innerHeight;
  camera.left = -FRUST * aspect; camera.right = FRUST * aspect;
  camera.top = FRUST; camera.bottom = -FRUST;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();

function showNoWebGL() {
  const el = $('#nowebgl'); if (el) el.hidden = false;
  const l = $('#loader'); if (l) l.classList.add('gone');
}

boot();

let t = 0;
function loop() {
  requestAnimationFrame(loop);
  t += 0.016;
  controls.update();
  // gentle screen flicker on desk monitors
  pieces.forEach(g => {
    if (g.userData.screens) g.userData.screens.forEach((m, i) =>
      m.material.emissiveIntensity = 1.3 + Math.sin(t * 2 + i) * 0.12);
  });
  composer.render();
}
loop();

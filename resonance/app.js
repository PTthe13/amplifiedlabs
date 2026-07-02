import * as THREE from 'three';
import { ProceduralAudio } from './audio.js';

/* ============================================================= boot */
const canvas = document.getElementById('c');
// Let three build whatever context it can get (WebGL2 or WebGL1 — the shaders
// here are GLSL1, so either works). Only fall back if there's truly no WebGL.
let renderer, initErr;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
} catch (e) { initErr = e; }
if (!renderer) {
  document.getElementById('loader').classList.add('gone');
  const box = document.getElementById('nowebgl');
  box.innerHTML = '<p>This experience needs WebGL. Enable hardware acceleration, or try a recent Chrome, Safari, Firefox or Edge.'
    + (initErr ? '<br><small style="opacity:.5">' + String(initErr.message || initErr) + '</small>' : '') + '</p>';
  box.hidden = false;
  throw new Error('no webgl');
}
renderer.setClearColor(0x0a0807, 1);
const DPR = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(DPR);

const MOBILE = matchMedia('(max-width:820px)').matches;
const FIELD_N = MOBILE ? 90000 : 340000;
const NEB_N = MOBILE ? 42000 : 130000;

/* ============================================================= shared noise */
const SNOISE = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec3 snoiseVec3(vec3 p){
  return vec3(snoise(p), snoise(p+vec3(123.4,0.0,-45.6)), snoise(p+vec3(-78.9,67.8,12.3)));
}
vec3 curl(vec3 p){
  const float e=0.35; vec3 dx=vec3(e,0.,0.),dy=vec3(0.,e,0.),dz=vec3(0.,0.,e);
  vec3 px0=snoiseVec3(p-dx), px1=snoiseVec3(p+dx);
  vec3 py0=snoiseVec3(p-dy), py1=snoiseVec3(p+dy);
  vec3 pz0=snoiseVec3(p-dz), pz1=snoiseVec3(p+dz);
  float x=(py1.z-py0.z)-(pz1.y-pz0.y);
  float y=(pz1.x-pz0.x)-(px1.z-px0.z);
  float z=(px1.y-px0.y)-(py1.x-py0.x);
  return normalize(vec3(x,y,z)/(2.0*e)+1e-5);
}`;

// brand-leaning iridescent palette (orange dominant, teal/magenta accents)
const PALETTE = `
vec3 palette(float t){
  vec3 a=vec3(0.62,0.42,0.32), b=vec3(0.55,0.42,0.32),
       c=vec3(1.0,0.95,0.85), d=vec3(0.00,0.18,0.42);
  vec3 col=a+b*cos(6.28318*(c*t+d));
  vec3 orange=vec3(0.945,0.400,0.133);
  return mix(col,orange,0.35+0.25*sin(t*3.1));
}`;

/* ============================================================= wordmark → points */
function sampleWordmark(count) {
  const cw = 1200, ch = 300;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const x = cv.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, cw, ch);
  x.fillStyle = '#fff';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '800 190px "Inter Tight", system-ui, sans-serif';
  x.fillText('amplified', cw / 2 - 26, ch / 2 + 8);
  x.font = 'italic 74px "Instrument Serif", Georgia, serif';
  x.fillText('®', cw / 2 + 470, ch / 2 - 40);
  const data = x.getImageData(0, 0, cw, ch).data;
  const pts = [];
  for (let py = 0; py < ch; py += 2) {
    for (let px = 0; px < cw; px += 2) {
      if (data[(py * cw + px) * 4] > 120) pts.push([px, py]);
    }
  }
  const out = new Float32Array(count * 3);
  const W = 62, H = W * ch / cw;
  if (pts.length === 0) return out;
  for (let i = 0; i < count; i++) {
    const p = pts[(Math.random() * pts.length) | 0];
    out[i * 3]     = (p[0] / cw - 0.5) * W + (Math.random() - 0.5) * 0.2;
    out[i * 3 + 1] = -(p[1] / ch - 0.5) * H + (Math.random() - 0.5) * 0.2;
    out[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
  }
  return out;
}

/* ============================================================= scene 0: dreamscape */
const quadScene = new THREE.Scene();
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const dreamUni = {
  uTime: { value: 0 }, uRes: { value: new THREE.Vector2() }, uMouse: { value: new THREE.Vector2() },
};
const dreamMat = new THREE.ShaderMaterial({
  uniforms: dreamUni,
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
  fragmentShader: `precision highp float; varying vec2 vUv; uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse;
  ${PALETTE}
  mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
  float map(vec3 p){
    p.xz*=rot(uTime*0.05); p.xy*=rot(uTime*0.03);
    p+=0.35*sin(p.zxy*1.3+uTime*0.2);
    float g=dot(sin(p),cos(p.yzx));
    return (abs(g)-0.92)*0.55;
  }
  void main(){
    vec2 uv=(vUv*2.0-1.0); uv.x*=uRes.x/uRes.y;
    vec3 ro=vec3(0.0,0.0,uTime*0.8);
    vec2 m=uMouse;
    vec3 rd=normalize(vec3(uv+m*0.35,1.4));
    rd.xz*=rot(m.x*0.6); rd.yz*=rot(-m.y*0.5);
    float t=0.0, glow=0.0, acc=0.0;
    for(int i=0;i<90;i++){
      vec3 p=ro+rd*t; float d=map(p);
      glow+=exp(-abs(d)*7.0)*0.013;
      acc+=palette(glow*1.4+p.z*0.04+uTime*0.02).x*0.0; // keep p referenced
      t+=max(abs(d),0.03);
      if(t>52.0) break;
    }
    float g=glow;
    vec3 col=palette(g*0.9+ro.z*0.03)*g*1.7;
    col+=vec3(0.945,0.40,0.133)*pow(g,2.4)*0.95; // orange core bloom
    col=col/(1.0+col); // tonemap
    col=pow(col,vec3(1.22));
    float vig=1.0-0.28*dot(uv*0.62,uv*0.62);
    gl_FragColor=vec4(col*vig,1.0);
  }`,
});
quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dreamMat));

/* ============================================================= scene 1: field */
const fieldScene = new THREE.Scene();
const persp = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
persp.position.set(0, 0, 78);

const wordTargets = sampleWordmark(Math.max(FIELD_N, NEB_N));

function buildField() {
  const g = new THREE.BufferGeometry();
  const base = new Float32Array(FIELD_N * 3);
  const seed = new Float32Array(FIELD_N);
  const tgt = new Float32Array(FIELD_N * 3);
  for (let i = 0; i < FIELD_N; i++) {
    // base cloud: flattened ellipsoid
    const r = Math.pow(Math.random(), 0.5) * 40;
    const th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
    base[i * 3]     = Math.sin(ph) * Math.cos(th) * r;
    base[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r * 0.62;
    base[i * 3 + 2] = Math.cos(ph) * r;
    seed[i] = Math.random();
    tgt[i * 3] = wordTargets[i * 3]; tgt[i * 3 + 1] = wordTargets[i * 3 + 1]; tgt[i * 3 + 2] = wordTargets[i * 3 + 2];
  }
  g.setAttribute('position', new THREE.BufferAttribute(base, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aTarget', new THREE.BufferAttribute(tgt, 3));
  const uni = {
    uTime: { value: 0 }, uMorph: { value: 0 }, uMouse: { value: new THREE.Vector3() },
    uPull: { value: 0 }, uSize: { value: MOBILE ? 1.2 : 1.5 }, uDpr: { value: DPR },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
    attribute float aSeed; attribute vec3 aTarget;
    uniform float uTime,uMorph,uPull,uSize,uDpr; uniform vec3 uMouse;
    varying float vGlow; varying float vSeed;
    ${SNOISE}
    void main(){
      vec3 p=position; float t=uTime*0.11;
      vec3 flow=curl(p*0.018+vec3(0.0,t,0.0))*7.0;
      flow+=curl(p*0.06+vec3(t*1.7,0.0,3.0))*2.2;
      vec3 fp=p+flow;
      vec3 toM=uMouse-fp; float d=length(toM)+0.6;
      fp+=normalize(toM)*(uPull*22.0/d);
      float m=smoothstep(0.0,1.0,uMorph);
      vec3 pos=mix(fp,aTarget,m);
      vGlow=clamp(length(flow)*0.09+m*0.35,0.0,1.2); vSeed=aSeed;
      vec4 mv=modelViewMatrix*vec4(pos,1.0);
      gl_PointSize=uSize*uDpr*(320.0/-mv.z)*(0.55+0.9*aSeed);
      gl_Position=projectionMatrix*mv;
    }`,
    fragmentShader: `precision highp float; varying float vGlow; varying float vSeed;
    ${PALETTE}
    void main(){
      vec2 uv=gl_PointCoord-0.5; float r=dot(uv,uv);
      if(r>0.25) discard;
      float a=exp(-r*7.5);
      vec3 col=palette(vGlow*0.7+vSeed*0.25);
      gl_FragColor=vec4(col*(0.35+vGlow*0.7),a*0.16);
    }`,
  });
  return new THREE.Points(g, mat);
}
const field = buildField();
fieldScene.add(field);

/* ============================================================= scene 2: nebula */
const nebScene = new THREE.Scene();
function buildNeb() {
  const g = new THREE.BufferGeometry();
  const dir = new Float32Array(NEB_N * 3);
  const seed = new Float32Array(NEB_N);
  const tgt = new Float32Array(NEB_N * 3);
  for (let i = 0; i < NEB_N; i++) {
    const th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
    dir[i * 3] = Math.sin(ph) * Math.cos(th);
    dir[i * 3 + 1] = Math.sin(ph) * Math.sin(th);
    dir[i * 3 + 2] = Math.cos(ph);
    seed[i] = Math.random();
    tgt[i * 3] = wordTargets[i * 3]; tgt[i * 3 + 1] = wordTargets[i * 3 + 1]; tgt[i * 3 + 2] = wordTargets[i * 3 + 2];
  }
  g.setAttribute('position', new THREE.BufferAttribute(dir, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aTarget', new THREE.BufferAttribute(tgt, 3));
  const uni = {
    uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uTreble: { value: 0 },
    uLevel: { value: 0 }, uMorph: { value: 0 }, uSize: { value: MOBILE ? 1.2 : 1.5 }, uDpr: { value: DPR },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
    attribute float aSeed; attribute vec3 aTarget;
    uniform float uTime,uBass,uMid,uTreble,uLevel,uMorph,uSize,uDpr;
    varying float vGlow; varying float vSeed;
    ${SNOISE}
    void main(){
      vec3 dir=normalize(position);
      float turb=snoise(dir*2.2+uTime*0.12)*(4.0+uMid*11.0);
      float r=31.0+uBass*15.0+turb;
      vec3 sp=dir*r;
      sp.xz=mat2(cos(uTime*0.1),-sin(uTime*0.1),sin(uTime*0.1),cos(uTime*0.1))*sp.xz;
      vec3 pos=mix(sp,aTarget,smoothstep(0.0,1.0,uMorph));
      vGlow=clamp(uLevel*1.2+uTreble*aSeed*1.4+0.2,0.0,1.6); vSeed=aSeed;
      vec4 mv=modelViewMatrix*vec4(pos,1.0);
      gl_PointSize=uSize*uDpr*(320.0/-mv.z)*(0.5+aSeed*1.1+uBass*1.4);
      gl_Position=projectionMatrix*mv;
    }`,
    fragmentShader: `precision highp float; varying float vGlow; varying float vSeed;
    ${PALETTE}
    void main(){
      vec2 uv=gl_PointCoord-0.5; float r=dot(uv,uv);
      if(r>0.25) discard;
      float a=exp(-r*6.5);
      vec3 col=palette(vGlow*0.6+vSeed*0.3+0.1);
      gl_FragColor=vec4(col*(0.35+vGlow*0.7),a*0.10);
    }`,
  });
  return new THREE.Points(g, mat);
}
const neb = buildNeb();
nebScene.add(neb);

/* ============================================================= interaction + state */
const audio = new ProceduralAudio();
let scene = 0;
let autoCycle = false;
let autoTimer = 0;
const pointer = { x: 0, y: 0, tx: 0, ty: 0, down: false };
let lastPointerMove = performance.now();

function onMove(cx, cy) {
  pointer.tx = (cx / window.innerWidth) * 2 - 1;
  pointer.ty = -((cy / window.innerHeight) * 2 - 1);
  lastPointerMove = performance.now();
  hideHint();
}
window.addEventListener('pointermove', e => onMove(e.clientX, e.clientY));
window.addEventListener('pointerdown', e => { pointer.down = true; onMove(e.clientX, e.clientY); });
window.addEventListener('pointerup', () => { pointer.down = false; });

let hintGone = false;
function hideHint() { if (hintGone) return; hintGone = true; document.getElementById('hint').classList.add('gone'); }
setTimeout(hideHint, 6000);

/* ---- resize ---- */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  dreamUni.uRes.value.set(w * DPR, h * DPR);
  persp.aspect = w / h; persp.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ============================================================= UI wiring */
const tabs = [...document.querySelectorAll('.tab')];
const audioBox = document.getElementById('audio');
const playBtn = document.getElementById('play');
const micBtn = document.getElementById('mic');
const trackSel = document.getElementById('track');
const autoBtn = document.getElementById('auto');

function setScene(i, fromAuto) {
  scene = i;
  tabs.forEach((t, k) => t.classList.toggle('is-on', k === i));
  audioBox.hidden = (i !== 2);
  if (!fromAuto) { autoCycle = false; autoBtn.classList.remove('is-on'); autoBtn.setAttribute('aria-pressed', 'false'); }
  autoTimer = 0;
}
tabs.forEach((t, i) => t.addEventListener('click', () => setScene(i)));

playBtn.addEventListener('click', async () => {
  const on = await audio.toggle();
  playBtn.textContent = on ? '❚❚' : '▶';
  playBtn.classList.toggle('is-on', on);
  if (on) micBtn.classList.remove('is-on');
});
trackSel.addEventListener('change', () => audio.setTrack(+trackSel.value));
micBtn.addEventListener('click', async () => {
  const on = await audio.toggleMic();
  micBtn.classList.toggle('is-on', on);
  if (on) { playBtn.textContent = '▶'; playBtn.classList.remove('is-on'); }
});
autoBtn.addEventListener('click', () => {
  autoCycle = !autoCycle;
  autoBtn.classList.toggle('is-on', autoCycle);
  autoBtn.setAttribute('aria-pressed', autoCycle ? 'true' : 'false');
  autoTimer = 0;
});

/* ============================================================= loop */
const clock = new THREE.Clock();
let orbit = 0;

function morphCycle(time, period, hold) {
  // returns 0..1 — mostly 0, ramps up, holds, ramps down, every `period` s
  const t = time % period;
  const inS = 1.3, outS = 1.3;
  if (t < period - hold - inS - outS) return 0;
  const s = t - (period - hold - inS - outS);
  if (s < inS) return smooth(s / inS);
  if (s < inS + hold) return 1;
  return 1 - smooth((s - inS - hold) / outS);
}
function smooth(x) { x = Math.min(Math.max(x, 0), 1); return x * x * (3 - 2 * x); }

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  // smooth pointer
  pointer.x += (pointer.tx - pointer.x) * 0.06;
  pointer.y += (pointer.ty - pointer.y) * 0.06;

  // auto-cycle scenes
  if (autoCycle) {
    autoTimer += dt;
    if (autoTimer > 16) { setScene((scene + 1) % 3, true); }
  }

  // wordmark morph amount for the Field scene (drives camera + uniform)
  const fieldMorph = scene === 1 ? morphCycle(time, 15, 3) : 0;

  // camera orbit for particle scenes; anchor to the front while the wordmark forms
  orbit += dt * 0.04;
  let camAng = orbit + pointer.x * 0.5;
  let camY = pointer.y * 16 + 4, camR = 82;
  if (fieldMorph > 0) {
    camAng *= (1 - fieldMorph);         // ease azimuth to front (readable, not mirrored)
    camY *= (1 - fieldMorph);
    camR = 82 - 8 * fieldMorph;         // slight dolly-in on the reveal
  }
  persp.position.set(Math.sin(camAng) * camR, camY, Math.cos(camAng) * camR);
  persp.lookAt(0, 0, 0);

  if (scene === 0) {
    dreamUni.uTime.value = time;
    dreamUni.uMouse.value.set(pointer.x, pointer.y);
    renderer.render(quadScene, quadCam);
  } else if (scene === 1) {
    const u = field.material.uniforms;
    u.uTime.value = time;
    u.uMorph.value = fieldMorph;
    u.uPull.value = pointer.down ? -1.2 : 0.5;
    u.uMouse.value.set(pointer.x * 46, pointer.y * 30, 0);
    renderer.render(fieldScene, persp);
  } else {
    audio.sample();
    const u = neb.material.uniforms;
    u.uTime.value = time;
    u.uBass.value = audio.bass; u.uMid.value = audio.mid; u.uTreble.value = audio.treble; u.uLevel.value = audio.level;
    renderer.render(nebScene, persp);
  }
}

/* reveal */
requestAnimationFrame(() => {
  frame();
  setTimeout(() => document.getElementById('loader').classList.add('gone'), 350);
});

// Procedural audio engine for Resonance.
// Five generative "tracks" synthesised in the browser — no files, no deps, no licences.
// Exposes an AnalyserNode so the visuals react to the exact signal we produce.

const NOTE = (semi) => 220 * Math.pow(2, semi / 12); // A3 = 0

// Each track: scale (semitone offsets), tempo (bpm), and a voice recipe.
const TRACKS = [
  { name: 'Aurora', bpm: 66,  root: -5, scale: [0, 3, 7, 10, 12, 15], drums: false, pad: 0.9, arp: 0.25, arpRate: 4, bass: 0.4, bright: 0.5 },
  { name: 'Pulse',  bpm: 124, root: -7, scale: [0, 3, 5, 7, 10],      drums: true,  pad: 0.35, arp: 0.5, arpRate: 8, bass: 0.7, bright: 0.7 },
  { name: 'Drift',  bpm: 84,  root: -9, scale: [0, 2, 5, 7, 9, 12],   drums: 'soft', pad: 0.6, arp: 0.3, arpRate: 6, bass: 0.55, bright: 0.4 },
  { name: 'Void',   bpm: 52,  root: -12, scale: [0, 5, 7, 12, 14],    drums: false, pad: 0.8, arp: 0.15, arpRate: 3, bass: 0.85, bright: 0.25 },
  { name: 'Nebula', bpm: 100, root: -3, scale: [0, 2, 4, 7, 9, 11, 14],drums: 'soft', pad: 0.45, arp: 0.6, arpRate: 8, bass: 0.5, bright: 0.9 },
];

export class ProceduralAudio {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.master = null;
    this.freq = null;
    this.playing = false;
    this.micMode = false;
    this.micStream = null;
    this.trackIndex = 0;
    this._timer = null;
    this._step = 0;
    this._nextTime = 0;
    this.bass = 0; this.mid = 0; this.treble = 0; this.level = 0;
  }

  _ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.0;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    // gentle master compression so peaks don't clip
    this.comp = this.ctx.createDynamicsCompressor();
    this.master.connect(this.comp);
    this.comp.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.reverb = this._buildReverb();
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.32;
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.master);
  }

  _buildReverb() {
    const len = this.ctx.sampleRate * 2.6;
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    const c = this.ctx.createConvolver();
    c.buffer = buf;
    return c;
  }

  setTrack(i) {
    this.trackIndex = i;
    this._step = 0;
  }

  async toggle() {
    this._ensure();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.playing) { this.pause(); return false; }
    if (this.micMode) this._stopMic();
    this.playing = true;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0.85, this.ctx.currentTime, 0.4);
    this._nextTime = this.ctx.currentTime + 0.1;
    this._timer = setInterval(() => this._scheduler(), 25);
    return true;
  }

  pause() {
    this.playing = false;
    clearInterval(this._timer); this._timer = null;
    if (this.master) this.master.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.25);
  }

  async toggleMic() {
    this._ensure();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.micMode) { this._stopMic(); return false; }
    if (this.playing) this.pause();
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) { return false; }
    this.micSrc = this.ctx.createMediaStreamSource(this.micStream);
    this.micSrc.connect(this.analyser);
    this.micMode = true;
    return true;
  }

  _stopMic() {
    if (this.micSrc) { try { this.micSrc.disconnect(); } catch (e) {} this.micSrc = null; }
    if (this.micStream) { this.micStream.getTracks().forEach(t => t.stop()); this.micStream = null; }
    this.micMode = false;
  }

  // ---- generative scheduler ----
  _scheduler() {
    const t = TRACKS[this.trackIndex];
    const spb = 60 / t.bpm;
    const stepDur = spb / 4; // 16th notes
    while (this._nextTime < this.ctx.currentTime + 0.12) {
      this._emit(this._step, this._nextTime, t, stepDur);
      this._nextTime += stepDur;
      this._step++;
    }
  }

  _emit(step, time, t, stepDur) {
    const bar = Math.floor(step / 16);
    const s16 = step % 16;
    const chordRoot = t.root + [0, -2, -5, -4][Math.floor(bar / 2) % 4];

    // pad — every two bars, a soft sustained chord
    if (s16 === 0 && (bar % 1 === 0)) {
      [0, 2, 4].forEach((deg, k) => {
        const n = NOTE(chordRoot + t.scale[deg % t.scale.length] + 12);
        this._voice(n, time, spb2(t) * 3.4, t.pad * (k === 0 ? 0.5 : 0.34), 'pad', t.bright);
      });
    }
    // bass — on the beat
    if (s16 % 4 === 0) {
      const n = NOTE(chordRoot - 12);
      this._voice(n, time, (t.drums ? 0.42 : 1.4), t.bass, 'bass', 0.2);
    }
    // arp — running notes
    if (step % (16 / t.arpRate | 0 || 2) === 0) {
      const deg = (step * 3) % t.scale.length;
      const oct = 12 * (1 + ((step >> 3) & 1));
      const n = NOTE(chordRoot + t.scale[deg] + oct);
      if (Math.random() < 0.82) this._voice(n, time, 0.35, t.arp * 0.5, 'arp', t.bright);
    }
    // drums
    if (t.drums) {
      const soft = t.drums === 'soft';
      if (s16 % 4 === 0) this._kick(time, soft ? 0.5 : 0.9);
      if (s16 % 8 === 4) this._hat(time, soft ? 0.14 : 0.26);
      if (!soft && s16 % 8 === 4) this._snare(time, 0.4);
    }
  }

  _voice(freq, time, dur, gain, kind, bright) {
    const c = this.ctx;
    const o = c.createOscillator();
    const o2 = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    if (kind === 'pad') { o.type = 'sawtooth'; o2.type = 'triangle'; o2.detune.value = 7; f.frequency.value = 500 + bright * 2600; f.Q.value = 0.6; }
    else if (kind === 'bass') { o.type = 'sawtooth'; o2.type = 'sine'; o2.detune.value = -12; f.frequency.value = 260 + bright * 400; f.Q.value = 1.2; }
    else { o.type = 'triangle'; o2.type = 'square'; o2.detune.value = 5; f.frequency.value = 900 + bright * 3800; f.Q.value = 0.8; }
    o.frequency.value = freq; o2.frequency.value = freq;
    const a = kind === 'pad' ? 0.7 : (kind === 'bass' ? 0.02 : 0.008);
    const peak = gain;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + a);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g); o2.connect(g); g.connect(f);
    f.connect(this.master);
    if (kind !== 'bass') f.connect(this.reverb);
    o.start(time); o2.start(time);
    o.stop(time + dur + 0.05); o2.stop(time + dur + 0.05);
  }

  _kick(time, gain) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(46, time + 0.12);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
    o.connect(g); g.connect(this.master); o.start(time); o.stop(time + 0.34);
  }
  _hat(time, gain) {
    const c = this.ctx, len = c.sampleRate * 0.05, b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = c.createGain(); g.gain.setValueAtTime(gain, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(time);
  }
  _snare(time, gain) {
    const c = this.ctx, len = c.sampleRate * 0.2, b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900;
    const g = c.createGain(); g.gain.setValueAtTime(gain, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
    s.connect(f); f.connect(g); g.connect(this.master); f.connect(this.reverb); s.start(time);
  }

  // ---- analysis for the visuals ----
  sample() {
    if (!this.analyser) { this.bass = this.mid = this.treble = this.level = 0; return; }
    this.analyser.getByteFrequencyData(this.freq);
    const n = this.freq.length;
    const band = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += this.freq[i]; return s / (b - a) / 255; };
    const bass = band(1, Math.floor(n * 0.06));
    const mid = band(Math.floor(n * 0.06), Math.floor(n * 0.30));
    const treble = band(Math.floor(n * 0.30), Math.floor(n * 0.75));
    // smooth
    const k = 0.28;
    this.bass += (bass - this.bass) * k;
    this.mid += (mid - this.mid) * k;
    this.treble += (treble - this.treble) * k;
    this.level += ((bass * 0.6 + mid * 0.3 + treble * 0.2) - this.level) * k;
  }

  get trackName() { return TRACKS[this.trackIndex].name; }
}

function spb2(t) { return 60 / t.bpm; }

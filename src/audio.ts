// Tiny synth: pour noise whose pitch rises as the glass fills, plus UI blips.
let ac: AudioContext | null = null;
let muted = false;
let pourNodes: { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode } | null = null;

try {
  muted = localStorage.getItem('mm_muted') === '1';
} catch {
  /* ignore */
}

export const isMuted = () => muted;

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem('mm_muted', m ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (m) pourStop();
}

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

export function unlockAudio() {
  ctx();
}

function noiseBuffer(a: AudioContext) {
  const b = a.createBuffer(1, a.sampleRate, a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

export function pourStart() {
  if (muted || pourNodes) return;
  const a = ctx();
  if (!a) return;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  src.loop = true;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 3;
  filter.frequency.value = 500;
  const gain = a.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.18, a.currentTime + 0.05);
  src.connect(filter).connect(gain).connect(a.destination);
  src.start();
  pourNodes = { src, filter, gain };
}

export function pourUpdate(fill: number) {
  if (!pourNodes || !ac) return;
  pourNodes.filter.frequency.setTargetAtTime(380 + fill * 1900, ac.currentTime, 0.05);
}

export function pourStop() {
  if (!pourNodes || !ac) return;
  const n = pourNodes;
  pourNodes = null;
  n.gain.gain.setTargetAtTime(0, ac.currentTime, 0.04);
  setTimeout(() => n.src.stop(), 200);
}

function tone(freq: number, dur: number, type: OscillatorType, vol = 0.08, slide = 0) {
  if (muted) return;
  const a = ctx();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, a.currentTime + dur);
  g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

export const blip = () => tone(880, 0.07, 'square', 0.05);
export const plop = () => tone(300 + Math.random() * 200, 0.12, 'sine', 0.12, 2.2);
export const stick = () => tone(1400, 0.05, 'triangle', 0.08, 0.6);
export function fanfare() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.06), i * 110));
}

// Lightweight Web Audio SFX. No assets — fully synthesized so it loads instantly
// and works offline. All sounds are short, throttled, and respect a mute toggle.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
const lastPlayed: Record<string, number> = {};

if (typeof window !== "undefined") {
  try { muted = localStorage.getItem("sfx_muted") === "1"; } catch {}
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    const c: AudioContext = new AC();
    ctx = c;
    const m = c.createGain();
    m.gain.value = 0.28;
    m.connect(c.destination);
    master = m;
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function initAudio() { ac(); }
export function isMuted() { return muted; }
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem("sfx_muted", m ? "1" : "0"); } catch {}
  if (master) master.gain.value = m ? 0 : 0.28;
}
export function toggleMuted() { setMuted(!muted); return muted; }

function throttle(key: string, ms: number) {
  const now = performance.now();
  if ((lastPlayed[key] ?? 0) + ms > now) return false;
  lastPlayed[key] = now;
  return true;
}

// Polished tone with soft attack, gentle release, and an optional lowpass
// filter so the timbre never feels harsh or beepy.
function tone(opts: {
  freq: number; freqEnd?: number; dur: number; type?: OscillatorType;
  vol?: number; delay?: number; filter?: number; detune?: number; attack?: number;
}) {
  const c = ac(); if (!c || muted || !master) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = opts.filter ?? 3200;
  lp.Q.value = 0.6;
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.detune) osc.detune.value = opts.detune;
  if (opts.freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t0 + opts.dur);
  const v = opts.vol ?? 0.2;
  const atk = opts.attack ?? 0.012;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(lp).connect(g).connect(master);
  osc.start(t0); osc.stop(t0 + opts.dur + 0.02);
}

function noise(dur: number, vol = 0.2, filterFreq = 1200, type: BiquadFilterType = "lowpass", q = 1) {
  const c = ac(); if (!c || muted || !master) return;
  const bufferSize = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  // Pink-ish noise for a warmer, less harsh grain
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99 * b0 + 0.0555179 * white;
    b1 = 0.96 * b1 + 0.2674 * white;
    b2 = 0.85 * b2 + 0.15 * white;
    data[i] = (b0 + b1 + b2 + white * 0.18) * 0.35;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = filterFreq;
  filter.Q.value = q;
  const g = c.createGain();
  const t0 = c.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t0); src.stop(t0 + dur);
}

export const sfx = {
  // Soft plasma pew — sine sweep + tiny air puff
  shoot() {
    if (!throttle("shoot", 55)) return;
    tone({ freq: 1200, freqEnd: 520, dur: 0.09, type: "triangle", vol: 0.08, filter: 2600 });
    tone({ freq: 2400, freqEnd: 900, dur: 0.06, type: "sine", vol: 0.05, filter: 3800, delay: 0.005 });
  },
  hit() {
    if (!throttle("hit", 30)) return;
    noise(0.04, 0.09, 3200, "bandpass", 1.4);
  },
  // Warm thump + filtered burst — no more raw sawtooth screech
  enemyKill() {
    if (!throttle("kill", 25)) return;
    tone({ freq: 240, freqEnd: 60, dur: 0.22, type: "sine", vol: 0.22, filter: 1400 });
    noise(0.18, 0.14, 1200, "lowpass");
  },
  playerHit() {
    tone({ freq: 160, freqEnd: 50, dur: 0.28, type: "triangle", vol: 0.22, filter: 900 });
    noise(0.22, 0.16, 700, "lowpass");
  },
  // Sparkly ascending arpeggio
  powerup() {
    tone({ freq: 660, dur: 0.09, type: "sine", vol: 0.16, filter: 4000 });
    tone({ freq: 990, dur: 0.09, type: "sine", vol: 0.16, filter: 4000, delay: 0.07 });
    tone({ freq: 1320, dur: 0.14, type: "triangle", vol: 0.16, filter: 5000, delay: 0.14 });
  },
  // Cinematic low boom
  bomb() {
    tone({ freq: 140, freqEnd: 34, dur: 0.7, type: "sine", vol: 0.32, filter: 900 });
    tone({ freq: 90, freqEnd: 28, dur: 0.7, type: "triangle", vol: 0.2, filter: 700, delay: 0.02 });
    noise(0.55, 0.28, 500, "lowpass");
  },
  // Airy shimmer
  shield() {
    tone({ freq: 520, freqEnd: 1400, dur: 0.4, type: "sine", vol: 0.16, filter: 4200 });
    tone({ freq: 780, freqEnd: 2100, dur: 0.4, type: "triangle", vol: 0.1, filter: 5000, delay: 0.03 });
  },
  bossSpawn() {
    tone({ freq: 70, freqEnd: 180, dur: 1.0, type: "triangle", vol: 0.26, filter: 1200 });
    tone({ freq: 110, freqEnd: 260, dur: 1.0, type: "sine", vol: 0.18, filter: 1600, delay: 0.05 });
    noise(0.9, 0.14, 600, "lowpass");
  },
  bossKill() {
    tone({ freq: 220, freqEnd: 40, dur: 1.3, type: "triangle", vol: 0.32, filter: 1400 });
    tone({ freq: 440, freqEnd: 80, dur: 1.1, type: "sine", vol: 0.22, filter: 2200, delay: 0.08 });
    noise(1.0, 0.28, 900, "lowpass");
  },
  gameOver() {
    tone({ freq: 440, freqEnd: 90, dur: 0.5, type: "triangle", vol: 0.22, filter: 1600 });
    tone({ freq: 330, freqEnd: 66, dur: 0.7, type: "sine", vol: 0.2, filter: 1200, delay: 0.22 });
  },
  // Coin-like triad
  reward() {
    tone({ freq: 784, dur: 0.12, type: "sine", vol: 0.2, filter: 4000 });
    tone({ freq: 1047, dur: 0.12, type: "sine", vol: 0.2, filter: 4000, delay: 0.1 });
    tone({ freq: 1568, dur: 0.24, type: "triangle", vol: 0.2, filter: 5000, delay: 0.2 });
  },
  combo() {
    if (!throttle("combo", 80)) return;
    tone({ freq: 1400, freqEnd: 2000, dur: 0.09, type: "sine", vol: 0.12, filter: 5000 });
  },
  uiClick() {
    tone({ freq: 720, freqEnd: 480, dur: 0.06, type: "sine", vol: 0.1, filter: 3000 });
  },
};
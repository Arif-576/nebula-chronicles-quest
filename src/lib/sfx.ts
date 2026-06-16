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
    m.gain.value = 0.35;
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
  if (master) master.gain.value = m ? 0 : 0.35;
}
export function toggleMuted() { setMuted(!muted); return muted; }

function throttle(key: string, ms: number) {
  const now = performance.now();
  if ((lastPlayed[key] ?? 0) + ms > now) return false;
  lastPlayed[key] = now;
  return true;
}

function tone(opts: {
  freq: number; freqEnd?: number; dur: number; type?: OscillatorType;
  vol?: number; delay?: number; q?: number;
}) {
  const c = ac(); if (!c || muted || !master) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t0 + opts.dur);
  const v = opts.vol ?? 0.25;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(v, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g).connect(master);
  osc.start(t0); osc.stop(t0 + opts.dur + 0.02);
}

function noise(dur: number, vol = 0.3, filterFreq = 1200, type: BiquadFilterType = "lowpass") {
  const c = ac(); if (!c || muted || !master) return;
  const bufferSize = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = filterFreq;
  const g = c.createGain();
  const t0 = c.currentTime;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t0); src.stop(t0 + dur);
}

export const sfx = {
  shoot() {
    if (!throttle("shoot", 50)) return;
    tone({ freq: 880, freqEnd: 420, dur: 0.07, type: "square", vol: 0.08 });
  },
  hit() {
    if (!throttle("hit", 30)) return;
    noise(0.05, 0.12, 2400, "highpass");
  },
  enemyKill() {
    if (!throttle("kill", 25)) return;
    tone({ freq: 320, freqEnd: 80, dur: 0.18, type: "sawtooth", vol: 0.15 });
    noise(0.15, 0.18, 800);
  },
  playerHit() {
    tone({ freq: 180, freqEnd: 60, dur: 0.25, type: "square", vol: 0.22 });
    noise(0.2, 0.22, 600);
  },
  powerup() {
    tone({ freq: 660, freqEnd: 1320, dur: 0.18, type: "triangle", vol: 0.22 });
    tone({ freq: 880, freqEnd: 1760, dur: 0.18, type: "sine", vol: 0.14, delay: 0.06 });
  },
  bomb() {
    tone({ freq: 120, freqEnd: 30, dur: 0.6, type: "sawtooth", vol: 0.32 });
    noise(0.55, 0.35, 400);
  },
  shield() {
    tone({ freq: 440, freqEnd: 1200, dur: 0.35, type: "sine", vol: 0.2 });
    tone({ freq: 660, freqEnd: 1800, dur: 0.35, type: "triangle", vol: 0.14, delay: 0.04 });
  },
  bossSpawn() {
    tone({ freq: 90, freqEnd: 220, dur: 0.9, type: "sawtooth", vol: 0.3 });
    tone({ freq: 60, freqEnd: 140, dur: 0.9, type: "square", vol: 0.18, delay: 0.05 });
    noise(0.8, 0.18, 500);
  },
  bossKill() {
    tone({ freq: 200, freqEnd: 40, dur: 1.2, type: "sawtooth", vol: 0.4 });
    tone({ freq: 380, freqEnd: 80, dur: 1.0, type: "square", vol: 0.25, delay: 0.1 });
    noise(1.0, 0.4, 700);
  },
  gameOver() {
    tone({ freq: 440, freqEnd: 110, dur: 0.45, type: "sawtooth", vol: 0.25 });
    tone({ freq: 330, freqEnd: 80, dur: 0.6, type: "square", vol: 0.2, delay: 0.2 });
  },
  reward() {
    tone({ freq: 660, dur: 0.12, type: "triangle", vol: 0.22 });
    tone({ freq: 880, dur: 0.12, type: "triangle", vol: 0.22, delay: 0.1 });
    tone({ freq: 1320, dur: 0.22, type: "triangle", vol: 0.22, delay: 0.2 });
  },
  combo() {
    if (!throttle("combo", 80)) return;
    tone({ freq: 1200, freqEnd: 1800, dur: 0.1, type: "square", vol: 0.12 });
  },
  uiClick() {
    tone({ freq: 600, freqEnd: 900, dur: 0.05, type: "square", vol: 0.12 });
  },
};
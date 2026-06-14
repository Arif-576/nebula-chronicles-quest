import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthScreen } from "@/components/AuthScreen";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEBULAR ECHO — Play" },
      { name: "description", content: "A neon space shooter you can play in your browser." },
    ],
  }),
  component: GameApp,
});

type Screen = "menu" | "play" | "gameover" | "leaderboard";

interface Entity { x: number; y: number; vx: number; vy: number; r: number; hp?: number; t?: number; type?: string; }
interface Star { x: number; y: number; z: number; }

const LB_KEY = "nebular_echo_lb_v1";
const UP_KEY = "nebular_echo_up_v2";
const SHIP_KEY = "nebular_echo_ship_v1";

type ShipId = "vanguard" | "phantom" | "titan" | "spectre" | "nova" | "warden";
interface ShipDef { id: ShipId; name: string; tag: string; speed: number; hpMul: number; fireMul: number; dmgMul: number; color: string; accent: string; desc: string; }
const SHIPS: ShipDef[] = [
  { id: "vanguard", name: "VANGUARD", tag: "Balanced", speed: 6, hpMul: 1, fireMul: 1, dmgMul: 1, color: "#22d3ee", accent: "#f0abfc", desc: "All-round starfighter. Reliable in any tide." },
  { id: "phantom",  name: "PHANTOM",  tag: "Glass Cannon", speed: 7.6, hpMul: 0.7, fireMul: 1.35, dmgMul: 1.15, color: "#f0abfc", accent: "#22d3ee", desc: "Fragile hull, blistering fire rate, surgical damage." },
  { id: "titan",    name: "TITAN",    tag: "Bulwark",     speed: 4.6, hpMul: 1.7, fireMul: 0.85, dmgMul: 1.35, color: "#a3e635", accent: "#f59e0b", desc: "Heavy plating, slower frame, devastating shots." },
  { id: "spectre",  name: "SPECTRE",  tag: "Stealth",     speed: 6.8, hpMul: 0.85, fireMul: 1.2, dmgMul: 1.1, color: "#67e8f9", accent: "#c084fc", desc: "Quick shadow-runner. Slippery, sharp, hard to pin." },
  { id: "nova",     name: "NOVA",     tag: "Inferno",     speed: 5.6, hpMul: 1.1, fireMul: 1.1, dmgMul: 1.4, color: "#fb923c", accent: "#facc15", desc: "Plasma-tipped lance. Burns through tanks like paper." },
  { id: "warden",   name: "WARDEN",   tag: "Guardian",    speed: 5.2, hpMul: 1.45, fireMul: 1.0, dmgMul: 1.05, color: "#34d399", accent: "#60a5fa", desc: "Reinforced shielding, steady cannon, never falters." },
];
function loadShip(): ShipId {
  if (typeof window === "undefined") return "vanguard";
  const v = localStorage.getItem(SHIP_KEY) as ShipId | null;
  return v && SHIPS.find(s => s.id === v) ? v : "vanguard";
}
function saveShip(id: ShipId) { localStorage.setItem(SHIP_KEY, id); }

function loadLB(): { name: string; score: number; wave: number }[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LB_KEY) || "[]"); } catch { return []; }
}
function saveLB(name: string, score: number, wave: number) {
  const lb = loadLB();
  lb.push({ name, score, wave });
  lb.sort((a, b) => b.score - a.score);
  localStorage.setItem(LB_KEY, JSON.stringify(lb.slice(0, 10)));
}
function loadUp(): { dmg: number; fire: number; shield: number; credits: number } {
  if (typeof window === "undefined") return { dmg: 1, fire: 1, shield: 1, credits: 0 };
  try { return JSON.parse(localStorage.getItem(UP_KEY) || "") || { dmg: 1, fire: 1, shield: 1, credits: 0 }; }
  catch { return { dmg: 1, fire: 1, shield: 1, credits: 0 }; }
}
function saveUp(u: ReturnType<typeof loadUp>) { localStorage.setItem(UP_KEY, JSON.stringify(u)); }

function GameApp() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [name, setName] = useState("PILOT");
  const [hud, setHud] = useState({ score: 0, wave: 1, hp: 100, credits: 0 });
  const [lb, setLb] = useState<ReturnType<typeof loadLB>>([]);
  const [up, setUp] = useState(loadUp());
  const [shipId, setShipId] = useState<ShipId>(loadShip());
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      if (session?.user) {
        supabase.from("profiles").select("username").eq("id", session.user.id).maybeSingle()
          .then(({ data }) => {
            const u = (data?.username ?? session.user.email?.split("@")[0] ?? "PILOT")
              .toUpperCase().slice(0, 10);
            setName(u);
          });
      }
    });
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { setLb(loadLB()); }, [screen]);

  const onGameOver = useCallback((score: number, wave: number, credits: number) => {
    saveLB(name || "PILOT", score, wave);
    const nu = { ...up, credits: up.credits + credits };
    saveUp(nu); setUp(nu);
    setHud((h) => ({ ...h, score, wave, credits }));
    setScreen("gameover");
  }, [name, up]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <BackgroundFX />
      {authed === false && (
        <AuthScreen onAuthed={(u) => { setName(u); setAuthed(true); }} />
      )}
      {authed && screen === "menu" && (
        <Menu
          name={name} setName={setName}
          onPlay={() => setScreen("play")}
          onLB={() => setScreen("leaderboard")}
          up={up} setUp={(u: ReturnType<typeof loadUp>) => { saveUp(u); setUp(u); }}
          shipId={shipId} setShipId={(id: ShipId) => { saveShip(id); setShipId(id); }}
          onSignOut={async () => { await supabase.auth.signOut(); setAuthed(false); }}
        />
      )}
      {authed && screen === "play" && (
        <Game upgrades={up} ship={SHIPS.find(s => s.id === shipId)!} onHud={setHud} onEnd={onGameOver} onQuit={() => setScreen("menu")} hud={hud} />
      )}
      {authed && screen === "gameover" && (
        <GameOver hud={hud} onRetry={() => setScreen("play")} onMenu={() => setScreen("menu")} />
      )}
      {authed && screen === "leaderboard" && (
        <Leaderboard lb={lb} onBack={() => setScreen("menu")} />
      )}
    </div>
  );
}

function BackgroundFX() {
  return (
    <div className="pointer-events-none absolute inset-0 bg-nebula">
      <div className="absolute inset-0 grid-bg opacity-20" />
    </div>
  );
}

function Menu({ name, setName, onPlay, onLB, up, setUp, shipId, setShipId, onSignOut }: any) {
  const upgrade = (k: "dmg" | "fire" | "shield") => {
    const cost = up[k] * 50;
    if (up.credits < cost) return;
    setUp({ ...up, [k]: up[k] + 1, credits: up.credits - cost });
  };
  return (
    <div className="relative z-10 mx-auto flex h-full max-w-md flex-col items-center gap-5 overflow-y-auto px-6 py-8 text-center">
      <Logo size={76} />
      <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-accent">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> v3.0 SOVEREIGN · Bosses Online
      </div>
      <h1 className="font-display text-4xl font-black leading-none sm:text-5xl">
        NEBULAR<br /><span className="text-gradient">ECHO</span>
      </h1>
      <p className="text-xs text-muted-foreground">
        Survive waves, slay Sovereign bosses, harvest cores. Upgrade your fleet. Climb the Cinder Tournament.
      </p>
      <input
        value={name}
        maxLength={10}
        onChange={(e) => setName(e.target.value.toUpperCase())}
        className="w-full rounded-full glass px-5 py-3 text-center font-mono tracking-widest outline-none focus:border-accent"
        placeholder="CALLSIGN"
      />

      <div className="w-full glass rounded-2xl p-3 text-left">
        <div className="mb-2 px-1 text-[10px] uppercase tracking-[0.3em] text-accent">Select Starfighter</div>
        <div className="grid grid-cols-3 gap-2">
          {SHIPS.map((s) => {
            const sel = shipId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setShipId(s.id)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition-all ${sel ? "border-accent bg-accent/10 scale-[1.02]" : "border-border bg-secondary/30"}`}
              >
                <ShipIcon ship={s} size={32} />
                <div className="text-[10px] font-display font-black">{s.name}</div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.tag}</div>
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-1 text-[10px] leading-tight text-muted-foreground">
          {SHIPS.find((s) => s.id === shipId)?.desc}
        </p>
      </div>

      <button
        onClick={onPlay}
        className="w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-8 py-4 font-display text-lg font-black tracking-widest text-background neon-glow transition-transform active:scale-95"
      >▶ LAUNCH</button>

      <div className="w-full glass rounded-2xl p-4 text-left">
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest">
          <span className="text-accent">Forge · Upgrades</span>
          <span className="font-mono text-foreground">{up.credits} ◈</span>
        </div>
        {(["dmg", "fire", "shield"] as const).map((k) => (
          <button
            key={k}
            onClick={() => upgrade(k)}
            disabled={up.credits < up[k] * 50}
            className="mb-2 flex w-full items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-2 text-sm transition-colors hover:border-accent disabled:opacity-50"
          >
            <span className="uppercase tracking-widest text-muted-foreground">
              {k === "dmg" ? "Damage" : k === "fire" ? "Fire Rate" : "Shield"}
            </span>
            <span className="font-mono">Lv {up[k]} · {up[k] * 50}◈</span>
          </button>
        ))}
        <div className="mt-1 px-1 text-[9px] leading-snug text-muted-foreground">
          ◈ Weapon tiers: Lv3 lance · Lv4 wingtips · Lv5 rail-shard · Lv6 side beams · Lv7 rear guard · Lv8 homing missile
        </div>
      </div>

      <button onClick={onLB} className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-accent">
        ✦ Leaderboard
      </button>

      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
        WASD/Arrows · Space fire · E shield · Q nova bomb · Mobile: drag + buttons
      </p>
      {onSignOut && (
        <button onClick={onSignOut} className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-destructive">
          Sign out
        </button>
      )}
    </div>
  );
}

function ShipIcon({ ship, size = 28 }: { ship: ShipDef; size?: number }) {
  const s = size / 2;
  return (
    <svg width={size} height={size} viewBox={`-${s} -${s} ${size} ${size}`}>
      <defs>
        <filter id={`g-${ship.id}`}><feGaussianBlur stdDeviation="0.8" /></filter>
      </defs>
      <g filter={`url(#g-${ship.id})`}>
        {ship.id === "vanguard" && (
          <polygon points={`0,-${s} ${s*0.85},${s*0.7} 0,${s*0.3} -${s*0.85},${s*0.7}`} fill={ship.color} />
        )}
        {ship.id === "phantom" && (
          <polygon points={`0,-${s} ${s},${s*0.4} ${s*0.4},${s*0.7} -${s*0.4},${s*0.7} -${s},${s*0.4}`} fill={ship.color} />
        )}
        {ship.id === "titan" && (
          <polygon points={`-${s*0.5},-${s*0.8} ${s*0.5},-${s*0.8} ${s},${s*0.5} -${s},${s*0.5}`} fill={ship.color} />
        )}
        {ship.id === "spectre" && (
          <polygon points={`0,-${s} ${s*0.7},0 ${s*0.3},${s*0.8} -${s*0.3},${s*0.8} -${s*0.7},0`} fill={ship.color} />
        )}
        {ship.id === "nova" && (
          <polygon points={`0,-${s} ${s*0.4},-${s*0.2} ${s},${s*0.7} 0,${s*0.4} -${s},${s*0.7} -${s*0.4},-${s*0.2}`} fill={ship.color} />
        )}
        {ship.id === "warden" && (
          <polygon points={`0,-${s*0.95} ${s*0.9},-${s*0.2} ${s*0.7},${s*0.8} -${s*0.7},${s*0.8} -${s*0.9},-${s*0.2}`} fill={ship.color} />
        )}
      </g>
      <circle cx="0" cy="0" r={s * 0.18} fill={ship.accent} />
    </svg>
  );
}

function Leaderboard({ lb, onBack }: any) {
  return (
    <div className="relative z-10 mx-auto flex h-full max-w-md flex-col gap-4 px-6 py-12">
      <h2 className="font-display text-3xl font-black">CINDER <span className="text-gradient">TOURNAMENT</span></h2>
      <div className="glass flex-1 overflow-y-auto rounded-2xl p-4">
        {lb.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No runs yet. Be the first.</p>}
        {lb.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between border-b border-border/40 py-3 text-sm last:border-0">
            <span className={`font-display text-xl font-black ${i === 0 ? "text-gradient" : i < 3 ? "text-accent" : "text-muted-foreground"}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 px-3 font-mono">{p.name}</span>
            <span className="text-xs text-muted-foreground">W{p.wave}</span>
            <span className="ml-3 font-mono">{p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <button onClick={onBack} className="rounded-full glass px-6 py-3 font-bold">← Back</button>
    </div>
  );
}

function GameOver({ hud, onRetry, onMenu }: any) {
  return (
    <div className="relative z-10 mx-auto flex h-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-xs uppercase tracking-[0.4em] text-accent">Signal Lost</p>
      <h2 className="font-display text-5xl font-black">YOU <span className="text-gradient">FELL</span></h2>
      <div className="glass grid w-full grid-cols-3 gap-4 rounded-2xl p-6 text-center">
        <Stat label="Score" v={hud.score.toLocaleString()} />
        <Stat label="Wave" v={hud.wave} />
        <Stat label="Credits" v={`+${hud.credits}◈`} />
      </div>
      <button onClick={onRetry} className="w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-8 py-4 font-display font-black tracking-widest text-background neon-glow active:scale-95">
        ↻ RE-LAUNCH
      </button>
      <button onClick={onMenu} className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-accent">
        Return to Hangar
      </button>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: any }) {
  return (
    <div>
      <div className="font-display text-2xl font-black text-gradient">{v}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function Game({ upgrades, ship: shipDef, onHud, onEnd, onQuit, hud }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<any>(null);
  const actionsRef = useRef<{ shield: () => void; bomb: () => void } | null>(null);
  const [localHud, setLocalHud] = useState<any>({ score: 0, wave: 1, hp: 100, maxHp: 100, credits: 0, shieldCD: 0, bombs: 1, boss: null });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const keys: Record<string, boolean> = {};
    const onKey = (e: KeyboardEvent, down: boolean) => {
      keys[e.key.toLowerCase()] = down;
      if (e.key === " ") e.preventDefault();
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    // touch
    let touchTarget: { x: number; y: number } | null = null;
    const tStart = (e: TouchEvent) => { e.preventDefault(); const t = e.touches[0]; const r = canvas.getBoundingClientRect(); touchTarget = { x: t.clientX - r.left, y: t.clientY - r.top }; };
    const tMove = (e: TouchEvent) => { e.preventDefault(); const t = e.touches[0]; const r = canvas.getBoundingClientRect(); touchTarget = { x: t.clientX - r.left, y: t.clientY - r.top }; };
    const tEnd = (e: TouchEvent) => { e.preventDefault(); touchTarget = null; };
    canvas.addEventListener("touchstart", tStart, { passive: false });
    canvas.addEventListener("touchmove", tMove, { passive: false });
    canvas.addEventListener("touchend", tEnd, { passive: false });

    // stars (pseudo-3D)
    const stars: Star[] = Array.from({ length: 140 }, () => ({
      x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random(),
    }));

    const baseHp = 100 * upgrades.shield * shipDef.hpMul;
    const ship = {
      x: W / 2, y: H - 100,
      r: shipDef.id === "titan" ? 17 : shipDef.id === "phantom" ? 12 : 14,
      hp: baseHp, maxHp: baseHp, cool: 0, inv: 0,
      shieldT: 0, shieldCD: 0, bombs: 1, bombCD: 0,
    };
    const bullets: Entity[] = [];
    const enemies: Entity[] = [];
    const ebullets: Entity[] = [];
    const particles: Entity[] = [];
    const powerups: Entity[] = [];
    let boss: any = null;
    let bossIntroT = 0;
    let bossWave = false;

    let score = 0, wave = 1, credits = 0, spawnT = 0, enemiesToSpawn = 6, waveBreak = 0;
    let last = performance.now();
    let raf = 0;
    let running = true;

    const spawnExplosion = (x: number, y: number, color: string, n = 18) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 4;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 1 + Math.random() * 2, t: 1, type: color });
      }
    };

    const spawnEnemy = () => {
      const r = Math.random();
      const type = r < 0.7 ? "grunt" : r < 0.92 ? "fast" : "tank";
      const radius = type === "tank" ? 26 : type === "fast" ? 12 : 18;
      const hp = (type === "tank" ? 6 : type === "fast" ? 1 : 2) * Math.ceil(wave / 2);
      const vy = type === "fast" ? 2.5 : type === "tank" ? 0.7 : 1.4;
      enemies.push({ x: 40 + Math.random() * (W - 80), y: -30, vx: (Math.random() - 0.5) * 0.6, vy, r: radius, hp, type, t: 0 });
    };

    const BOSSES = [
      { name: "VOID HERALD",    color: "#f0abfc", accent: "#22d3ee" },
      { name: "CRIMSON MAW",    color: "#fb7185", accent: "#fbbf24" },
      { name: "ECHO LEVIATHAN", color: "#a855f7", accent: "#a3e635" },
      { name: "NULL SOVEREIGN", color: "#22d3ee", accent: "#f0abfc" },
      { name: "ASHEN WYRM",     color: "#fb923c", accent: "#fde047" },
      { name: "GLACIAL TYRANT", color: "#67e8f9", accent: "#a5f3fc" },
      { name: "OBSIDIAN REAPER",color: "#a3a3a3", accent: "#fb7185" },
      { name: "STAR DEVOURER",  color: "#facc15", accent: "#f97316" },
    ];
    const spawnBoss = () => {
      const idx = Math.max(0, Math.floor(wave / 5 - 1)) % BOSSES.length;
      const def = BOSSES[idx];
      const hp = 220 + wave * 55;
      boss = {
        x: W / 2, y: -80, vx: 2.2 + wave * 0.1, r: 46, hp, maxHp: hp,
        t: 0, fireT: 600, name: def.name, color: def.color, accent: def.accent, dashCD: 4000,
      };
      bossIntroT = 1200;
    };

    const novaBomb = () => {
      if (ship.bombs <= 0 || ship.bombCD > 0) return;
      ship.bombs--; ship.bombCD = 900;
      spawnExplosion(ship.x, ship.y, "#22d3ee", 60);
      spawnExplosion(ship.x, ship.y, "#f0abfc", 40);
      ebullets.length = 0;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.hp! -= 8 * upgrades.dmg;
        spawnExplosion(e.x, e.y, "#f0abfc", 14);
        if (e.hp! <= 0) { score += 80; enemies.splice(i, 1); }
      }
      if (boss) { boss.hp -= 60 * upgrades.dmg; spawnExplosion(boss.x, boss.y, "#22d3ee", 40); }
    };
    const shieldBurst = () => {
      if (ship.shieldCD > 0) return;
      ship.shieldT = 4200 + upgrades.shield * 200;
      ship.shieldCD = 9000;
      spawnExplosion(ship.x, ship.y, "#22d3ee", 36);
    };
    actionsRef.current = { shield: shieldBurst, bomb: novaBomb };

    const update = (dt: number) => {
      // input
      let dx = 0, dy = 0;
      if (keys["a"] || keys["arrowleft"]) dx -= 1;
      if (keys["d"] || keys["arrowright"]) dx += 1;
      if (keys["w"] || keys["arrowup"]) dy -= 1;
      if (keys["s"] || keys["arrowdown"]) dy += 1;
      const speed = shipDef.speed;
      if (touchTarget) {
        const tx = touchTarget.x - ship.x;
        const ty = touchTarget.y - 80 - ship.y;
        const d = Math.hypot(tx, ty);
        if (d > 2) { ship.x += (tx / d) * Math.min(speed, d); ship.y += (ty / d) * Math.min(speed, d); }
      } else {
        const m = Math.hypot(dx, dy) || 1;
        ship.x += (dx / m) * speed; ship.y += (dy / m) * speed;
      }
      ship.x = Math.max(ship.r, Math.min(W - ship.r, ship.x));
      ship.y = Math.max(ship.r, Math.min(H - ship.r, ship.y));

      // fire
      ship.cool -= dt;
      const wantFire = keys[" "] || keys["space"] || touchTarget !== null;
      if ((wantFire || true) && ship.cool <= 0) {
        const fireDelay = 220 / (upgrades.fire * shipDef.fireMul);
        ship.cool = fireDelay;
        const bSize = shipDef.id === "titan" ? 5 : 3;
        bullets.push({ x: ship.x - 8, y: ship.y - 10, vx: 0, vy: -12, r: bSize, type: "p" });
        bullets.push({ x: ship.x + 8, y: ship.y - 10, vx: 0, vy: -12, r: bSize, type: "p" });
        if (upgrades.fire >= 3 || shipDef.id === "phantom")
          bullets.push({ x: ship.x, y: ship.y - 14, vx: 0, vy: -14, r: bSize + 1, type: "p" });
        if (shipDef.id === "titan")
          bullets.push({ x: ship.x, y: ship.y - 14, vx: 0, vy: -10, r: 7, type: "heavy" });
        if (upgrades.fire >= 4) {
          bullets.push({ x: ship.x - 14, y: ship.y - 6, vx: -2.4, vy: -11, r: bSize, type: "p" });
          bullets.push({ x: ship.x + 14, y: ship.y - 6, vx: 2.4, vy: -11, r: bSize, type: "p" });
        }
        if (upgrades.fire >= 5) {
          bullets.push({ x: ship.x, y: ship.y - 20, vx: 0, vy: -16, r: bSize + 2, type: "heavy" });
        }
        if (upgrades.fire >= 6) {
          // Side beams — sweeping lateral fire
          bullets.push({ x: ship.x - 18, y: ship.y, vx: -8, vy: -6, r: bSize, type: "p" });
          bullets.push({ x: ship.x + 18, y: ship.y, vx: 8, vy: -6, r: bSize, type: "p" });
        }
        if (upgrades.fire >= 7) {
          // Rear guard — covers your back
          bullets.push({ x: ship.x - 6, y: ship.y + 8, vx: -1.2, vy: 9, r: bSize, type: "p" });
          bullets.push({ x: ship.x + 6, y: ship.y + 8, vx: 1.2, vy: 9, r: bSize, type: "p" });
        }
        if (upgrades.fire >= 8) {
          // Homing missile — locks onto nearest enemy
          let tx = ship.x, ty = -200, best = Infinity;
          for (const en of enemies) {
            const d = (en.x - ship.x) ** 2 + (en.y - ship.y) ** 2;
            if (d < best) { best = d; tx = en.x; ty = en.y; }
          }
          const ang = Math.atan2(ty - ship.y, tx - ship.x);
          bullets.push({ x: ship.x, y: ship.y - 18, vx: Math.cos(ang) * 13, vy: Math.sin(ang) * 13, r: bSize + 3, type: "heavy" });
        }
        if (upgrades.fire >= 9) {
          // Plasma burst — radial scatter that shreds swarms
          for (let k = -2; k <= 2; k++) {
            const a = -Math.PI / 2 + k * 0.22;
            bullets.push({ x: ship.x, y: ship.y - 16, vx: Math.cos(a) * 12, vy: Math.sin(a) * 12, r: bSize + 1, type: "p" });
          }
        }
        if (upgrades.fire >= 10) {
          // Twin homing lances
          const targets = enemies.slice().sort((a, b) =>
            ((a.x - ship.x) ** 2 + (a.y - ship.y) ** 2) - ((b.x - ship.x) ** 2 + (b.y - ship.y) ** 2)
          ).slice(0, 2);
          for (let k = 0; k < 2; k++) {
            const t = targets[k];
            const ang = t ? Math.atan2(t.y - ship.y, t.x - ship.x) : -Math.PI / 2 + (k === 0 ? -0.25 : 0.25);
            bullets.push({ x: ship.x + (k === 0 ? -10 : 10), y: ship.y - 8, vx: Math.cos(ang) * 14, vy: Math.sin(ang) * 14, r: bSize + 2, type: "heavy" });
          }
        }
      }

      // shield/bomb cooldowns + key triggers
      if (ship.shieldCD > 0) ship.shieldCD -= dt;
      if (ship.shieldT > 0) ship.shieldT -= dt;
      if (ship.bombCD > 0) ship.bombCD -= dt;
      if (keys["e"]) { shieldBurst(); keys["e"] = false; }
      if (keys["q"]) { novaBomb(); keys["q"] = false; }

      // stars
      for (const s of stars) {
        s.z -= 0.005;
        if (s.z <= 0) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = 1; }
      }

      // bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; b.y += b.vy; if (b.y < -10) bullets.splice(i, 1);
      }
      // ebullets
      for (let i = ebullets.length - 1; i >= 0; i--) {
        const b = ebullets[i]; b.x += b.vx; b.y += b.vy;
        if (b.y > H + 10 || b.x < -10 || b.x > W + 10) ebullets.splice(i, 1);
      }
      // enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]; e.t = (e.t || 0) + dt;
        e.x += e.vx; e.y += e.vy;
        if (e.x < e.r || e.x > W - e.r) e.vx *= -1;
        // fire
        if (e.type !== "fast" && Math.random() < 0.004 * wave) {
          const ang = Math.atan2(ship.y - e.y, ship.x - e.x);
          ebullets.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 4, vy: Math.sin(ang) * 4, r: 4 });
        }
        if (e.y > H + 40) enemies.splice(i, 1);
      }
      // particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.t! -= 0.02;
        if (p.t! <= 0) particles.splice(i, 1);
      }
      // powerups
      for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i]; p.y += p.vy;
        if (Math.hypot(p.x - ship.x, p.y - ship.y) < ship.r + p.r) {
          if (p.type === "heal") ship.hp = Math.min(ship.maxHp, ship.hp + 30);
          else if (p.type === "credit") credits += 25;
          else if (p.type === "bomb") ship.bombs = Math.min(5, ship.bombs + 1);
          powerups.splice(i, 1);
          spawnExplosion(p.x, p.y, p.type === "heal" ? "#22d3ee" : p.type === "bomb" ? "#fbbf24" : "#f0abfc", 8);
        } else if (p.y > H + 20) powerups.splice(i, 1);
      }

      // ===== BOSS update =====
      if (boss) {
        boss.t += dt;
        if (bossIntroT > 0) {
          bossIntroT -= dt;
          boss.y = Math.min(110, boss.y + 0.9);
        } else {
          boss.x += boss.vx;
          if (boss.x < boss.r + 10 || boss.x > W - boss.r - 10) boss.vx *= -1;
          boss.y = 110 + Math.sin(boss.t / 700) * 20;
          boss.fireT -= dt;
          boss.dashCD -= dt;
          if (boss.fireT <= 0) {
            boss.fireT = Math.max(380, 900 - wave * 15);
            const ratio = boss.hp / boss.maxHp;
            if (ratio < 0.4) {
              const base = boss.t / 300;
              for (let k = 0; k < 8; k++) {
                const a = base + (k * Math.PI) / 4;
                ebullets.push({ x: boss.x, y: boss.y, vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 3.2, r: 5 });
              }
            } else if (ratio < 0.75) {
              const ang = Math.atan2(ship.y - boss.y, ship.x - boss.x);
              for (let k = -1; k <= 1; k++) {
                const a = ang + k * 0.25;
                ebullets.push({ x: boss.x, y: boss.y, vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5, r: 5 });
              }
            } else {
              const ang = Math.atan2(ship.y - boss.y, ship.x - boss.x);
              ebullets.push({ x: boss.x, y: boss.y, vx: Math.cos(ang) * 5, vy: Math.sin(ang) * 5, r: 6 });
            }
          }
          if (boss.dashCD <= 0 && boss.hp / boss.maxHp < 0.5) {
            boss.dashCD = 5000;
            boss.vx = (ship.x > boss.x ? 1 : -1) * 6;
          }
        }
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          if (Math.hypot(boss.x - b.x, boss.y - b.y) < boss.r + b.r) {
            bullets.splice(j, 1);
            const dmg = (b.type === "heavy" ? 3 : 1) * upgrades.dmg;
            boss.hp -= dmg;
            spawnExplosion(b.x, b.y, boss.accent, 4);
          }
        }
        if (Math.hypot(boss.x - ship.x, boss.y - ship.y) < boss.r + ship.r) {
          if (ship.shieldT <= 0 && ship.inv <= 0) { ship.hp -= 30; ship.inv = 500; spawnExplosion(ship.x, ship.y, boss.color, 16); }
        }
        if (boss.hp <= 0) {
          spawnExplosion(boss.x, boss.y, boss.color, 80);
          spawnExplosion(boss.x, boss.y, boss.accent, 60);
          score += 2000 + wave * 100;
          credits += 200;
          ship.bombs = Math.min(5, ship.bombs + 2);
          for (let k = 0; k < 3; k++) powerups.push({ x: boss.x + (k - 1) * 30, y: boss.y, vx: 0, vy: 1.5, r: 11, type: k === 0 ? "heal" : k === 1 ? "credit" : "bomb" });
          boss = null;
          bossWave = false;
          waveBreak = 2000;
        }
      }

      // collisions: bullets x enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
            bullets.splice(j, 1);
            e.hp! -= 1 * upgrades.dmg;
            spawnExplosion(b.x, b.y, "#22d3ee", 4);
            if (e.hp! <= 0) {
              spawnExplosion(e.x, e.y, e.type === "tank" ? "#f0abfc" : "#a855f7", 22);
              const reward = e.type === "tank" ? 200 : e.type === "fast" ? 80 : 100;
              score += reward;
              if (Math.random() < 0.15) powerups.push({ x: e.x, y: e.y, vx: 0, vy: 1.5, r: 10, type: Math.random() < 0.5 ? "heal" : "credit" });
              enemies.splice(i, 1);
              break;
            }
          }
        }
      }
      // ebullets x ship
      if (ship.inv > 0) ship.inv -= dt;
      for (let i = ebullets.length - 1; i >= 0; i--) {
        const b = ebullets[i];
        if (Math.hypot(b.x - ship.x, b.y - ship.y) < ship.r + b.r) {
          ebullets.splice(i, 1);
          if (ship.shieldT > 0) { spawnExplosion(b.x, b.y, "#22d3ee", 6); }
          else if (ship.inv <= 0) { ship.hp -= 12; ship.inv = 300; spawnExplosion(ship.x, ship.y, "#fb7185", 10); }
        }
      }
      // ram
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (Math.hypot(e.x - ship.x, e.y - ship.y) < e.r + ship.r) {
          enemies.splice(i, 1); spawnExplosion(e.x, e.y, "#f0abfc", 20);
          if (ship.shieldT <= 0 && ship.inv <= 0) { ship.hp -= 20; ship.inv = 400; }
        }
      }

      // spawn
      spawnT -= dt;
      if (!boss && !bossWave && enemiesToSpawn > 0 && spawnT <= 0) {
        spawnEnemy(); enemiesToSpawn--; spawnT = Math.max(180, 700 - wave * 30);
      } else if (!boss && enemiesToSpawn === 0 && enemies.length === 0) {
        waveBreak -= dt;
        if (waveBreak <= 0) {
          wave++; enemiesToSpawn = 5 + wave * 2; waveBreak = 1500;
          credits += 50; score += 250;
          if (wave % 5 === 0) { bossWave = true; spawnBoss(); }
        }
      }

      if (ship.hp <= 0) {
        running = false;
        cancelAnimationFrame(raf);
        spawnExplosion(ship.x, ship.y, "#f0abfc", 60);
        setTimeout(() => onEnd(Math.floor(score), wave, credits), 300);
      }

      // push hud (lightweight)
      stateRef.current = {
        score, wave, hp: ship.hp, maxHp: ship.maxHp, credits,
        shieldT: ship.shieldT, shieldCD: ship.shieldCD, bombs: ship.bombs,
        boss: boss ? { name: boss.name, hp: boss.hp, maxHp: boss.maxHp, color: boss.color } : null,
      };
    };

    const render = () => {
      ctx.fillStyle = "rgba(10, 4, 28, 0.35)";
      ctx.fillRect(0, 0, W, H);

      // stars
      for (const s of stars) {
        const sx = (s.x / s.z) * (W / 2) + W / 2;
        const sy = (s.y / s.z) * (H / 2) + H / 2;
        const size = (1 - s.z) * 2.5;
        ctx.fillStyle = `rgba(180,220,255,${1 - s.z})`;
        ctx.fillRect(sx, sy, size, size);
      }

      // particles
      for (const p of particles) {
        ctx.fillStyle = p.type as string;
        ctx.globalAlpha = Math.max(0, p.t!);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // bullets
      for (const b of bullets) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 12);
        g.addColorStop(0, "rgba(34,211,238,1)");
        g.addColorStop(1, "rgba(34,211,238,0)");
        ctx.fillStyle = g; ctx.fillRect(b.x - 12, b.y - 12, 24, 24);
        ctx.fillStyle = "#e6fbff"; ctx.fillRect(b.x - 1.5, b.y - 6, 3, 12);
      }
      // ebullets
      for (const b of ebullets) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 14);
        g.addColorStop(0, "rgba(240,171,252,1)");
        g.addColorStop(1, "rgba(240,171,252,0)");
        ctx.fillStyle = g; ctx.fillRect(b.x - 14, b.y - 14, 28, 28);
      }

      // enemies
      for (const e of enemies) {
        const col = e.type === "tank" ? "#f0abfc" : e.type === "fast" ? "#a855f7" : "#7c3aed";
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(Math.sin((e.t || 0) / 200) * 0.2);
        ctx.fillStyle = col;
        ctx.shadowColor = col; ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(0, e.r);
        ctx.lineTo(-e.r, -e.r * 0.6);
        ctx.lineTo(0, -e.r * 0.3);
        ctx.lineTo(e.r, -e.r * 0.6);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.3, e.r * 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // powerups
      for (const p of powerups) {
        const col = p.type === "heal" ? "#22d3ee" : "#f0abfc";
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(performance.now() / 400);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.strokeRect(-p.r, -p.r, p.r * 2, p.r * 2);
        ctx.fillStyle = col; ctx.font = "bold 12px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(p.type === "heal" ? "+" : "◈", 0, 1);
        ctx.restore();
      }

      // ship
      ctx.save();
      ctx.translate(ship.x, ship.y);
      const blink = ship.inv > 0 && Math.floor(performance.now() / 60) % 2;
      ctx.globalAlpha = blink ? 0.4 : 1;
      // thruster
      const flick = 0.7 + Math.random() * 0.3;
      const tg = ctx.createLinearGradient(0, ship.r, 0, ship.r + 30 * flick);
      tg.addColorStop(0, shipDef.color); tg.addColorStop(1, "rgba(124,58,237,0)");
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.moveTo(-6, ship.r); ctx.lineTo(6, ship.r); ctx.lineTo(0, ship.r + 30 * flick); ctx.closePath(); ctx.fill();
      // body
      ctx.fillStyle = shipDef.color; ctx.shadowColor = shipDef.color; ctx.shadowBlur = 20;
      ctx.beginPath();
      if (shipDef.id === "phantom") {
        ctx.moveTo(0, -ship.r);
        ctx.lineTo(ship.r, ship.r * 0.5);
        ctx.lineTo(ship.r * 0.4, ship.r * 0.9);
        ctx.lineTo(-ship.r * 0.4, ship.r * 0.9);
        ctx.lineTo(-ship.r, ship.r * 0.5);
      } else if (shipDef.id === "titan") {
        ctx.moveTo(-ship.r * 0.5, -ship.r * 0.9);
        ctx.lineTo(ship.r * 0.5, -ship.r * 0.9);
        ctx.lineTo(ship.r, ship.r * 0.7);
        ctx.lineTo(-ship.r, ship.r * 0.7);
      } else {
        ctx.moveTo(0, -ship.r);
        ctx.lineTo(ship.r, ship.r * 0.8);
        ctx.lineTo(0, ship.r * 0.4);
        ctx.lineTo(-ship.r, ship.r * 0.8);
      }
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = shipDef.accent;
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      if (ship.shieldT > 0) {
        ctx.strokeStyle = "rgba(34,211,238,0.85)"; ctx.lineWidth = 2;
        ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, ship.r + 10 + Math.sin(performance.now() / 100) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // ===== BOSS render =====
      if (boss) {
        ctx.save();
        ctx.translate(boss.x, boss.y);
        ctx.rotate(Math.sin(boss.t / 600) * 0.15);
        ctx.shadowColor = boss.color; ctx.shadowBlur = 30;
        ctx.fillStyle = boss.color;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const x = Math.cos(a) * boss.r, y = Math.sin(a) * boss.r;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = boss.accent;
        ctx.beginPath(); ctx.arc(0, 0, boss.r * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0a0418";
        ctx.beginPath(); ctx.arc(0, 0, boss.r * 0.22, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 4; k++) {
          const a = boss.t / 400 + (k * Math.PI) / 2;
          ctx.fillStyle = boss.accent;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * (boss.r + 14), Math.sin(a) * (boss.r + 14), 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // bomb flash
      if (ship.bombCD > 700) {
        ctx.fillStyle = `rgba(34,211,238,${(ship.bombCD - 700) / 200})`;
        ctx.fillRect(0, 0, W, H);
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(50, now - last); last = now;
      if (running) update(dt);
      render();
      if (running) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // hud sync
    const hudInt = setInterval(() => {
      if (stateRef.current) setLocalHud({ ...stateRef.current });
    }, 100);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      clearInterval(hudInt);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      canvas.removeEventListener("touchstart", tStart);
      canvas.removeEventListener("touchmove", tMove);
      canvas.removeEventListener("touchend", tEnd);
    };
  }, [upgrades, onEnd, shipDef]);

  const hpPct = Math.max(0, Math.min(100, (localHud.hp / (localHud.maxHp || 1)) * 100));
  const bossPct = localHud.boss ? Math.max(0, (localHud.boss.hp / localHud.boss.maxHp) * 100) : 0;
  const shieldReady = (localHud.shieldCD ?? 0) <= 0;

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        <div className="glass pointer-events-auto rounded-2xl px-4 py-2">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">HULL</span>
            <div className="h-2 w-28 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 transition-all" style={{ width: `${hpPct}%` }} />
            </div>
          </div>
          <div className="mt-1 flex gap-4 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Wave <span className="text-accent">{localHud.wave}</span></span>
            <span>◈ <span className="text-foreground">{localHud.credits}</span></span>
          </div>
        </div>
        <div className="glass pointer-events-auto rounded-2xl px-4 py-2 text-right">
          <div className="font-display text-xl font-black text-gradient">{localHud.score.toLocaleString()}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Score</div>
        </div>
      </div>
      <button onClick={onQuit} className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full glass px-4 py-2 text-xs uppercase tracking-widest hover:text-accent">
        Eject
      </button>

      {localHud.boss && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 mx-auto max-w-md px-4">
          <div className="glass rounded-xl p-2">
            <div className="flex items-center justify-between px-1 text-[10px] uppercase tracking-[0.3em]" style={{ color: localHud.boss.color }}>
              <span>⚠ {localHud.boss.name}</span>
              <span className="text-muted-foreground">SOVEREIGN</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full transition-all" style={{ width: `${bossPct}%`, background: `linear-gradient(90deg, ${localHud.boss.color}, #f0abfc)` }} />
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => actionsRef.current?.bomb()}
          disabled={(localHud.bombs ?? 0) <= 0}
          className="relative h-14 w-14 rounded-full border border-amber-300/40 bg-gradient-to-br from-amber-400/30 to-fuchsia-500/30 font-display text-xl text-foreground active:scale-95 disabled:opacity-40"
          aria-label="Nova bomb"
        >
          ✸
          <span className="absolute -bottom-1 -right-1 rounded-full bg-background/80 px-1.5 text-[10px] font-mono">{localHud.bombs ?? 0}</span>
        </button>
        <button
          onClick={() => actionsRef.current?.shield()}
          disabled={!shieldReady}
          className="group relative h-16 w-16 rounded-full border-2 border-cyan-300/70 bg-gradient-to-br from-cyan-400/40 via-sky-500/30 to-fuchsia-500/30 text-foreground shadow-[0_0_24px_rgba(34,211,238,0.55)] transition-transform active:scale-95 disabled:opacity-40 disabled:shadow-none"
          aria-label="Shield burst"
        >
          {shieldReady && (
            <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-cyan-300/60 animate-ping" />
          )}
          <span className="pointer-events-none absolute inset-1.5 rounded-full border border-cyan-200/40" />
          <svg viewBox="0 0 24 24" className="relative mx-auto h-7 w-7 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          {!shieldReady && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 text-[11px] font-mono font-bold text-cyan-200">
              {Math.ceil((localHud.shieldCD ?? 0) / 1000)}s
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

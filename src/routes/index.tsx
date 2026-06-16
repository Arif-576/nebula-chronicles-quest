import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthScreen } from "@/components/AuthScreen";
import { Logo } from "@/components/Logo";
import { SHIPS, SHIP_BY_ID, type ShipDef, type ShipId } from "@/game/ships";
import { MAX_LEVEL, regionForLevel, difficulty, bossReward } from "@/game/regions";
import { loadProgress, saveProgress, shipUpgrades, type Progress } from "@/lib/progress";
import { ShipIcon as ShipBadge, hullPathPoints } from "@/game/ShipIcon";
import { sfx, initAudio, isMuted, toggleMuted } from "@/lib/sfx";

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

// Fire-rate / weapon-tier proxy derived from cloud upgrades.
// Power level scales weapon variety so endgame ships unlock the full arsenal.
function weaponTier(power: number) { return 1 + Math.floor(power * 1.1); }

function GameApp() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [name, setName] = useState("PILOT");
  const [hud, setHud] = useState({ score: 0, wave: 1, hp: 100, credits: 0 });
  const [lb, setLb] = useState<ReturnType<typeof loadLB>>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [reward, setReward] = useState<{ diamonds: number; coins: number; kind: "mini" | "region"; level: number } | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      const u = session?.user;
      if (u) {
        setUserId(u.id);
        const meta = (u.user_metadata as any) || {};
        const display = (meta.username ?? u.email?.split("@")[0] ?? "PILOT").toUpperCase().slice(0, 10);
        setName(display);
        loadProgress(u.id).then(setProgress);
      } else {
        setUserId(null); setProgress(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setAuthed(!!s);
      if (s?.user) {
        setUserId(s.user.id);
        const meta = (s.user.user_metadata as any) || {};
        const display = (meta.username ?? s.user.email?.split("@")[0] ?? "PILOT").toUpperCase().slice(0, 10);
        setName(display);
        loadProgress(s.user.id).then(setProgress);
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { setLb(loadLB()); }, [screen]);

  const onGameOver = useCallback(async (score: number, wave: number, credits: number) => {
    saveLB(name || "PILOT", score, wave);
    if (progress && userId) {
      const next: Progress = {
        ...progress,
        coins: progress.coins + credits,
        max_level: Math.max(progress.max_level, wave),
        max_region: Math.max(progress.max_region, regionForLevel(wave).id),
        best_score: Math.max(progress.best_score, score),
      };
      setProgress(next);
      await saveProgress(userId, {
        coins: next.coins, max_level: next.max_level,
        max_region: next.max_region, best_score: next.best_score,
      });
    }
    setHud((h) => ({ ...h, score, wave, credits }));
    setScreen("gameover");
  }, [name, progress, userId]);

  const onBossKilled = useCallback((level: number) => {
    setReward({ ...bossReward(level), level });
  }, []);

  const claimReward = useCallback(async () => {
    if (!reward || !progress || !userId) { setReward(null); return; }
    const next: Progress = {
      ...progress,
      diamonds: progress.diamonds + reward.diamonds,
      coins: progress.coins + reward.coins,
    };
    setProgress(next);
    await saveProgress(userId, { diamonds: next.diamonds, coins: next.coins });
    setReward(null);
  }, [reward, progress, userId]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <BackgroundFX />
      {authed === null && (
        <div className="absolute inset-0 z-30 grid place-items-center">
          <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Connecting…</div>
        </div>
      )}
      {authed === false && (
        <AuthScreen onAuthed={(u) => { setName(u); setAuthed(true); }} />
      )}
      {authed && progress && screen === "menu" && (
        <Menu
          name={name} setName={setName}
          onPlay={() => setScreen("play")}
          onLB={() => setScreen("leaderboard")}
          progress={progress}
          onSignOut={async () => { await supabase.auth.signOut(); setAuthed(false); setProgress(null); }}
        />
      )}
      {authed && progress && screen === "play" && (
        <Game
          progress={progress}
          ship={SHIP_BY_ID[progress.active_ship] ?? SHIPS[0]}
          onHud={setHud}
          onEnd={onGameOver}
          onQuit={() => setScreen("menu")}
          onBossKilled={onBossKilled}
          startLevel={1}
          hud={hud}
        />
      )}
      {authed && screen === "gameover" && (
        <GameOver hud={hud} onRetry={() => setScreen("play")} onMenu={() => setScreen("menu")} />
      )}
      {authed && screen === "leaderboard" && (
        <Leaderboard lb={lb} onBack={() => setScreen("menu")} />
      )}
      {reward && (
        <RewardBox reward={reward} onClaim={claimReward} />
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

function Menu({ name, setName, onPlay, onLB, progress, onSignOut }: any) {
  const p: Progress = progress;
  const ship = SHIP_BY_ID[p.active_ship as ShipId] ?? SHIPS[0];
  const region = regionForLevel(p.max_level);
  const nextLevel = Math.min(MAX_LEVEL, p.max_level);
  return (
    <div className="relative z-10 mx-auto flex h-full max-w-md flex-col items-center gap-5 overflow-y-auto px-6 py-8 text-center">
      <Logo size={76} />
      <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-accent">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> v4 SOVEREIGN · 6 Regions · 60 Levels
      </div>
      <h1 className="font-display text-4xl font-black leading-none sm:text-5xl">
        NEBULAR<br /><span className="text-gradient">ECHO</span>
      </h1>
      <p className="text-xs text-muted-foreground">
        Push through six regions, slay Sovereign bosses, crack reward boxes, and forge your fleet in the Hangar.
      </p>

      <div className="grid w-full grid-cols-2 gap-2">
        <div className="glass rounded-xl p-3 text-left">
          <div className="text-[10px] uppercase tracking-widest text-cyan-300">💎 Diamonds</div>
          <div className="font-mono text-lg">{p.diamonds.toLocaleString()}</div>
        </div>
        <div className="glass rounded-xl p-3 text-left">
          <div className="text-[10px] uppercase tracking-widest text-amber-300">◈ Coins</div>
          <div className="font-mono text-lg">{p.coins.toLocaleString()}</div>
        </div>
      </div>

      <div className="glass w-full rounded-2xl p-3 text-left">
        <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: region.color }}>
          Sector {region.id} · {region.name}
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">{region.tagline}</div>
        <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>Best Level <span className="text-accent">L{p.max_level}/{MAX_LEVEL}</span></span>
          <span>Best Score <span className="text-accent">{p.best_score.toLocaleString()}</span></span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full" style={{ width: `${(nextLevel / MAX_LEVEL) * 100}%`, background: `linear-gradient(90deg, ${region.color}, #f0abfc)` }} />
        </div>
      </div>

      <input
        value={name}
        maxLength={10}
        onChange={(e) => setName(e.target.value.toUpperCase())}
        className="w-full rounded-full glass px-5 py-3 text-center font-mono tracking-widest outline-none focus:border-accent"
        placeholder="CALLSIGN"
      />

      <div className="w-full glass rounded-2xl p-3 flex items-center gap-3 text-left">
        <ShipIcon ship={ship} size={44} />
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.3em] text-accent">Active Frame</div>
          <div className="font-display text-sm font-black">{ship.name}</div>
          <div className="text-[10px] text-muted-foreground">{ship.tag}</div>
        </div>
        <Link to="/hangar" className="rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-background">
          Hangar
        </Link>
      </div>

      <button
        onClick={onPlay}
        className="w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-8 py-4 font-display text-lg font-black tracking-widest text-background neon-glow transition-transform active:scale-95"
      >▶ LAUNCH</button>

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
  return <ShipBadge ship={ship} size={size} />;
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

function RewardBox({ reward, onClaim }: { reward: { diamonds: number; coins: number; kind: "mini" | "region"; level: number }; onClaim: () => void }) {
  const big = reward.kind === "region";
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/60 backdrop-blur-sm">
      <div className="glass mx-6 w-full max-w-sm rounded-3xl p-6 text-center neon-glow">
        <div className="text-[10px] uppercase tracking-[0.4em] text-accent">
          {big ? "Region Boss Down" : "Boss Down"}
        </div>
        <div className="my-2 text-5xl" style={{ animation: "pulse 1.4s ease-in-out infinite" }}>🎁</div>
        <h2 className="font-display text-2xl font-black">
          REWARD <span className="text-gradient">{big ? "VAULT" : "BOX"}</span>
        </h2>
        <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Level {reward.level} clear</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-cyan-300/40 bg-cyan-300/10 p-3">
            <div className="text-[10px] uppercase tracking-widest text-cyan-300">Diamonds</div>
            <div className="font-display text-2xl font-black">💎 {reward.diamonds}</div>
          </div>
          <div className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-3">
            <div className="text-[10px] uppercase tracking-widest text-amber-300">Coins</div>
            <div className="font-display text-2xl font-black">◈ {reward.coins}</div>
          </div>
        </div>
        <button
          onClick={onClaim}
          className="mt-5 w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-6 py-3 font-display font-black tracking-widest text-background neon-glow active:scale-95"
        >
          ✦ CLAIM
        </button>
      </div>
    </div>
  );
}

function Game({ progress, ship: shipDef, onHud, onEnd, onQuit, onBossKilled, startLevel, hud }: any) {
  // Derive legacy "upgrades" shape from cloud progress + ship upgrades.
  const su = shipUpgrades(progress as Progress, shipDef.id as ShipId);
  const upgrades = {
    dmg: 1 + su.power * 0.18,
    fire: weaponTier(su.power),
    shield: 1 + su.defense * 0.15,
    credits: 0,
  };
  const speedBoost = 1 + su.speed * 0.12;
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
    const ship: any = {
      x: W / 2, y: H - 100,
      r: shipDef.id === "titan" ? 17 : shipDef.id === "phantom" ? 12 : 14,
      hp: baseHp, maxHp: baseHp, cool: 0, inv: 0,
      shieldT: 0, shieldCD: 0, bombs: 1, bombCD: 0,
      overdriveT: 0, overdriveKind: "" as "" | "rapid" | "pierce" | "laser",
    };
    const bullets: Entity[] = [];
    const enemies: Entity[] = [];
    const ebullets: Entity[] = [];
    const particles: Entity[] = [];
    const powerups: Entity[] = [];
    let boss: any = null;
    let bossIntroT = 0;
    let bossWave = false;

    let score = 0, wave = (startLevel as number) || 1, credits = 0, spawnT = 0;
    let enemiesToSpawn = difficulty(wave).waveCount, waveBreak = 0;
    let last = performance.now();
    let raf = 0;
    let running = true;
    // Combo system: chained kills within ~1.6s multiply score and feel great.
    let combo = 0, comboT = 0, comboBest = 0;
    let shakeT = 0, shakeMag = 0;
    const addShake = (mag: number, dur = 220) => { shakeMag = Math.max(shakeMag, mag); shakeT = Math.max(shakeT, dur); };
    let floats: { x: number; y: number; vy: number; t: number; text: string; color: string }[] = [];
    const addFloat = (x: number, y: number, text: string, color: string) => {
      floats.push({ x, y, vy: -1.2, t: 900, text, color });
    };

    const spawnExplosion = (x: number, y: number, color: string, n = 18) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 4;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 1 + Math.random() * 2, t: 1, type: color });
      }
    };

    const spawnEnemy = () => {
      const r = Math.random();
      // Unlock more variety as the player advances.
      let type: string;
      if (wave >= 8 && r < 0.18) type = "weaver";
      else if (wave >= 14 && r < 0.27) type = "splitter";
      else if (r < 0.55) type = "grunt";
      else if (r < 0.82) type = "fast";
      else type = "tank";
      const radius = type === "tank" ? 26 : type === "fast" ? 12 : type === "weaver" ? 14 : type === "splitter" ? 20 : 18;
      const diff = difficulty(wave);
      const hpBase = type === "tank" ? 7 : type === "fast" ? 1 : type === "weaver" ? 2 : type === "splitter" ? 4 : 2;
      const hp = Math.max(1, Math.round(hpBase * diff.enemyHp));
      const baseVy = type === "fast" ? 2.6 : type === "tank" ? 0.75 : type === "weaver" ? 1.6 : type === "splitter" ? 1.1 : 1.45;
      const vy = baseVy * diff.enemySpeed;
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
      sfx.bossSpawn();
    };

    const novaBomb = () => {
      if (ship.bombs <= 0 || ship.bombCD > 0) return;
      ship.bombs--; ship.bombCD = 900;
      sfx.bomb();
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
      sfx.shield();
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
      const speed = shipDef.speed * speedBoost;
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
        sfx.shoot();
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
        if (upgrades.fire >= 11) {
          // Flak cone — saturates the lane ahead
          for (let k = -3; k <= 3; k++) {
            const a = -Math.PI / 2 + k * 0.13;
            bullets.push({ x: ship.x, y: ship.y - 18, vx: Math.cos(a) * 13, vy: Math.sin(a) * 13, r: bSize, type: "p" });
          }
        }
        if (upgrades.fire >= 12) {
          // Annihilator lance — huge piercing core round
          bullets.push({ x: ship.x, y: ship.y - 24, vx: 0, vy: -18, r: bSize + 5, type: "annihilator" });
        }
        // Active overdrive buff (only one at a time)
        if (ship.overdriveT > 0 && ship.overdriveKind === "rapid") {
          bullets.push({ x: ship.x - 4, y: ship.y - 12, vx: -1, vy: -15, r: bSize + 1, type: "p" });
          bullets.push({ x: ship.x + 4, y: ship.y - 12, vx: 1, vy: -15, r: bSize + 1, type: "p" });
        }
        if (ship.overdriveT > 0 && ship.overdriveKind === "laser") {
          bullets.push({ x: ship.x, y: ship.y - 20, vx: 0, vy: -22, r: bSize + 3, type: "annihilator" });
        }
      }

      // shield/bomb cooldowns + key triggers
      if (ship.shieldCD > 0) ship.shieldCD -= dt;
      if (ship.shieldT > 0) ship.shieldT -= dt;
      if (ship.bombCD > 0) ship.bombCD -= dt;
      if (ship.overdriveT > 0) ship.overdriveT -= dt;
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
        if (e.type === "weaver") {
          e.vx = Math.sin((e.t || 0) / 280) * 2.6;
        }
        e.x += e.vx; e.y += e.vy;
        if (e.x < e.r || e.x > W - e.r) e.vx *= -1;
        // fire — tanks now fire bursts; everything but pure-fast can shoot.
        const diff = difficulty(wave);
        if (e.type !== "fast" && Math.random() < diff.enemyFire) {
          const ang = Math.atan2(ship.y - e.y, ship.x - e.x);
          const bs = 4 * diff.bulletSpeed;
          if (e.type === "tank") {
            for (let k = -1; k <= 1; k++) {
              const a = ang + k * 0.18;
              ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * bs, vy: Math.sin(a) * bs, r: 5 });
            }
          } else {
            ebullets.push({ x: e.x, y: e.y, vx: Math.cos(ang) * bs, vy: Math.sin(ang) * bs, r: 4 });
          }
        }
        if (e.y > H + 40) enemies.splice(i, 1);
      }
      // particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.t! -= 0.02;
        if (p.t! <= 0) particles.splice(i, 1);
      }
      // floating text
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i]; f.y += f.vy; f.vy *= 0.97; f.t -= dt;
        if (f.t <= 0) floats.splice(i, 1);
      }
      // combo timer
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
      // screen shake decay
      if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeMag = 0; }
      // powerups
      for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i]; p.y += p.vy;
        if (Math.hypot(p.x - ship.x, p.y - ship.y) < ship.r + p.r) {
          sfx.powerup();
          if (p.type === "heal") ship.hp = Math.min(ship.maxHp, ship.hp + 30);
          else if (p.type === "credit") credits += 25;
          else if (p.type === "bomb") ship.bombs = Math.min(5, ship.bombs + 1);
          else if (p.type === "rapid" || p.type === "pierce" || p.type === "laser") {
            // Refined: only ONE timed buff active. Picking a new one replaces it.
            ship.overdriveT = 7000;
            ship.overdriveKind = p.type;
          }
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
            const isAnnihilator = b.type === "annihilator";
            if (!isAnnihilator) bullets.splice(j, 1);
            const odMul = ship.overdriveT > 0 ? 1.6 : 1;
            const dmg = (isAnnihilator ? 7 : b.type === "heavy" ? 3 : 1) * upgrades.dmg * odMul;
            boss.hp -= dmg;
            spawnExplosion(b.x, b.y, boss.accent, 4);
          }
        }
        if (Math.hypot(boss.x - ship.x, boss.y - ship.y) < boss.r + ship.r) {
          if (ship.shieldT <= 0 && ship.inv <= 0) { ship.hp -= 30; ship.inv = 500; spawnExplosion(ship.x, ship.y, boss.color, 16); sfx.playerHit(); }
        }
        if (boss.hp <= 0) {
          sfx.bossKill();
          spawnExplosion(boss.x, boss.y, boss.color, 80);
          spawnExplosion(boss.x, boss.y, boss.accent, 60);
          score += 2000 + wave * 100;
          ship.bombs = Math.min(5, ship.bombs + 2);
          // Boss drop: heal, bomb, and a weapon-overdrive pickup (only one
          // overdrive can be active at a time — picking refreshes/replaces).
          const odKinds = ["rapid", "pierce", "laser"] as const;
          const od = odKinds[Math.floor(Math.random() * odKinds.length)];
          powerups.push({ x: boss.x - 36, y: boss.y, vx: 0, vy: 1.5, r: 11, type: "heal" });
          powerups.push({ x: boss.x,      y: boss.y, vx: 0, vy: 1.4, r: 13, type: od });
          powerups.push({ x: boss.x + 36, y: boss.y, vx: 0, vy: 1.5, r: 11, type: "bomb" });
          onBossKilled?.(wave);
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
            const isAnnihilator = b.type === "annihilator";
            const isHeavy = b.type === "heavy";
            const odMul = ship.overdriveT > 0 ? 1.6 : 1;
            const baseDmg = isAnnihilator ? 6 : isHeavy ? 3 : 1;
            if (!isAnnihilator) bullets.splice(j, 1); // annihilator pierces
            e.hp! -= baseDmg * upgrades.dmg * odMul;
            spawnExplosion(b.x, b.y, "#22d3ee", 4);
            if (e.hp! <= 0) {
              sfx.enemyKill();
              spawnExplosion(e.x, e.y, e.type === "tank" ? "#f0abfc" : "#a855f7", 22);
              const base = e.type === "tank" ? 220 : e.type === "fast" ? 80 : e.type === "weaver" ? 140 : e.type === "splitter" ? 180 : 100;
              combo++; comboT = 1600; comboBest = Math.max(comboBest, combo);
              const mult = 1 + Math.min(combo, 30) * 0.1;
              const reward = Math.round(base * mult);
              score += reward;
              addFloat(e.x, e.y - 6, `+${reward}`, combo >= 5 ? "#facc15" : "#22d3ee");
              if (combo >= 5 && combo % 5 === 0) { addFloat(e.x, e.y - 22, `x${combo} COMBO`, "#f0abfc"); sfx.combo(); }
              if (e.type === "tank") addShake(8, 260);
              else addShake(3, 120);
              // Splitter spawns two faster shards on death.
              if (e.type === "splitter") {
                for (let k = -1; k <= 1; k += 2) {
                  enemies.push({
                    x: e.x, y: e.y, vx: k * 1.6, vy: 1.8 * difficulty(wave).enemySpeed,
                    r: 11, hp: Math.max(1, Math.round(1 * difficulty(wave).enemyHp)),
                    type: "fast", t: 0,
                  });
                }
              }
              if (Math.random() < 0.18) powerups.push({ x: e.x, y: e.y, vx: 0, vy: 1.5, r: 10, type: Math.random() < 0.5 ? "heal" : "credit" });
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
          else if (ship.inv <= 0) { ship.hp -= 12; ship.inv = 300; spawnExplosion(ship.x, ship.y, "#fb7185", 10); sfx.playerHit(); }
        }
      }
      // ram
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (Math.hypot(e.x - ship.x, e.y - ship.y) < e.r + ship.r) {
          enemies.splice(i, 1); spawnExplosion(e.x, e.y, "#f0abfc", 20);
          if (ship.shieldT <= 0 && ship.inv <= 0) { ship.hp -= 20; ship.inv = 400; sfx.playerHit(); }
        }
      }

      // spawn
      spawnT -= dt;
      if (!boss && !bossWave && enemiesToSpawn > 0 && spawnT <= 0) {
        spawnEnemy(); enemiesToSpawn--; spawnT = difficulty(wave).spawnDelay;
      } else if (!boss && enemiesToSpawn === 0 && enemies.length === 0) {
        waveBreak -= dt;
        if (waveBreak <= 0) {
          wave++;
          const diff = difficulty(wave);
          enemiesToSpawn = diff.waveCount; waveBreak = 1500;
          credits += 30; score += 250;
          const reg = regionForLevel(wave);
          if (wave === reg.startLevel) {
            stateRef.current = { ...(stateRef.current || {}), levelUpT: 2200, levelLabel: `SECTOR ${reg.id} · ${reg.name}` };
          } else {
            stateRef.current = { ...(stateRef.current || {}), levelUpT: 1200, levelLabel: `LEVEL ${wave}` };
          }
          if (wave % 5 === 0) { bossWave = true; spawnBoss(); }
        }
      }

      if (ship.hp <= 0) {
        running = false;
        cancelAnimationFrame(raf);
        addShake(18, 600);
        spawnExplosion(ship.x, ship.y, "#f0abfc", 60);
        sfx.gameOver();
        setTimeout(() => onEnd(Math.floor(score), wave, credits), 300);
      }

      // push hud (lightweight)
      stateRef.current = {
        score, wave, hp: ship.hp, maxHp: ship.maxHp, credits,
        shieldT: ship.shieldT, shieldCD: ship.shieldCD, bombs: ship.bombs,
        boss: boss ? { name: boss.name, hp: boss.hp, maxHp: boss.maxHp, color: boss.color } : null,
        level: wave,
        region: regionForLevel(wave),
        levelUpT: Math.max(0, ((stateRef.current?.levelUpT ?? 0) as number) - dt),
        levelLabel: stateRef.current?.levelLabel,
        overdriveT: ship.overdriveT,
        overdriveKind: ship.overdriveKind,
        combo,
        comboBest,
        comboT,
      };
    };

    const render = () => {
      ctx.save();
      if (shakeMag > 0) {
        const k = shakeMag * (shakeT / 220);
        ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
      }
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
        const col =
          e.type === "tank" ? "#f0abfc" :
          e.type === "fast" ? "#a855f7" :
          e.type === "weaver" ? "#a3e635" :
          e.type === "splitter" ? "#fb923c" :
          "#7c3aed";
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
        const col =
          p.type === "heal"   ? "#22d3ee" :
          p.type === "bomb"   ? "#fbbf24" :
          p.type === "rapid"  ? "#f0abfc" :
          p.type === "pierce" ? "#a3e635" :
          p.type === "laser"  ? "#fb7185" :
                                "#facc15";
        const label =
          p.type === "heal"   ? "+" :
          p.type === "bomb"   ? "✸" :
          p.type === "rapid"  ? "»" :
          p.type === "pierce" ? "P" :
          p.type === "laser"  ? "L" : "◈";
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(performance.now() / 400);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.strokeRect(-p.r, -p.r, p.r * 2, p.r * 2);
        ctx.fillStyle = col; ctx.font = "bold 12px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(label, 0, 1);
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
      // body — unique hull shape per ship, matches hangar silhouette
      ctx.fillStyle = shipDef.color; ctx.shadowColor = shipDef.color; ctx.shadowBlur = 20;
      const pts = hullPathPoints(shipDef.id, ship.r);
      ctx.beginPath();
      pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shipDef.accent; ctx.lineWidth = 1.2; ctx.stroke();
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

      // floating text (score pops)
      for (const f of floats) {
        ctx.globalAlpha = Math.max(0, Math.min(1, f.t / 600));
        ctx.fillStyle = f.color;
        ctx.font = "bold 13px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = f.color; ctx.shadowBlur = 10;
        ctx.fillText(f.text, f.x, f.y);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
      ctx.restore();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipDef.id, startLevel]);

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
            <span style={{ color: localHud.region?.color }}>S{localHud.region?.id ?? 1}</span>
            <span>Lv <span className="text-accent">{localHud.level ?? 1}</span></span>
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

      {(localHud.levelUpT ?? 0) > 0 && localHud.levelLabel && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex justify-center">
          <div className="glass rounded-2xl px-8 py-4 text-center neon-glow" style={{ animation: "pulse 1.2s ease-in-out infinite" }}>
            <div className="text-[10px] uppercase tracking-[0.4em] text-accent">Milestone</div>
            <div className="font-display text-3xl font-black text-gradient">{localHud.levelLabel}</div>
          </div>
        </div>
      )}

      {(localHud.overdriveT ?? 0) > 0 && localHud.overdriveKind && (
        <div className="pointer-events-none absolute left-1/2 top-20 z-10 -translate-x-1/2">
          <div className="glass rounded-full px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-fuchsia-300 neon-glow">
            ⚡ {String(localHud.overdriveKind).toUpperCase()} · {Math.ceil(localHud.overdriveT / 1000)}s
          </div>
        </div>
      )}

      {(localHud.combo ?? 0) >= 2 && (
        <div className="pointer-events-none absolute right-4 top-24 z-10">
          <div className="glass rounded-2xl px-3 py-1.5 text-right">
            <div className="font-display text-xl font-black text-gradient leading-none">x{localHud.combo}</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Combo</div>
            <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-gradient-to-r from-fuchsia-500 to-amber-300" style={{ width: `${Math.max(0, Math.min(100, ((localHud.comboT ?? 0) / 1600) * 100))}%` }} />
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

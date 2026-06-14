import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SHIPS, type ShipDef, type ShipId, UPGRADE_MAX, upgradeCost } from "@/game/ships";
import {
  loadProgress, saveProgress, shipUpgrades, emptyUpgrades,
  type Progress,
} from "@/lib/progress";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/hangar")({
  head: () => ({
    meta: [
      { title: "Hangar — Nebular Echo" },
      { name: "description", content: "Buy new starfighters with diamonds, upgrade power, speed and defense with coins." },
    ],
  }),
  component: HangarPage,
});

function HangarPage() {
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [p, setP] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) { navigate({ to: "/" }); return; }
      setUid(u.id);
      loadProgress(u.id).then(setP);
    });
  }, [navigate]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 1600); };

  const buy = async (s: ShipDef) => {
    if (!p || !uid || busy) return;
    if (p.owned_ships.includes(s.id)) return;
    if (p.diamonds < s.cost) { flash(`Need ${s.cost - p.diamonds}💎 more`); return; }
    setBusy(true);
    const next: Progress = {
      ...p,
      diamonds: p.diamonds - s.cost,
      owned_ships: [...p.owned_ships, s.id],
    };
    setP(next);
    await saveProgress(uid, { diamonds: next.diamonds, owned_ships: next.owned_ships });
    flash(`${s.name} acquired`);
    setBusy(false);
  };

  const equip = async (s: ShipDef) => {
    if (!p || !uid || busy) return;
    if (!p.owned_ships.includes(s.id)) return;
    setBusy(true);
    const next = { ...p, active_ship: s.id };
    setP(next);
    await saveProgress(uid, { active_ship: s.id });
    flash(`${s.name} equipped`);
    setBusy(false);
  };

  const upgrade = async (stat: "power" | "speed" | "defense") => {
    if (!p || !uid || busy) return;
    const id = p.active_ship;
    const cur = shipUpgrades(p, id);
    if (cur[stat] >= UPGRADE_MAX) return;
    const cost = upgradeCost(cur[stat]);
    if (p.coins < cost) { flash(`Need ${cost - p.coins}◈ more`); return; }
    setBusy(true);
    const nextStats = { ...cur, [stat]: cur[stat] + 1 };
    const nextUp = { ...p.upgrades, [id]: nextStats };
    const next = { ...p, coins: p.coins - cost, upgrades: nextUp };
    setP(next);
    await saveProgress(uid, { coins: next.coins, upgrades: next.upgrades });
    flash(`${stat.toUpperCase()} ↑ Lv ${nextStats[stat]}`);
    setBusy(false);
  };

  if (!p) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-background text-foreground">
        <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Loading Hangar…</div>
      </div>
    );
  }

  const active = SHIPS.find((s) => s.id === p.active_ship) ?? SHIPS[0];
  const activeUp = shipUpgrades(p, active.id);

  return (
    <div className="relative min-h-[100dvh] bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-nebula">
        <div className="absolute inset-0 grid-bg opacity-20" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-5 px-5 py-7">
        <div className="flex items-center justify-between">
          <Link to="/" className="rounded-full glass px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent">
            ← Bridge
          </Link>
          <Logo size={48} />
          <div className="flex flex-col items-end text-right">
            <span className="font-mono text-sm text-cyan-300">💎 {p.diamonds.toLocaleString()}</span>
            <span className="font-mono text-sm text-amber-300">◈ {p.coins.toLocaleString()}</span>
          </div>
        </div>

        <div>
          <h1 className="font-display text-3xl font-black leading-none">
            HANGAR <span className="text-gradient">BAY</span>
          </h1>
          <p className="text-xs text-muted-foreground">Unlock starfighters with diamonds. Spend coins to forge power, speed, and defense on your active hull.</p>
        </div>

        {/* Active ship upgrade panel */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-accent">Active Frame</div>
              <div className="font-display text-xl font-black">{active.name}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{active.tag}</div>
            </div>
            <ShipIcon ship={active} size={56} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["power", "speed", "defense"] as const).map((k) => {
              const lv = activeUp[k];
              const cost = upgradeCost(lv);
              const maxed = lv >= UPGRADE_MAX;
              const afford = p.coins >= cost;
              return (
                <button
                  key={k}
                  onClick={() => upgrade(k)}
                  disabled={busy || maxed || !afford}
                  className="rounded-xl border border-border bg-secondary/40 p-3 text-left transition-colors hover:border-accent disabled:opacity-50"
                >
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
                  <div className="mt-0.5 font-display text-lg font-black text-gradient">Lv {lv}<span className="text-xs text-muted-foreground">/{UPGRADE_MAX}</span></div>
                  <div className="mt-1 text-[10px] font-mono text-amber-300">{maxed ? "MAX" : `${cost}◈`}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ship grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SHIPS.map((s) => {
            const owned = p.owned_ships.includes(s.id);
            const active = p.active_ship === s.id;
            return (
              <div
                key={s.id}
                className={`glass relative flex flex-col gap-2 rounded-2xl p-3 ${active ? "ring-2 ring-accent" : ""}`}
              >
                {!owned && (
                  <div className="absolute right-2 top-2 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                    🔒 {s.cost}💎
                  </div>
                )}
                {owned && active && (
                  <div className="absolute right-2 top-2 rounded-full bg-accent/30 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent">
                    Active
                  </div>
                )}
                <div className="flex items-center justify-center py-1" style={{ filter: owned ? "none" : "grayscale(1) brightness(0.55)" }}>
                  <ShipIcon ship={s} size={56} />
                </div>
                <div>
                  <div className="font-display text-sm font-black leading-tight">{s.name}</div>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{s.tag}</div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                  <span>PWR<br/><span className="text-foreground">{(s.dmgMul*10).toFixed(0)}</span></span>
                  <span>SPD<br/><span className="text-foreground">{(s.speed*10).toFixed(0)}</span></span>
                  <span>DEF<br/><span className="text-foreground">{(s.hpMul*10).toFixed(0)}</span></span>
                </div>
                {owned ? (
                  active ? (
                    <div className="rounded-full bg-secondary/60 px-3 py-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                      Equipped
                    </div>
                  ) : (
                    <button
                      onClick={() => equip(s)}
                      disabled={busy}
                      className="rounded-full bg-secondary/60 px-3 py-2 text-[10px] uppercase tracking-widest text-foreground hover:bg-accent/30"
                    >Equip</button>
                  )
                ) : (
                  <button
                    onClick={() => buy(s)}
                    disabled={busy || p.diamonds < s.cost}
                    className="rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-background disabled:opacity-50"
                  >Buy {s.cost}💎</button>
                )}
              </div>
            );
          })}
        </div>

        {msg && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full glass px-5 py-2 text-xs uppercase tracking-widest text-accent">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}

function ShipIcon({ ship, size = 28 }: { ship: ShipDef; size?: number }) {
  const s = size / 2;
  return (
    <svg width={size} height={size} viewBox={`-${s} -${s} ${size} ${size}`}>
      <defs>
        <filter id={`g-h-${ship.id}`}><feGaussianBlur stdDeviation="0.8" /></filter>
      </defs>
      <g filter={`url(#g-h-${ship.id})`}>
        <polygon points={`0,-${s} ${s*0.9},${s*0.7} 0,${s*0.35} -${s*0.9},${s*0.7}`} fill={ship.color} />
      </g>
      <circle cx="0" cy="0" r={s * 0.18} fill={ship.accent} />
    </svg>
  );
}
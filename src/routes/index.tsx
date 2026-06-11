import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import heroImg from "@/assets/hero-space.jpg";
import charNova from "@/assets/char-nova.jpg";
import charZyra from "@/assets/char-zyra.jpg";
import charRook from "@/assets/char-rook.jpg";
import weapon1 from "@/assets/weapon-1.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEBULAR ECHO — 3D Space Combat Saga" },
      { name: "description", content: "Pilot legendary starfighters across a fractured galaxy. Forge weapons, recruit heroes and climb the live leaderboard in Nebular Echo." },
      { property: "og:title", content: "NEBULAR ECHO — 3D Space Combat Saga" },
      { property: "og:description", content: "A neon 3D space RPG with story, characters, weapons, rewards and live leaderboards." },
    ],
  }),
  component: Landing,
});

const characters = [
  {
    name: "Cmdr. NOVA",
    role: "Vanguard Pilot",
    img: charNova,
    desc: "Last survivor of Earth Fleet 7. Time-dilated reflexes and a vendetta against the Hollow Sovereignty.",
    stats: { Speed: 92, Aim: 88, Shield: 70 },
  },
  {
    name: "ZYRA-9",
    role: "Quantum Navigator",
    img: charZyra,
    desc: "Bio-engineered seer who reads jump-gate currents. Her tattoos rewrite when fate shifts.",
    stats: { Speed: 74, Aim: 65, Shield: 95 },
  },
  {
    name: "ROOK-X",
    role: "Heavy Gunner",
    img: charRook,
    desc: "Salvaged war android with a rail-cannon arm and zero memory of the side he fought for.",
    stats: { Speed: 58, Aim: 99, Shield: 82 },
  },
];

const weapons = [
  { tier: "Mythic", name: "Pulse Ion XR-7", dmg: 480, fire: "Beam", color: "from-fuchsia-500 to-cyan-400" },
  { tier: "Legendary", name: "Void-Splitter", dmg: 360, fire: "Burst", color: "from-cyan-400 to-violet-500" },
  { tier: "Epic", name: "Nebula Lash", dmg: 290, fire: "Auto", color: "from-pink-500 to-purple-500" },
  { tier: "Rare", name: "Cryo-Shard MK2", dmg: 210, fire: "Charge", color: "from-cyan-300 to-blue-500" },
];

const leaderboard = [
  { rank: 1, name: "VEX_NULL", score: 184_220, fleet: "Crimson Wake" },
  { rank: 2, name: "Cmdr.Nova", score: 172_980, fleet: "Echo Division" },
  { rank: 3, name: "ZYRA_9", score: 168_104, fleet: "Quantum Drift" },
  { rank: 4, name: "ROOK.X", score: 159_440, fleet: "Iron Halo" },
  { rank: 5, name: "Solstice", score: 151_872, fleet: "Pale Comet" },
  { rank: 6, name: "Hex.Mira", score: 146_005, fleet: "Echo Division" },
];

const updates = [
  { v: "v2.4 — RIFT", date: "Live now", title: "The Rift Awakens", desc: "New PvE raid 'Singularity Heart', co-op of 3, drops Mythic Pulse Ion XR-7." },
  { v: "v2.5 — TIDES", date: "In 12 days", title: "Tides of the Hollow", desc: "Dynamic faction war: planet ownership shifts every 6 hours based on global leaderboard." },
  { v: "v3.0 — EXODUS", date: "Q3", title: "Player-built Stations", desc: "Construct living dockyards, rent hangars to other commanders and earn passive credits." },
];

function Stars() {
  // deterministic random for SSR safety
  const stars = Array.from({ length: 60 }, (_, i) => ({
    top: (i * 37) % 100,
    left: (i * 53) % 100,
    size: (i % 3) + 1,
    delay: (i % 7) * 0.4,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <div className="relative min-h-screen bg-background text-foreground bg-nebula">
      <Stars />

      {/* NAV */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all ${
          scrolled ? "py-3 backdrop-blur-xl bg-background/70 border-b border-border" : "py-5"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <a href="#top" className="flex items-center gap-2 font-display text-lg font-black tracking-widest">
            <span className="inline-block h-3 w-3 rounded-sm bg-gradient-to-br from-fuchsia-500 to-cyan-400 neon-glow" />
            NEBULAR<span className="text-gradient">ECHO</span>
          </a>
          <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
            {["Story", "Heroes", "Arsenal", "Updates", "Rewards", "Leaderboard"].map((n) => (
              <a key={n} href={`#${n.toLowerCase()}`} className="transition-colors hover:text-foreground">
                {n}
              </a>
            ))}
          </nav>
          <a
            href="#play"
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-2 text-sm font-bold text-background neon-glow transition-transform hover:scale-105"
          >
            Play Free
          </a>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="relative min-h-screen overflow-hidden pt-24">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Starship cruising through a neon nebula"
            width={1920}
            height={1280}
            className="h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background" />
          <div className="absolute inset-0 grid-bg opacity-30" />
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 pt-12 pb-32 md:pt-24">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-accent">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> Season 2 · The Rift Awakens
          </div>
          <h1 className="font-display text-5xl font-black leading-[0.95] sm:text-7xl md:text-8xl">
            PILOT THE
            <br />
            <span className="text-gradient">UNCHARTED</span>
            <br />
            VOID.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            A 3D space combat saga where every jump rewrites the galaxy. Forge weapons from
            collapsed stars, command living factions and out-fly real commanders in real time.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="#play"
              className="group relative overflow-hidden rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-8 py-4 font-bold text-background neon-glow transition-transform hover:scale-105"
            >
              <span className="relative z-10">▶ Launch Demo</span>
            </a>
            <a
              href="#story"
              className="rounded-full border border-border glass px-8 py-4 font-semibold transition-colors hover:border-accent"
            >
              Read the Saga
            </a>
          </div>

          <dl className="mt-12 grid w-full max-w-2xl grid-cols-3 gap-6 border-t border-border pt-8">
            {[
              ["2.4M+", "Commanders"],
              ["38", "Star Systems"],
              ["120Hz", "Combat Tick"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="text-3xl font-display font-bold text-gradient">{v}</dt>
                <dd className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* STORY */}
      <section id="story" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader kicker="Chapter 01" title="A Galaxy in Echo" />
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "The Collapse",
                body: "When the Sovereign Engine ruptured, 14 inhabited worlds folded into a single nebula — and time itself began to loop.",
              },
              {
                step: "02",
                title: "The Echo Fleet",
                body: "You inherit a cracked carrier and a crew of survivors. Each jump replays a fragment of the lost war.",
              },
              {
                step: "03",
                title: "Your Choice",
                body: "Heal the rift, exploit it, or become it. 6 endings. 28 branching missions. Permanent galactic consequences.",
              },
            ].map((s) => (
              <article key={s.step} className="glass relative overflow-hidden rounded-2xl p-8">
                <div className="absolute -top-6 -right-4 font-display text-8xl font-black text-white/5">
                  {s.step}
                </div>
                <h3 className="text-xl font-bold">{s.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HEROES */}
      <section id="heroes" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader kicker="Crew Roster" title="Heroes of the Echo Fleet" />
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {characters.map((c) => (
              <article key={c.name} className="group glass relative overflow-hidden rounded-2xl">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={c.img}
                    alt={c.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  <div className="absolute left-4 top-4 rounded-full glass px-3 py-1 text-[10px] uppercase tracking-widest text-accent">
                    {c.role}
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 animate-scan" />
                </div>
                <div className="space-y-4 p-6">
                  <h3 className="font-display text-2xl font-bold">{c.name}</h3>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                  <div className="space-y-2 pt-2">
                    {Object.entries(c.stats).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-3 text-xs">
                        <span className="w-14 uppercase tracking-widest text-muted-foreground">{k}</span>
                        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-500 to-cyan-400"
                            style={{ width: `${v}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-mono text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ARSENAL */}
      <section id="arsenal" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader kicker="Forge & Mods" title="Living Arsenal" />
          <div className="mt-16 grid gap-10 md:grid-cols-2">
            <div className="glass relative overflow-hidden rounded-2xl p-8">
              <img
                src={weapon1}
                alt="Pulse Ion XR-7 plasma rifle"
                loading="lazy"
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
              <div className="mt-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-accent">Mythic · Tier VII</p>
                  <h3 className="mt-1 font-display text-2xl font-bold">Pulse Ion XR-7</h3>
                </div>
                <span className="rounded-full neon-border px-4 py-2 font-mono text-sm">DMG 480</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Forged inside a collapsing star. Beam-class. Pierces 3 hulls. Recharges from kinetic feedback —
                so the more you get hit, the harder it fires back.
              </p>
            </div>
            <ul className="space-y-4">
              {weapons.map((w) => (
                <li
                  key={w.name}
                  className="glass group flex items-center gap-5 rounded-2xl p-5 transition-all hover:translate-x-1 hover:border-accent"
                >
                  <div className={`h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br ${w.color} neon-glow`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-accent">
                      {w.tier} <span className="text-muted-foreground">· {w.fire}</span>
                    </div>
                    <h4 className="font-display text-lg font-bold">{w.name}</h4>
                  </div>
                  <span className="font-mono text-lg text-foreground">{w.dmg}</span>
                </li>
              ))}
              <li className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                + 240 more weapons · forge your own with salvaged cores
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* UPDATES */}
      <section id="updates" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader kicker="Live Service" title="Roadmap Transmission" />
          <ol className="relative mt-16 space-y-8 border-l border-border pl-8">
            {updates.map((u) => (
              <li key={u.v} className="relative">
                <span className="absolute -left-[37px] top-2 flex h-4 w-4 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-accent/40" />
                  <span className="relative h-3 w-3 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400" />
                </span>
                <div className="glass rounded-2xl p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-xs uppercase tracking-widest text-accent">{u.v}</span>
                    <span className="text-xs text-muted-foreground">{u.date}</span>
                  </div>
                  <h3 className="mt-2 font-display text-xl font-bold">{u.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{u.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* REWARDS */}
      <section id="rewards" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader kicker="Echo Pass" title="Rewards that Outlive Seasons" />
          <div className="mt-16 grid gap-6 md:grid-cols-4">
            {[
              { d: 1, name: "Cyan Hull Skin", rare: "Common" },
              { d: 7, name: "Drone Companion: HEX", rare: "Rare" },
              { d: 14, name: "Mythic Forge Core", rare: "Epic" },
              { d: 30, name: "Carrier 'Echo-Prime'", rare: "Mythic" },
            ].map((r) => (
              <div
                key={r.d}
                className="glass group relative overflow-hidden rounded-2xl p-6 transition-transform hover:-translate-y-1"
              >
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
                <p className="font-mono text-xs uppercase tracking-widest text-accent">Day {r.d}</p>
                <div className="mt-6 aspect-square rounded-xl bg-gradient-to-br from-fuchsia-500/30 via-purple-500/20 to-cyan-400/30 grid place-items-center">
                  <span className="font-display text-5xl font-black text-gradient">{r.d}</span>
                </div>
                <h4 className="mt-4 font-bold">{r.name}</h4>
                <p className="text-xs text-muted-foreground">{r.rare}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Every reward is account-bound and carries forward forever. No FOMO, no resets.
          </p>
        </div>
      </section>

      {/* LEADERBOARD */}
      <section id="leaderboard" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader kicker="Global Standings" title="The Cinder Tournament" />
          <div className="mt-16 overflow-hidden rounded-2xl glass">
            <div className="grid grid-cols-12 border-b border-border px-6 py-4 text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="col-span-1">#</span>
              <span className="col-span-4">Commander</span>
              <span className="col-span-4">Fleet</span>
              <span className="col-span-3 text-right">Score</span>
            </div>
            {leaderboard.map((p) => (
              <div
                key={p.rank}
                className="grid grid-cols-12 items-center border-b border-border/50 px-6 py-4 text-sm transition-colors last:border-0 hover:bg-accent/5"
              >
                <span
                  className={`col-span-1 font-display text-2xl font-black ${
                    p.rank === 1
                      ? "text-gradient"
                      : p.rank <= 3
                      ? "text-accent"
                      : "text-muted-foreground"
                  }`}
                >
                  {String(p.rank).padStart(2, "0")}
                </span>
                <span className="col-span-4 font-mono font-bold">{p.name}</span>
                <span className="col-span-4 text-muted-foreground">{p.fleet}</span>
                <span className="col-span-3 text-right font-mono text-foreground">
                  {p.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT'S NEW */}
      <section className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader kicker="Why it's different" title="Things no other space game does" />
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Time-Echo Combat", d: "Die in a fight? Replay the last 8 seconds as a ghost and assist your own past self." },
              { t: "Voice-tagged Crew", d: "Heroes call out threats with spatial audio that actually matches your screen position." },
              { t: "Faction Tides", d: "Planet ownership rebalances every 6 hours from the global leaderboard — sleep can cost a system." },
              { t: "Forge from Salvage", d: "Strip enemy ships mid-battle and weld parts onto your weapons in the same run." },
              { t: "Branching Saga", d: "28 missions, 6 endings, permanent galaxy state. Your saves matter forever." },
              { t: "No Pay-to-Win", d: "All weapons drop in-game. Cosmetics only in the store. Forever." },
            ].map((f) => (
              <div key={f.t} className="glass rounded-2xl p-6 transition-transform hover:-translate-y-1">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-400 font-display font-black text-background">
                  ✦
                </div>
                <h4 className="font-display text-lg font-bold">{f.t}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="play" className="relative py-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="glass neon-border relative overflow-hidden rounded-3xl p-12 text-center md:p-20">
            <div className="absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-fuchsia-500/30 animate-pulse-glow" />
            <p className="text-xs uppercase tracking-[0.4em] text-accent">Free to play · Steam · PS5 · Xbox</p>
            <h2 className="mt-4 font-display text-4xl font-black leading-tight md:text-6xl">
              The void is <span className="text-gradient">listening.</span>
              <br />Answer it.
            </h2>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a
                href="#"
                className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-8 py-4 font-bold text-background neon-glow transition-transform hover:scale-105"
              >
                ▶ Launch Demo
              </a>
              <a
                href="#"
                className="rounded-full border border-border glass px-8 py-4 font-semibold transition-colors hover:border-accent"
              >
                Watch Trailer
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-xs text-muted-foreground md:flex-row">
          <p className="font-display tracking-widest">NEBULAR ECHO © 2026 — Echo Fleet Studios</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">Discord</a>
            <a href="#" className="hover:text-foreground">Press Kit</a>
            <a href="#" className="hover:text-foreground">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {kicker}
      </span>
      <h2 className="font-display text-4xl font-black leading-tight md:text-6xl">
        {title.split(" ").map((w, i, arr) => (
          <span key={i} className={i === arr.length - 1 ? "text-gradient" : ""}>
            {w}{i < arr.length - 1 ? " " : ""}
          </span>
        ))}
      </h2>
    </div>
  );
}

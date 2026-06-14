export interface RegionDef {
  id: number;          // 1..6
  name: string;
  tagline: string;
  color: string;       // accent for HUD/banner
  bg: string;          // background tint (css gradient stop)
  enemyColor: string;
  startLevel: number;  // inclusive
  endLevel: number;    // inclusive
}

export const REGIONS: RegionDef[] = [
  { id: 1, name: "NEBULA REACH",   tagline: "Where every pilot is forged.",      color: "#22d3ee", bg: "#0a0f2e", enemyColor: "#7c3aed", startLevel: 1,  endLevel: 10 },
  { id: 2, name: "CRIMSON BELT",   tagline: "A river of dying stars.",           color: "#fb7185", bg: "#2b0a1f", enemyColor: "#fb7185", startLevel: 11, endLevel: 20 },
  { id: 3, name: "ION STORM",      tagline: "The voltage between worlds.",       color: "#a3e635", bg: "#0c2a1b", enemyColor: "#a3e635", startLevel: 21, endLevel: 30 },
  { id: 4, name: "VOID SPIRES",    tagline: "Black towers between galaxies.",    color: "#a78bfa", bg: "#1a0a2e", enemyColor: "#a78bfa", startLevel: 31, endLevel: 40 },
  { id: 5, name: "ASHEN EXPANSE",  tagline: "Cinders of a fallen empire.",       color: "#fb923c", bg: "#2a160a", enemyColor: "#fb923c", startLevel: 41, endLevel: 50 },
  { id: 6, name: "STAR DEVOURER",  tagline: "The maw at the edge of light.",     color: "#facc15", bg: "#1a0a0a", enemyColor: "#facc15", startLevel: 51, endLevel: 60 },
];

export function regionForLevel(level: number): RegionDef {
  const r = REGIONS.find((x) => level >= x.startLevel && level <= x.endLevel);
  return r ?? REGIONS[REGIONS.length - 1];
}

export const MAX_LEVEL = REGIONS[REGIONS.length - 1].endLevel;

// Difficulty multipliers for a given level (1..60)
export function difficulty(level: number) {
  const t = Math.max(0, level - 1);
  return {
    enemyHp: 1 + t * 0.18,
    enemySpeed: 1 + t * 0.035,
    enemyFire: 0.005 + t * 0.0009,
    spawnDelay: Math.max(110, 700 - t * 22),
    waveCount: 5 + Math.floor(t * 1.6),
  };
}

// Reward box drop (boss kill). Mini-boss every 5 levels, region boss every 10.
export function bossReward(level: number) {
  const isRegionBoss = level % 10 === 0;
  const region = Math.min(6, Math.ceil(level / 10));
  if (isRegionBoss) {
    return {
      diamonds: 20 + region * 6 + Math.floor(Math.random() * 12),
      coins: 250 + region * 80 + Math.floor(Math.random() * 80),
      kind: "region" as const,
    };
  }
  return {
    diamonds: 6 + region * 2 + Math.floor(Math.random() * 5),
    coins: 80 + region * 25 + Math.floor(Math.random() * 40),
    kind: "mini" as const,
  };
}
export type ShipId =
  | "interceptor" | "vanguard" | "phantom" | "titan"
  | "spectre" | "nova" | "warden" | "seraph" | "archon";

export interface ShipDef {
  id: ShipId;
  name: string;
  tag: string;
  speed: number;
  hpMul: number;
  fireMul: number;
  dmgMul: number;
  color: string;
  accent: string;
  desc: string;
  cost: number; // diamonds (0 = starter)
}

export const SHIPS: ShipDef[] = [
  { id: "interceptor", name: "INTERCEPTOR", tag: "Cadet",        speed: 5.4, hpMul: 0.95, fireMul: 0.95, dmgMul: 0.95, color: "#94a3b8", accent: "#22d3ee", desc: "Standard issue. Forgiving frame, modest punch — every pilot starts here.", cost: 0 },
  { id: "vanguard",    name: "VANGUARD",    tag: "Balanced",     speed: 6,   hpMul: 1,    fireMul: 1,    dmgMul: 1,    color: "#22d3ee", accent: "#f0abfc", desc: "All-round starfighter. Reliable in any tide.", cost: 30 },
  { id: "phantom",     name: "PHANTOM",     tag: "Glass Cannon", speed: 7.6, hpMul: 0.7,  fireMul: 1.35, dmgMul: 1.15, color: "#f0abfc", accent: "#22d3ee", desc: "Fragile hull, blistering fire rate, surgical damage.", cost: 60 },
  { id: "titan",       name: "TITAN",       tag: "Bulwark",      speed: 4.6, hpMul: 1.7,  fireMul: 0.85, dmgMul: 1.35, color: "#a3e635", accent: "#f59e0b", desc: "Heavy plating, slower frame, devastating shots.", cost: 120 },
  { id: "spectre",     name: "SPECTRE",     tag: "Stealth",      speed: 6.8, hpMul: 0.85, fireMul: 1.2,  dmgMul: 1.1,  color: "#67e8f9", accent: "#c084fc", desc: "Quick shadow-runner. Slippery, sharp, hard to pin.", cost: 200 },
  { id: "nova",        name: "NOVA",        tag: "Inferno",      speed: 5.6, hpMul: 1.1,  fireMul: 1.1,  dmgMul: 1.4,  color: "#fb923c", accent: "#facc15", desc: "Plasma-tipped lance. Burns through tanks like paper.", cost: 320 },
  { id: "warden",      name: "WARDEN",      tag: "Guardian",     speed: 5.2, hpMul: 1.45, fireMul: 1.0,  dmgMul: 1.05, color: "#34d399", accent: "#60a5fa", desc: "Reinforced shielding, steady cannon, never falters.", cost: 500 },
  { id: "seraph",      name: "SERAPH",      tag: "Radiant",      speed: 6.4, hpMul: 1.25, fireMul: 1.25, dmgMul: 1.25, color: "#facc15", accent: "#f0abfc", desc: "Light-clad seraphic frame. Bright, fast, merciless.", cost: 800 },
  { id: "archon",      name: "ARCHON",      tag: "Sovereign",    speed: 6.6, hpMul: 1.55, fireMul: 1.25, dmgMul: 1.55, color: "#a78bfa", accent: "#22d3ee", desc: "Endgame frame. Sovereign-grade hull, twin reactors, brutal output.", cost: 1200 },
];

export const SHIP_BY_ID: Record<ShipId, ShipDef> = SHIPS.reduce((acc, s) => {
  acc[s.id] = s; return acc;
}, {} as Record<ShipId, ShipDef>);

export const UPGRADE_MAX = 10;
export function upgradeCost(level: number) {
  // 100, 160, 256, 410, 655, 1048, ...
  return Math.round(100 * Math.pow(1.6, level));
}
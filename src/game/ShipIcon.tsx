import type { ShipDef } from "@/game/ships";
import type { ReactNode } from "react";

/**
 * Distinct silhouette per ship. Returns the path commands for the hull
 * (used by the SVG icon) plus a small list of extra accents so each frame
 * reads as visually unique at any size.
 */
function hullPath(id: string, s: number): string {
  switch (id) {
    case "interceptor":
      // Slim dart with a sharp nose
      return `M0 ${-s} L${s*0.35} ${-s*0.2} L${s*0.7} ${s*0.75} L0 ${s*0.45} L${-s*0.7} ${s*0.75} L${-s*0.35} ${-s*0.2} Z`;
    case "vanguard":
      // Classic arrowhead with swept wings
      return `M0 ${-s} L${s*0.55} ${-s*0.1} L${s*0.95} ${s*0.7} L${s*0.25} ${s*0.4} L0 ${s*0.85} L${-s*0.25} ${s*0.4} L${-s*0.95} ${s*0.7} L${-s*0.55} ${-s*0.1} Z`;
    case "phantom":
      // Manta-ray wide glider
      return `M0 ${-s*0.9} L${s} ${s*0.1} L${s*0.55} ${s*0.85} L0 ${s*0.55} L${-s*0.55} ${s*0.85} L${-s} ${s*0.1} Z`;
    case "titan":
      // Heavy brick with shoulder cannons
      return `M${-s*0.45} ${-s*0.85} L${s*0.45} ${-s*0.85} L${s*0.7} ${-s*0.3} L${s} ${s*0.6} L${s*0.4} ${s*0.85} L${-s*0.4} ${s*0.85} L${-s} ${s*0.6} L${-s*0.7} ${-s*0.3} Z`;
    case "spectre":
      // Stealth wedge with notched tail
      return `M0 ${-s} L${s*0.75} ${-s*0.05} L${s*0.55} ${s*0.85} L${s*0.18} ${s*0.55} L0 ${s*0.95} L${-s*0.18} ${s*0.55} L${-s*0.55} ${s*0.85} L${-s*0.75} ${-s*0.05} Z`;
    case "nova":
      // Starburst lance
      return `M0 ${-s} L${s*0.25} ${-s*0.45} L${s*0.95} ${-s*0.2} L${s*0.55} ${s*0.25} L${s} ${s*0.85} L0 ${s*0.45} L${-s} ${s*0.85} L${-s*0.55} ${s*0.25} L${-s*0.95} ${-s*0.2} L${-s*0.25} ${-s*0.45} Z`;
    case "warden":
      // Shield-shaped guardian
      return `M0 ${-s*0.95} L${s*0.95} ${-s*0.45} L${s*0.85} ${s*0.4} L${s*0.4} ${s*0.9} L${-s*0.4} ${s*0.9} L${-s*0.85} ${s*0.4} L${-s*0.95} ${-s*0.45} Z`;
    case "seraph":
      // Crown with twin upper wings
      return `M0 ${-s} L${s*0.4} ${-s*0.55} L${s*0.95} ${-s*0.75} L${s*0.7} ${s*0.1} L${s*0.95} ${s*0.85} L${s*0.25} ${s*0.45} L0 ${s*0.95} L${-s*0.25} ${s*0.45} L${-s*0.95} ${s*0.85} L${-s*0.7} ${s*0.1} L${-s*0.95} ${-s*0.75} L${-s*0.4} ${-s*0.55} Z`;
    case "archon":
      // Sovereign cruciform
      return `M0 ${-s} L${s*0.22} ${-s*0.55} L${s*0.95} ${-s*0.35} L${s*0.55} ${s*0.05} L${s*0.95} ${s*0.55} L${s*0.3} ${s*0.45} L0 ${s*0.95} L${-s*0.3} ${s*0.45} L${-s*0.95} ${s*0.55} L${-s*0.55} ${s*0.05} L${-s*0.95} ${-s*0.35} L${-s*0.22} ${-s*0.55} Z`;
    default:
      return `M0 ${-s} L${s*0.85} ${s*0.7} L0 ${s*0.35} L${-s*0.85} ${s*0.7} Z`;
  }
}

/**
 * Optional accent strokes layered on top of the hull (wing tips, fins,
 * cockpit lines) so similar-shaped ships still look different.
 */
function accents(id: string, s: number, color: string): ReactNode {
  switch (id) {
    case "interceptor":
      return <line x1={0} y1={-s*0.6} x2={0} y2={s*0.35} stroke={color} strokeWidth={s*0.06} />;
    case "phantom":
      return (
        <>
          <line x1={-s*0.6} y1={s*0.3} x2={-s*0.95} y2={s*0.08} stroke={color} strokeWidth={s*0.07} strokeLinecap="round" />
          <line x1={s*0.6} y1={s*0.3} x2={s*0.95} y2={s*0.08} stroke={color} strokeWidth={s*0.07} strokeLinecap="round" />
        </>
      );
    case "titan":
      return (
        <>
          <rect x={-s*0.78} y={-s*0.45} width={s*0.22} height={s*0.55} fill={color} />
          <rect x={s*0.56} y={-s*0.45} width={s*0.22} height={s*0.55} fill={color} />
        </>
      );
    case "spectre":
      return <polygon points={`0,${-s*0.45} ${s*0.12},${s*0.2} ${-s*0.12},${s*0.2}`} fill={color} />;
    case "nova":
      return (
        <>
          <circle cx={0} cy={0} r={s*0.32} fill="none" stroke={color} strokeWidth={s*0.06} />
          <circle cx={0} cy={0} r={s*0.12} fill={color} />
        </>
      );
    case "warden":
      return (
        <path d={`M${-s*0.45} ${-s*0.3} L0 ${-s*0.05} L${s*0.45} ${-s*0.3} L${s*0.32} ${s*0.45} L0 ${s*0.65} L${-s*0.32} ${s*0.45} Z`}
              fill="none" stroke={color} strokeWidth={s*0.07} />
      );
    case "seraph":
      return (
        <>
          <line x1={-s*0.55} y1={-s*0.55} x2={-s*0.85} y2={-s*0.95} stroke={color} strokeWidth={s*0.07} strokeLinecap="round" />
          <line x1={s*0.55} y1={-s*0.55} x2={s*0.85} y2={-s*0.95} stroke={color} strokeWidth={s*0.07} strokeLinecap="round" />
          <circle cx={0} cy={s*0.1} r={s*0.18} fill={color} />
        </>
      );
    case "archon":
      return (
        <>
          <rect x={-s*0.08} y={-s*0.7} width={s*0.16} height={s*1.4} fill={color} opacity={0.7} />
          <rect x={-s*0.7} y={-s*0.08} width={s*1.4} height={s*0.16} fill={color} opacity={0.6} />
        </>
      );
    case "vanguard":
      return (
        <>
          <line x1={-s*0.5} y1={s*0.2} x2={-s*0.85} y2={s*0.6} stroke={color} strokeWidth={s*0.07} strokeLinecap="round" />
          <line x1={s*0.5} y1={s*0.2} x2={s*0.85} y2={s*0.6} stroke={color} strokeWidth={s*0.07} strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}

export function ShipIcon({ ship, size = 36 }: { ship: ShipDef; size?: number }) {
  const s = size / 2;
  const fid = `g-ship-${ship.id}`;
  return (
    <svg width={size} height={size} viewBox={`-${s} -${s} ${size} ${size}`}>
      <defs>
        <filter id={fid} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
        <linearGradient id={`${fid}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ship.color} stopOpacity="1" />
          <stop offset="100%" stopColor={ship.accent} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <g filter={`url(#${fid})`}>
        <path d={hullPath(ship.id, s * 0.95)} fill={`url(#${fid}-grad)`} stroke={ship.accent} strokeWidth={s * 0.04} />
      </g>
      {accents(ship.id, s * 0.95, ship.accent)}
      <circle cx={0} cy={s * 0.05} r={s * 0.16} fill={ship.accent} opacity={0.9} />
      <circle cx={0} cy={s * 0.05} r={s * 0.08} fill="#0a0418" />
    </svg>
  );
}

/**
 * Draw the same hull shape into a 2D canvas for the actual game scene so
 * the in-flight ship matches the hangar silhouette.
 */
export function drawShipHull(ctx: CanvasRenderingContext2D, ship: ShipDef, r: number) {
  ctx.beginPath();
  // Build the path procedurally — mirrors hullPath above but for canvas
  const pts = hullPathPoints(ship.id, r);
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
  });
  ctx.closePath();
}

export function hullPathPoints(id: string, s: number): [number, number][] {
  switch (id) {
    case "interceptor": return [[0,-s],[s*0.35,-s*0.2],[s*0.7,s*0.75],[0,s*0.45],[-s*0.7,s*0.75],[-s*0.35,-s*0.2]];
    case "vanguard":    return [[0,-s],[s*0.55,-s*0.1],[s*0.95,s*0.7],[s*0.25,s*0.4],[0,s*0.85],[-s*0.25,s*0.4],[-s*0.95,s*0.7],[-s*0.55,-s*0.1]];
    case "phantom":     return [[0,-s*0.9],[s,s*0.1],[s*0.55,s*0.85],[0,s*0.55],[-s*0.55,s*0.85],[-s,s*0.1]];
    case "titan":       return [[-s*0.45,-s*0.85],[s*0.45,-s*0.85],[s*0.7,-s*0.3],[s,s*0.6],[s*0.4,s*0.85],[-s*0.4,s*0.85],[-s,s*0.6],[-s*0.7,-s*0.3]];
    case "spectre":     return [[0,-s],[s*0.75,-s*0.05],[s*0.55,s*0.85],[s*0.18,s*0.55],[0,s*0.95],[-s*0.18,s*0.55],[-s*0.55,s*0.85],[-s*0.75,-s*0.05]];
    case "nova":        return [[0,-s],[s*0.25,-s*0.45],[s*0.95,-s*0.2],[s*0.55,s*0.25],[s,s*0.85],[0,s*0.45],[-s,s*0.85],[-s*0.55,s*0.25],[-s*0.95,-s*0.2],[-s*0.25,-s*0.45]];
    case "warden":      return [[0,-s*0.95],[s*0.95,-s*0.45],[s*0.85,s*0.4],[s*0.4,s*0.9],[-s*0.4,s*0.9],[-s*0.85,s*0.4],[-s*0.95,-s*0.45]];
    case "seraph":      return [[0,-s],[s*0.4,-s*0.55],[s*0.95,-s*0.75],[s*0.7,s*0.1],[s*0.95,s*0.85],[s*0.25,s*0.45],[0,s*0.95],[-s*0.25,s*0.45],[-s*0.95,s*0.85],[-s*0.7,s*0.1],[-s*0.95,-s*0.75],[-s*0.4,-s*0.55]];
    case "archon":      return [[0,-s],[s*0.22,-s*0.55],[s*0.95,-s*0.35],[s*0.55,s*0.05],[s*0.95,s*0.55],[s*0.3,s*0.45],[0,s*0.95],[-s*0.3,s*0.45],[-s*0.95,s*0.55],[-s*0.55,s*0.05],[-s*0.95,-s*0.35],[-s*0.22,-s*0.55]];
    default:            return [[0,-s],[s*0.85,s*0.7],[0,s*0.35],[-s*0.85,s*0.7]];
  }
}
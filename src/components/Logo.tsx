import logoSrc from "@/assets/logo.png";

export function Logo({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-60"
        style={{ background: "radial-gradient(circle, oklch(0.78 0.22 350 / 0.7), transparent 70%)" }}
      />
      <img
        src={logoSrc}
        alt="Nebular Echo logo"
        width={size}
        height={size}
        className="relative drop-shadow-[0_0_18px_rgba(168,85,247,0.7)]"
      />
    </div>
  );
}
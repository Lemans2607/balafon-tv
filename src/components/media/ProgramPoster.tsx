import { useState } from "react";
import type { Program } from "../../types";
import { CATEGORY_META } from "../../types";

/* Affiche avec repli dégradé/SVG (aucune image cassée, même si une URL distante échoue) */
export function ProgramPoster({ program, className = "" }: { program: Program; className?: string }) {
  const [failed, setFailed] = useState(false);
  const meta = CATEGORY_META[program.category];

  if (program.posterUrl && !failed) {
    return (
      <img
        src={program.posterUrl}
        alt={`Affiche — ${program.title}`}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    );
  }

  const initials = program.title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(150deg, ${meta.soft}, #111622 70%)` }}
      role="img"
      aria-label={`Affiche — ${program.title}`}
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{ background: `radial-gradient(circle at 30% 20%, ${meta.color}55, transparent 55%)` }}
        aria-hidden
      />
      {/* Balafon stylisé en filigrane */}
      <svg viewBox="0 0 100 100" className="absolute inset-x-4 bottom-2 h-1/3 opacity-30" aria-hidden>
        {[18, 34, 50, 66, 82].map((x, i) => (
          <rect key={x} x={x - 4} y={30 - i * 4} width="8" rx="4" height={40 + i * 8} fill={meta.color} />
        ))}
      </svg>
      <span className="font-display text-[26px] font-black" style={{ color: meta.color }}>
        {initials}
      </span>
    </div>
  );
}

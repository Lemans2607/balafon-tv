import { useMemo } from "react";
import type { Program, ProgramCategory, ScheduleItem } from "../../types";
import { CATEGORY_META } from "../../types";
import { toMinutes } from "../../utils/time";

/* Fenêtre d'antenne publique : 06:00 → 24:00 (18 h), alignée sur
   ADMIN_DAY_START / DAY_END utilisés partout ailleurs dans l'app. */
const DAY_START_MIN = 6 * 60;
const DAY_END_MIN = 24 * 60;
const DAY_SPAN_MIN = DAY_END_MIN - DAY_START_MIN;
const TICK_HOURS = [6, 9, 12, 15, 18, 21, 24];

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface DayTimelineProps {
  /** Créneaux de la journée sélectionnée, triés par heure de début. */
  items: ScheduleItem[];
  programById: Map<string, Program>;
  isToday: boolean;
  now: Date;
  onSelect: (programId: string) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}

/* ============================================================
   DayTimeline — bandeau horizontal proportionnel montrant TOUTE
   la journée d'antenne d'un coup d'œil (façon guide TV linéaire
   DStv/Canal+), avec repère "maintenant" et légende par catégorie.
   Complète les rangées éditoriales (cartes) de PublicGuide sans
   les remplacer : ceci est "la grille", elles sont la sélection.
   ============================================================ */
export function DayTimeline({
  items,
  programById,
  isToday,
  now,
  onSelect,
  emptyTitle = "Grille non publiée pour cette journée",
  emptyMessage = "Elle apparaîtra ici dès sa validation par la Direction d'Antenne.",
}: DayTimelineProps) {
  const blocks = useMemo(
    () =>
      items
        .map((item) => ({ item, program: programById.get(item.programId) ?? null }))
        .filter((entry): entry is { item: ScheduleItem; program: Program } =>
          Boolean(entry.program) && entry.program!.category !== "off-air"
        )
        .map(({ item, program }) => {
          const start = Math.max(DAY_START_MIN, toMinutes(item.startTime));
          const end = Math.min(DAY_END_MIN, toMinutes(item.endTime));
          return {
            item,
            program,
            leftPct: ((start - DAY_START_MIN) / DAY_SPAN_MIN) * 100,
            widthPct: Math.max(0, ((end - start) / DAY_SPAN_MIN) * 100),
          };
        })
        .filter(({ widthPct }) => widthPct > 0),
    [items, programById]
  );

  const legend = useMemo(() => {
    const seen: ProgramCategory[] = [];
    blocks.forEach(({ program }) => {
      if (!seen.includes(program.category)) seen.push(program.category);
    });
    return seen;
  }, [blocks]);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNowLine = isToday && nowMin >= DAY_START_MIN && nowMin < DAY_END_MIN;
  const nowLeftPct = ((nowMin - DAY_START_MIN) / DAY_SPAN_MIN) * 100;

  if (blocks.length === 0) {
    return (
      <div className="glass-border glass-surface rounded-3xl border px-6 py-10 text-center backdrop-blur-xl">
        <p className="font-bold text-paper">{emptyTitle}</p>
        <p className="mt-1 text-sm text-mist">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="glass-border glass-surface rounded-3xl border p-4 backdrop-blur-xl sm:p-6">
      <div className="relative h-24 w-full sm:h-28">
        <div className="absolute inset-0 rounded-xl bg-ink-900/70" aria-hidden />

        {TICK_HOURS.map((h) => (
          <div
            key={h}
            className="absolute top-0 h-full border-l border-white/[0.06]"
            style={{ left: `${((h * 60 - DAY_START_MIN) / DAY_SPAN_MIN) * 100}%` }}
            aria-hidden
          />
        ))}

        <div role="list" aria-label="Programmes de la journée" className="absolute inset-0">
          {blocks.map(({ item, program, leftPct, widthPct }) => {
            const meta = CATEGORY_META[program.category];
            const isLive = showNowLine && toMinutes(item.startTime) <= nowMin && nowMin < toMinutes(item.endTime);
            const roomy = widthPct >= 6;
            return (
              <button
                key={item.id}
                type="button"
                role="listitem"
                onClick={() => onSelect(program.id)}
                title={`${program.title} — ${item.startTime} – ${item.endTime}`}
                aria-label={`${program.title}, de ${item.startTime} à ${item.endTime}${isLive ? ", en direct" : ""}`}
                className={`group absolute top-2 bottom-2 overflow-hidden rounded-lg border-l-4 px-2 py-1.5 text-left transition-all duration-200 hover:z-10 hover:brightness-125 focus-visible:z-10 ${isLive ? "ring-2 ring-white/50" : ""}`}
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  minWidth: 10,
                  background: withAlpha(meta.color, 0.32),
                  borderLeftColor: meta.color,
                }}
              >
                {roomy && <span className="block truncate text-[11px] font-bold leading-tight text-paper">{program.title}</span>}
                {widthPct >= 10 && <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-mist">{item.startTime}</span>}
                {isLive && <span className="live-pulse absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white" aria-hidden />}
              </button>
            );
          })}
        </div>

        {showNowLine && (
          <div className="pointer-events-none absolute top-0 h-full" style={{ left: `${nowLeftPct}%` }} aria-hidden>
            <div className="h-full w-px bg-balafon" />
            <span className="live-pulse absolute -top-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-balafon" />
          </div>
        )}
      </div>

      <div className="relative mt-2 h-4 text-[10px] font-mono text-mist-dark">
        {TICK_HOURS.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2 tabular-nums"
            style={{ left: `${((h * 60 - DAY_START_MIN) / DAY_SPAN_MIN) * 100}%` }}
          >
            {String(h % 24).padStart(2, "0")}h
          </span>
        ))}
      </div>

      {legend.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.06] pt-4">
          {legend.map((cat) => (
            <span key={cat} className="flex items-center gap-1.5 text-[11px] font-semibold text-mist">
              <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_META[cat].color }} aria-hidden />
              {CATEGORY_META[cat].label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
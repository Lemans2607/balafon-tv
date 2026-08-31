import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useScheduleStore } from "../../store/scheduleStore";
import { CATEGORY_META, type ProgramCategory } from "../../types";
import { durationLabel, toMinutes } from "../../utils/time";

/* ============================================================
   TAUX D'OCCUPATION DE L'ANTENNE PAR CATÉGORIE — Directeur.
   Donut : minutes d'antenne par catégorie sur les grilles
   validées et publiées, avec légende détaillée.
   ============================================================ */
export function OccupationChart() {
  const grids = useScheduleStore((s) => s.grids);
  const scheduleMap = useScheduleStore((s) => s.scheduleMap);
  const programs = useScheduleStore((s) => s.programs);

  const { data, total } = useMemo(() => {
    const parId = new Map(programs.map((p) => [p.id, p]));
    const minutes = new Map<ProgramCategory, number>();

    const validees = Object.keys(grids).filter(
      (d) => grids[d].status === "validated" && grids[d].published
    );

    for (const date of validees) {
      for (const it of scheduleMap[date] ?? []) {
        const p = parId.get(it.programId);
        if (!p || p.category === "off-air") continue;
        const m = toMinutes(it.endTime) - toMinutes(it.startTime);
        minutes.set(p.category, (minutes.get(p.category) ?? 0) + m);
      }
    }

    const liste = [...minutes.entries()]
      .map(([cat, m]) => ({
        cat,
        nom: CATEGORY_META[cat].label,
        minutes: m,
        fill: CATEGORY_META[cat].color,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    return { data: liste, total: liste.reduce((s, d) => s + d.minutes, 0) };
  }, [grids, scheduleMap, programs]);

  if (total === 0) {
    return (
      <p className="py-8 text-center text-[12.5px] text-mist-dark">
        Aucune grille validée — l'occupation sera calculée après la première publication.
      </p>
    );
  }

  return (
    <div className="grid items-center gap-6 md:grid-cols-[220px_1fr]">
      <div className="relative h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={{
                background: "#121724",
                border: "1px solid #2b3345",
                borderRadius: 10,
                fontSize: 12,
                color: "#f7f8fa",
              }}
              formatter={(v: unknown, _n: unknown, item: { payload?: { nom?: string } }) => [
                durationLabel(Number(v)),
                item?.payload?.nom ?? "",
              ]}
            />
            <Pie
              data={data}
              dataKey="minutes"
              nameKey="nom"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              stroke="#0b0e14"
              strokeWidth={2}
              animationDuration={700}
            >
              {data.map((d) => (
                <Cell key={d.cat} fill={d.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[30px] leading-none text-paper">{durationLabel(total)}</span>
          <span className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-mist-dark">
            d'antenne validée
          </span>
        </div>
      </div>

      <ul className="space-y-2">
        {data.map((d) => {
          const pct = Math.round((d.minutes / total) * 100);
          return (
            <li key={d.cat} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.fill }} aria-hidden />
              <span className="w-32 shrink-0 truncate text-[12.5px] font-bold text-paper">{d.nom}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                <span
                  className="block h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${pct}%`, background: d.fill }}
                />
              </span>
              <span className="w-16 shrink-0 text-right font-mono text-[11.5px] tabular-nums text-mist">
                {pct} %
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

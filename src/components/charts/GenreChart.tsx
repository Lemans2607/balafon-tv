import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useScheduleStore } from "../../store/scheduleStore";
import { useThemeStore } from "../../store/themeStore";
import { CATEGORY_META, type ProgramCategory } from "../../types";

/* ============================================================
   Répartition des genres d'émissions — grilles VALIDÉES.
   Alimente le Tableau de bord (StudioDashboard). Couleurs = celles
   de la charte par catégorie (CATEGORY_META).
   ============================================================ */
export function GenreChart() {
  const grids = useScheduleStore((s) => s.grids);
  const scheduleMap = useScheduleStore((s) => s.scheduleMap);
  const programs = useScheduleStore((s) => s.programs);
  const theme = useThemeStore((s) => s.theme);

  const data = useMemo(() => {
    const parId = new Map(programs.map((p) => [p.id, p]));
    const compte = new Map<ProgramCategory, number>();

    const datesValidees = Object.keys(grids).filter(
      (d) => grids[d].status === "validated" && grids[d].published
    );

    for (const date of datesValidees) {
      for (const item of scheduleMap[date] ?? []) {
        const p = parId.get(item.programId);
        if (!p || p.category === "off-air") continue;
        compte.set(p.category, (compte.get(p.category) ?? 0) + 1);
      }
    }

    return [...compte.entries()]
      .map(([cat, n]) => ({
        genre: CATEGORY_META[cat].label,
        nb: n,
        fill: CATEGORY_META[cat].color,
      }))
      .sort((a, b) => b.nb - a.nb);
  }, [grids, scheduleMap, programs]);

  const light = theme === "light";
  const axe = light ? "#556072" : "#8b94a5";
  const grille = light ? "#e2e5ec" : "#1b2130";

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-[12.5px] text-mist-dark">
        Aucune grille validée à analyser pour le moment.
      </p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 18, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grille} horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: axe, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={{ stroke: grille }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="genre"
            width={104}
            tick={{ fill: axe, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: light ? "rgba(15,107,214,0.06)" : "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: light ? "#ffffff" : "#121724",
              border: `1px solid ${light ? "#e2e5ec" : "#2b3345"}`,
              borderRadius: 10,
              fontSize: 12,
              color: light ? "#131822" : "#f7f8fa",
            }}
            labelStyle={{ color: light ? "#131822" : "#f7f8fa", fontWeight: 700 }}
            formatter={(value) => [`${value} diffusion${Number(value) > 1 ? "s" : ""}`, "Diffusions"]}
          />
          <Bar dataKey="nb" radius={[0, 6, 6, 0]} barSize={16}>
            {data.map((d) => (
              <Cell key={d.genre} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

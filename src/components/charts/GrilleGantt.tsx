import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useScheduleStore } from "../../store/scheduleStore";
import { CATEGORY_META } from "../../types";
import { toMinutes } from "../../utils/time";

/* ============================================================
   GANTT DE LA GRILLE — vue timeline de la journée (Régie).
   Une voie horizontale 06:00 → 24:00, un segment coloré par
   émission (couleur = catégorie), ligne rouge = instant présent.
   ============================================================ */

const FENETRE_DEBUT = 6 * 60;
const FENETRE_FIN = 24 * 60;

function etiquette(min: number): string {
  const m = min % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function GrilleGantt({ date, now }: { date: string; now: Date }) {
  const scheduleMap = useScheduleStore((s) => s.scheduleMap);
  const programs = useScheduleStore((s) => s.programs);

  const data = useMemo(() => {
    const parId = new Map(programs.map((p) => [p.id, p]));
    return (scheduleMap[date] ?? [])
      .map((it) => ({
        it,
        p: parId.get(it.programId),
      }))
      .filter(({ p }) => p && p.category !== "off-air")
      .map(({ it, p }) => {
        const start = Math.max(FENETRE_DEBUT, toMinutes(it.startTime));
        const end = Math.min(FENETRE_FIN, toMinutes(it.endTime));
        return {
          key: it.id,
          titre: p!.title,
          categorie: CATEGORY_META[p!.category].label,
          plage: `${it.startTime} – ${it.endTime}`,
          debut: start - FENETRE_DEBUT,
          duree: Math.max(2, end - start),
          fill: CATEGORY_META[p!.category].color,
        };
      })
      .filter((d) => d.duree > 0)
      .sort((a, b) => a.debut - b.debut);
  }, [scheduleMap, programs, date]);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const curseur = nowMin - FENETRE_DEBUT;

  const ticks = useMemo(() => {
    const t: number[] = [];
    for (let m = FENETRE_DEBUT; m <= FENETRE_FIN; m += 120) t.push(m - FENETRE_DEBUT);
    return t;
  }, []);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-[12.5px] text-mist-dark">
        Aucun programme diffusé sur la fenêtre 06:00 – 24:00 pour cette journée.
      </p>
    );
  }

  return (
    <div className="h-36 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 14, right: 10, left: 0, bottom: 0 }} barCategoryGap={0}>
          <XAxis
            type="number"
            domain={[0, FENETRE_FIN - FENETRE_DEBUT]}
            ticks={ticks}
            tickFormatter={(v: number) => etiquette(v + FENETRE_DEBUT)}
            tick={{ fill: "#8b94a5", fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={{ stroke: "#232b3d" }}
            tickLine={false}
          />
          <YAxis type="category" dataKey="key" hide />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#121724",
              border: "1px solid #2b3345",
              borderRadius: 10,
              fontSize: 12,
              color: "#f7f8fa",
              boxShadow: "0 12px 28px rgba(0,0,0,0.5)",
            }}
            formatter={(_v: unknown, _n: unknown, item: { payload?: { titre?: string; categorie?: string; plage?: string } }) => {
              const p = item?.payload;
              return [`${p?.titre ?? ""} · ${p?.categorie ?? ""}`, p?.plage ?? ""];
            }}
            labelFormatter={() => ""}
          />
          {curseur >= 0 && curseur <= FENETRE_FIN - FENETRE_DEBUT && (
            <ReferenceLine
              x={curseur}
              stroke="#E31E24"
              strokeWidth={2}
              label={{ value: "MAINTENANT", position: "top", fill: "#E31E24", fontSize: 9, fontWeight: 800 }}
            />
          )}
          <Bar dataKey="debut" stackId="gantt" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="duree" stackId="gantt" radius={[4, 4, 4, 4]} animationDuration={650}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.fill} fillOpacity={0.88} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

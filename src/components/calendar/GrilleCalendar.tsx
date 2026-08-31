import { useMemo, useState } from "react";
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

import { useScheduleStore } from "../../store/scheduleStore";
import { ADMIN_DAY_START, DAY_END, dateKey, todayKey } from "../../utils/time";
import { coveragePercent } from "../../utils/validation";
import { STATUS_META } from "../../types";

/* ============================================================
   CALENDRIER DE GRILLE — Admin / Direction.
   Mois navigable ; chaque jour affiche la complétude de la grille
   (06:00 → 24:00) et son statut éditorial. Un clic sélectionne
   le jour dans le constructeur.
   ============================================================ */

const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function GrilleCalendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const scheduleMap = useScheduleStore((s) => s.scheduleMap);
  const grids = useScheduleStore((s) => s.grids);
  const [mois, setMois] = useState(() => startOfMonth(new Date(value)));

  const jours = useMemo(() => {
    const debut = startOfWeek(startOfMonth(mois), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(mois), { weekStartsOn: 1 });
    const liste: Date[] = [];
    for (let d = debut; d <= fin; d = addDays(d, 1)) liste.push(d);
    return liste;
  }, [mois]);

  const aujourdhui = todayKey();

  const infoJour = (key: string) => {
    const items = (scheduleMap[key] ?? []).filter((i) => i.programId !== "p-offair");
    const couverture = items.length ? coveragePercent(scheduleMap[key] ?? [], ADMIN_DAY_START, DAY_END) : 0;
    const statut = grids[key]?.status ?? null;
    return { couverture, statut, nb: items.length };
  };

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-[20px] uppercase tracking-wide text-paper">
          <CalendarDays size={16} className="text-balafon" aria-hidden />
          {format(mois, "MMMM yyyy", { locale: fr })}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Mois précédent"
            onClick={() => setMois((m) => addMonths(m, -1))}
            className="rounded-lg border border-ink-600 p-1.5 text-mist transition-colors hover:border-ink-500 hover:text-paper"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => {
              const t = todayKey();
              setMois(startOfMonth(new Date(t)));
              onChange(t);
            }}
            className="rounded-lg border border-ink-600 px-2.5 py-1.5 text-[11.5px] font-bold text-mist transition-colors hover:border-balafon/60 hover:text-balafon"
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            aria-label="Mois suivant"
            onClick={() => setMois((m) => addMonths(m, 1))}
            className="rounded-lg border border-ink-600 p-1.5 text-mist transition-colors hover:border-ink-500 hover:text-paper"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {JOURS_COURTS.map((j) => (
          <p key={j} className="pb-1 text-center font-mono text-[9.5px] font-bold uppercase tracking-widest text-mist-dark">
            {j}
          </p>
        ))}
        {jours.map((d) => {
          const key = dateKey(d);
          const dansMois = d.getMonth() === mois.getMonth();
          const { couverture, statut, nb } = infoJour(key);
          const selectionne = key === value;
          const estAujourdhui = key === aujourdhui;
          const couleurStatut = statut ? STATUS_META[statut].color : "#3a4256";
          const incomplet = nb > 0 && couverture < 100;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-label={`${format(d, "dd MMMM", { locale: fr })} — ${
                nb === 0 ? "aucune grille" : `couverture ${couverture} %`
              }`}
              className={`group relative flex h-[64px] flex-col items-stretch justify-between rounded-lg border p-1.5 text-left transition-all duration-200 ${
                selectionne
                  ? "border-balafon bg-balafon/10 shadow-[0_0_0_1px_rgba(227,30,36,0.5),0_6px_18px_rgba(227,30,36,0.18)]"
                  : estAujourdhui
                  ? "border-ocean/50 bg-ocean/[0.06] hover:border-ocean"
                  : "border-ink-700 bg-ink-800/60 hover:-translate-y-0.5 hover:border-ink-500"
              } ${dansMois ? "" : "opacity-35"}`}
            >
              <span className="flex items-center justify-between">
                <span
                  className={`font-mono text-[12px] font-bold tabular-nums ${
                    estAujourdhui ? "text-ocean-soft" : "text-paper"
                  }`}
                >
                  {format(d, "d")}
                </span>
                {nb > 0 && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: incomplet ? "#EF4444" : couleurStatut }}
                    title={incomplet ? "Grille incomplète" : statut ?? undefined}
                    aria-hidden
                  />
                )}
              </span>
              {nb > 0 ? (
                <span className="space-y-1">
                  <span className="block h-1 overflow-hidden rounded-full bg-ink-600">
                    <span
                      className="block h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${couverture}%`,
                        background: incomplet ? "#EF4444" : couleurStatut,
                      }}
                    />
                  </span>
                  <span className="block font-mono text-[8.5px] leading-none text-mist-dark">
                    {nb} ém. · {couverture} %
                  </span>
                </span>
              ) : (
                <span className="font-mono text-[8.5px] leading-none text-mist-dark">—</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-ink-700 pt-3">
        {[
          { c: STATUS_META.draft.color, l: "Brouillon" },
          { c: STATUS_META.pending.color, l: "En validation" },
          { c: STATUS_META.validated.color, l: "Validée" },
          { c: "#EF4444", l: "Incomplète" },
        ].map((x) => (
          <span key={x.l} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-mist">
            <motion.span
              className="h-2 w-2 rounded-full"
              style={{ background: x.c }}
              whileHover={{ scale: 1.3 }}
              aria-hidden
            />
            {x.l}
          </span>
        ))}
      </div>
    </div>
  );
}

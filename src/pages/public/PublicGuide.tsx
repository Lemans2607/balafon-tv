import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Tv } from "lucide-react";
import { BalafonEpg } from "../../components/planby/BalafonEpg";
import type { PlanbyEpgData } from "../../components/planby/planbyMappers";
import { useAppStore } from "../../store/appStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useNow, useCurrentProgram } from "../../hooks/useNow";
import { CATEGORY_META, type ProgramCategory } from "../../types";
import { durationLabel, todayKey, toMinutes } from "../../utils/time";
import { DaySelector, ProgressBar } from "../../components/ui";
import { ProgramPoster } from "../../components/media/ProgramPoster";
import { useNavigate } from "react-router-dom";

const FILTERS: Array<{ id: ProgramCategory | "all"; label: string }> = [
  { id: "all", label: "Toutes catégories" },
  { id: "news", label: "Info" },
  { id: "talk", label: "Talk" },
  { id: "entertainment", label: "Divertissement" },
  { id: "culture", label: "Culture" },
  { id: "sport", label: "Sport" },
  { id: "documentary", label: "Documentaire" },
  { id: "series", label: "Série & Cinéma" },
  { id: "music", label: "Musique" },
];

export function PublicGuide() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const grids = useScheduleStore((s) => s.grids);
  const programs = useScheduleStore((s) => s.programs);
  const now = useNow(1000);
  const today = todayKey();
  const navigate = useNavigate();
  const [category, setCategory] = useState<ProgramCategory | "all">("all");
  const live = useCurrentProgram(today, now);

  const grid = grids[selectedDate];
  const published = grid?.published === true;
  const publishedToday = grids[today]?.published === true;

  const onSelect = (data: PlanbyEpgData) => {
    if (data.isOffAir || data.isMissing) return;
    navigate(`/tv/program/${data.programId}`);
  };

  const byId = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs]);

  return (
    <div className="min-h-screen bg-ink-950 pb-16">
      <div className="bg-noise-red border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-28 sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-balafon">EPG · Balafon TV uniquement</p>
          <h1 className="font-display mt-1 text-3xl font-black uppercase tracking-tight text-paper sm:text-4xl">
            Guide TV
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] text-mist">
            La grille officielle de Balafon TV, à la minute près — programmes en direct, rediffusions
            et périodes hors antenne. Fuseau Africa/Douala.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <DaySelector value={selectedDate} onChange={setSelectedDate} startOffset={-1} days={7} />
            <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filtrer par catégorie">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={category === f.id}
                  onClick={() => setCategory(f.id)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-all ${
                    category === f.id
                      ? "border-balafon bg-balafon/15 text-balafon"
                      : "border-ink-600 bg-ink-800 text-mist hover:border-ink-500 hover:text-paper"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_300px]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {!published && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-goldwarn/40 bg-goldwarn/10 px-4 py-3 text-[13px] font-semibold text-goldwarn">
              <Tv size={15} aria-hidden />
              Programmation du jour non publiée — la grille est en cours de validation par le Directeur d’Antenne.
            </div>
          )}
          <BalafonEpg
            date={selectedDate}
            mode="public"
            now={now}
            publicGate
            categoryFilter={category === "all" ? null : category}
            gridStatus={grid?.status ?? null}
            onSelectItem={onSelect}
            heightPx={230}
          />
          <p className="mt-3 text-[11.5px] text-mist-dark">
            Astuce : faites glisser la timeline horizontalement · la ligne rouge indique l’instant présent.
          </p>
        </motion.div>

        {/* Panneau Maintenant / Ensuite */}
        <aside className="space-y-4" aria-label="En direct maintenant">
          <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-800">
            <p className="border-b border-ink-700 px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-mist">
              Maintenant
            </p>
            {publishedToday && live.currentProgram && live.currentProgram.category !== "off-air" ? (
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                    <ProgramPoster program={live.currentProgram} className="h-full w-full" />
                  </div>
                  <div className="min-w-0">
                    <span className="live-pulse inline-block rounded bg-balafon px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white">
                      Direct
                    </span>
                    <p className="mt-1 truncate text-[14px] font-extrabold text-paper">{live.currentProgram.title}</p>
                    <p className="font-mono text-[11.5px] tabular-nums text-mist">
                      {live.current?.startTime} – {live.current?.endTime}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={live.progress} />
                </div>
                <Link to={`/tv/program/${live.currentProgram.id}`} className="mt-3 flex items-center gap-1 text-[12.5px] font-extrabold text-balafon hover:text-balafon-soft">
                  Voir la fiche <ArrowRight size={13} aria-hidden />
                </Link>
              </div>
            ) : (
              <p className="p-4 text-[13px] text-mist">Hors antenne — aucune diffusion en cours.</p>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-800">
            <p className="border-b border-ink-700 px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-mist">
              Ensuite
            </p>
            <ul className="divide-y divide-ink-700">
              {publishedToday && live.upcoming.length > 0 ? (
                live.upcoming.slice(0, 4).map(({ item, program }) => (
                  <li key={item.id}>
                    <Link to={`/tv/program/${program?.id ?? ""}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-700/50">
                      <span className="w-14 shrink-0 font-mono text-[13px] font-bold tabular-nums text-balafon">{item.startTime}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-bold text-paper">{program?.title}</span>
                        <span className="text-[11px] text-mist-dark">
                          {durationLabel(toMinutes(item.endTime) - toMinutes(item.startTime))} ·{" "}
                          {program ? CATEGORY_META[program.category].label : "—"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-4 py-3 text-[13px] text-mist">Reprise des programmes à 06:00.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

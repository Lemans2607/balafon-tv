import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Radio, Tv } from "lucide-react";

import { BalafonEpg } from "../../components/planby/BalafonEpg";
import type { PlanbyEpgData } from "../../components/planby/planbyMappers";
import { useAppStore } from "../../store/appStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useNow, useCurrentProgram } from "../../hooks/useNow";
import { CATEGORY_META, type ProgramCategory } from "../../types";
import { durationLabel, todayKey, toMinutes } from "../../utils/time";
import { DaySelector, ProgressBar } from "../../components/ui";
import { ProgramPoster } from "../../components/media/ProgramPoster";

const FILTERS: Array<{ id: ProgramCategory | "all"; label: string }> = [
  { id: "all", label: "Tout" },
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

  const liveMeta = live.currentProgram ? CATEGORY_META[live.currentProgram.category] : null;

  return (
    <div className="min-h-screen bg-ink-950 pb-20 text-paper">
      {/* ================= EN-TÊTE ================= */}
      <header className="relative overflow-hidden border-b border-ink-800 glow-balafon grain">
        <div className="relative mx-auto max-w-7xl px-4 pb-9 pt-28 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-balafon">
                <Tv size={13} aria-hidden /> EPG · Balafon TV
              </p>
              <h1 className="font-display mt-2 text-[40px] font-black uppercase leading-none tracking-tightest sm:text-[54px]">
                Guide <span className="text-balafon">TV</span>
              </h1>
              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-mist">
                La grille officielle, à la minute près — direct, rediffusions et hors antenne.
                Fuseau <span className="font-mono text-balafon">Africa/Douala</span>.
              </p>
            </div>

            {/* Bandeau Maintenant / Ensuite */}
            {publishedToday && live.currentProgram && live.currentProgram.category !== "off-air" && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm rounded-xl border border-ink-700 bg-ink-900/80 p-4 backdrop-blur"
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ink-700">
                    <ProgramPoster program={live.currentProgram} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="live-pulse inline-flex items-center gap-1.5 rounded bg-balafon px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-white">
                      <Radio size={9} aria-hidden /> Direct
                    </span>
                    <p className="mt-1 truncate text-[15px] font-extrabold">{live.currentProgram.title}</p>
                    <p className="font-mono text-[11.5px] tabular-nums text-mist">
                      {live.current?.startTime} – {live.current?.endTime}
                      {liveMeta && <span style={{ color: liveMeta.color }}> · {liveMeta.label}</span>}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={live.progress} />
                </div>
                {live.nextProgram && (
                  <p className="mt-2.5 truncate text-[11.5px] text-mist-dark">
                    Ensuite · <span className="font-bold text-mist">{live.nextProgram.title}</span>{" "}
                    <span className="font-mono tabular-nums text-balafon">{live.next?.startTime}</span>
                  </p>
                )}
              </motion.div>
            )}
          </div>

          <div className="mt-8 space-y-4">
            <DaySelector value={selectedDate} onChange={setSelectedDate} startOffset={-1} days={7} />
            <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filtrer par catégorie">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={category === f.id}
                  onClick={() => setCategory(f.id)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-[12px] font-extrabold transition-all duration-200 ${
                    category === f.id
                      ? "border-balafon bg-balafon text-white shadow-[0_4px_16px_rgba(227,30,36,0.4)]"
                      : "border-ink-600 bg-ink-900/70 text-mist hover:-translate-y-0.5 hover:border-ink-500 hover:text-paper"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ================= EPG + PANNEAU ================= */}
      <div className="mx-auto mt-9 grid max-w-7xl gap-7 px-4 sm:px-6 lg:grid-cols-[1fr_310px]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          {!published && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-goldwarn/40 bg-goldwarn/8 px-4 py-3 text-[13px] font-bold text-goldwarn">
              <Tv size={15} aria-hidden />
              Programmation du jour en cours de validation par la Direction d’Antenne.
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
          <p className="mt-3.5 text-[11.5px] text-mist-dark">
            Faites glisser la timeline · la ligne <span className="font-bold text-balafon">orange</span> indique l’instant présent ·
            cliquez sur un programme pour sa fiche.
          </p>
        </motion.div>

        {/* Panneau Ensuite */}
        <aside aria-label="À suivre sur Balafon TV">
          <div className="overflow-hidden rounded-xl border border-ink-700 bg-ink-900/70">
            <p className="flex items-center justify-between border-b border-ink-800 px-4 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-balafon">
              À suivre
              <Link to="/tv" className="text-mist-dark transition-colors hover:text-balafon">
                <ArrowRight size={13} aria-hidden />
              </Link>
            </p>
            <ul className="divide-y divide-ink-800">
              {publishedToday && live.upcoming.length > 0 ? (
                live.upcoming.slice(0, 5).map(({ item, program }) => (
                  <li key={item.id}>
                    <Link
                      to={`/tv/program/${program?.id ?? ""}`}
                      className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="w-14 shrink-0 font-mono text-[14px] font-bold tabular-nums text-balafon">
                        {item.startTime}
                      </span>
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-ink-700">
                        {program && <ProgramPoster program={program} className="h-full w-full object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-extrabold">{program?.title}</span>
                        <span className="text-[11px] text-mist-dark">
                          {durationLabel(toMinutes(item.endTime) - toMinutes(item.startTime))}
                          {program && <> · {CATEGORY_META[program.category].label}</>}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-4 py-4 text-[13px] text-mist">Reprise des programmes à 06:00.</li>
              )}
            </ul>
          </div>

          <div className="mt-5 rounded-xl border border-ink-700 bg-ink-900/70 p-5">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ocean-soft">Bon à savoir</p>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-mist">
              Les horaires marqués <span className="font-bold text-goldwarn">« estimés »</span> dans les fiches sont des
              hypothèses de démonstration ; la grille définitive est validée chaque jour par la Direction d’Antenne.
            </p>
            <Link to="/tv/replay" className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-studio hover:opacity-80">
              Voir les replays disponibles <ArrowRight size={13} aria-hidden />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

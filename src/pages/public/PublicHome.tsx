import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Clock, Moon, Play } from "lucide-react";
import { useNow, useCurrentProgram } from "../../hooks/useNow";
import { useScheduleStore } from "../../store/scheduleStore";
import { HERO_BACKDROP } from "../../data/programs";
import { CATEGORY_META } from "../../types";
import { durationLabel, sinceISO, tillISO, todayKey, toMinutes } from "../../utils/time";
import { ProgressBar, SimClock } from "../../components/ui";
import { ProgramPoster } from "../../components/media/ProgramPoster";
import { FakePlayer } from "../../components/media/FakePlayer";

export function PublicHome() {
  const now = useNow(1000);
  const today = todayKey();
  const grids = useScheduleStore((s) => s.grids);
  const programs = useScheduleStore((s) => s.programs);
  const live = useCurrentProgram(today, now);
  const [playerOpen, setPlayerOpen] = useState(false);
  const navigate = useNavigate();

  const published = grids[today]?.published === true;
  const current = published ? live.currentProgram : null;
  const currentItem = published ? live.current : null;
  const nextItem = published ? live.next : null;
  const nextProgram = published ? live.nextProgram : null;
  const isOffAir = !current || current.category === "off-air";
  const backdrop = (!isOffAir && current?.backdropUrl) || HERO_BACKDROP;

  const evening = useMemo(() => {
    if (!published) return [];
    return live.items
      .filter((it) => toMinutes(it.startTime) >= 17 * 60)
      .map((item) => ({ item, program: programs.find((p) => p.id === item.programId) }))
      .filter((x) => x.program);
  }, [live.items, programs, published]);

  const replayables = useMemo(
    () => programs.filter((p) => p.isReplayAvailable && p.category !== "off-air").slice(0, 8),
    [programs]
  );

  return (
    <div className="bg-ink-950">
      {/* ================= HERO DU DIRECT ================= */}
      <section className="relative flex min-h-[86vh] items-end overflow-hidden">
        <div className="absolute inset-0" aria-hidden>
          <img
            src={backdrop}
            alt=""
            className="h-full w-full scale-105 object-cover opacity-60 transition-transform duration-[3000ms]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/85 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-16 pt-32 sm:px-6">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_300px]">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              {isOffAir ? (
                <span className="inline-flex items-center gap-2 rounded-lg border border-ink-500 bg-ink-800/80 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-mist">
                  <Moon size={13} aria-hidden /> Hors antenne
                </span>
              ) : (
                <span className="live-pulse inline-flex items-center gap-2 rounded-lg bg-balafon px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-white">
                  <span className="h-2 w-2 rounded-full bg-white" aria-hidden /> En direct
                </span>
              )}

              <h1 className="font-display mt-5 max-w-3xl text-4xl font-black uppercase leading-[0.98] tracking-tightest text-paper sm:text-6xl">
                {isOffAir ? "L’antenne est en pause" : current?.title}
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-mist">
                {isOffAir
                  ? "Aucune diffusion en cours. Retrouvez C'le Matin dès 07 h 00 du lundi au vendredi, et nos magazines le week-end sur Balafon TV."
                  : current?.description}
              </p>

              {currentItem && !isOffAir && (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[13px] tabular-nums text-paper">
                    <Clock size={13} className="text-balafon" aria-hidden />
                    {currentItem.startTime} – {currentItem.endTime}
                  </span>
                  <span
                    className="rounded-lg px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider"
                    style={{
                      background: CATEGORY_META[current!.category].soft,
                      color: CATEGORY_META[current!.category].color,
                    }}
                  >
                    {CATEGORY_META[current!.category].label}
                  </span>
                  {nextProgram && nextItem && (
                    <span className="text-[12.5px] font-semibold text-mist">
                      Ensuite · <span className="text-paper">{nextProgram.title}</span>{" "}
                      <span className="font-mono text-mist-dark">{nextItem.startTime}</span>
                    </span>
                  )}
                </div>
              )}

              {!isOffAir && (
                <div className="mt-5 max-w-md">
                  <ProgressBar value={live.progress} />
                  <p className="mt-1.5 font-mono text-[11px] text-mist-dark">
                    {Math.round(live.progress)} % de l’émission écoulée
                  </p>
                </div>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setPlayerOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-balafon px-6 py-3 text-[14px] font-extrabold text-white shadow-[0_10px_30px_rgba(255,61,0,0.4)] transition-transform hover:scale-[1.03] active:scale-95"
                >
                  <Play size={16} aria-hidden /> Regarder le Live
                </button>
                <Link
                  to="/tv/guide"
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-[14px] font-extrabold text-paper backdrop-blur transition-colors hover:border-balafon/60 hover:text-balafon"
                >
                  <CalendarDays size={16} aria-hidden /> Voir le Guide TV
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="hidden lg:block"
            >
              <SimClock compact />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= RAIL EN CE MOMENT ================= */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6" aria-label="En ce moment sur Balafon TV">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-balafon">Antenne</p>
            <h2 className="font-display mt-1 text-2xl font-black uppercase tracking-tight text-paper sm:text-3xl">
              En ce moment
            </h2>
          </div>
          <Link to="/tv/guide" className="flex items-center gap-1 text-[13px] font-bold text-mist transition-colors hover:text-balafon">
            Guide complet <ArrowRight size={14} aria-hidden />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Actuel */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`group relative overflow-hidden rounded-2xl border md:col-span-2 ${
              isOffAir ? "border-ink-600 bg-ink-800" : "border-balafon/40 bg-ink-800"
            }`}
          >
            <div className="flex h-full">
              {current && !isOffAir ? (
                <div className="relative w-2/5 shrink-0 overflow-hidden">
                  <ProgramPoster program={current} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
                  <span className="live-pulse absolute left-3 top-3 rounded bg-balafon px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white">
                    En direct
                  </span>
                </div>
              ) : (
                <div className="flex w-2/5 shrink-0 items-center justify-center bg-[#0a0d14]">
                  <Moon size={40} className="text-ink-600" aria-hidden />
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <p className="font-mono text-[12px] tabular-nums text-mist">
                  {currentItem ? `${currentItem.startTime} – ${currentItem.endTime}` : "00:00 – 06:00"} ·{" "}
                  {current && !isOffAir ? durationLabel(toMinutes(currentItem!.endTime) - toMinutes(currentItem!.startTime)) : "Hors antenne"}
                </p>
                <h3 className="font-display mt-2 text-xl font-extrabold text-paper">
                  {isOffAir ? "Hors antenne" : current?.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-mist">
                  {isOffAir ? "Aucune diffusion planifiée. Reprise des programmes à 06 h 00." : current?.description}
                </p>
                <div className="mt-auto pt-4">
                  {!isOffAir && <ProgressBar value={live.progress} />}
                  <button
                    type="button"
                    onClick={() => (isOffAir ? navigate("/tv/guide") : setPlayerOpen(true))}
                    className="mt-3 flex items-center gap-1.5 text-[13px] font-extrabold text-balafon transition-colors hover:text-balafon-soft"
                  >
                    <Play size={14} aria-hidden /> {isOffAir ? "Consulter le guide" : "Regarder"}
                  </button>
                </div>
              </div>
            </div>
          </motion.article>

          {/* Suivant */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="group relative overflow-hidden rounded-2xl border border-ink-600 bg-ink-800 transition-colors hover:border-ink-500"
          >
            {nextProgram ? (
              <>
                <div className="relative h-40 overflow-hidden">
                  <ProgramPoster program={nextProgram} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute left-3 top-3 rounded bg-ink-950/85 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-mist">
                    Suivant
                  </span>
                </div>
                <div className="p-5">
                  <p className="font-mono text-[12px] tabular-nums text-mist">{nextItem?.startTime}</p>
                  <h3 className="font-display mt-1 text-[17px] font-extrabold text-paper">{nextProgram.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[12.5px] text-mist">{nextProgram.subtitle}</p>
                  <Link to={`/tv/program/${nextProgram.id}`} className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-extrabold text-balafon hover:text-balafon-soft">
                    Détails <ArrowRight size={13} aria-hidden />
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-64 flex-col items-center justify-center p-6 text-center">
                <Moon size={30} className="text-ink-600" aria-hidden />
                <p className="mt-3 text-[13.5px] font-bold text-mist">Fin d’antenne</p>
                <p className="mt-1 text-[12px] text-mist-dark">Prochaine émission demain à 06:00</p>
              </div>
            )}
          </motion.article>
        </div>

        {/* À venir */}
        {live.upcoming.length > 1 && (
          <div className="mt-6 flex gap-4 overflow-x-auto pb-3">
            {live.upcoming.slice(1, 6).map(({ item, program }, i) =>
              program ? (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/tv/program/${program.id}`}
                    className="group block w-44 shrink-0 overflow-hidden rounded-xl border border-ink-600 bg-ink-800 transition-all hover:-translate-y-1 hover:border-ink-500"
                  >
                    <div className="relative h-28 overflow-hidden">
                      <ProgramPoster program={program} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
                      <span className="absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-balafon opacity-0 transition-opacity group-hover:opacity-100">
                        <Play size={12} className="text-white" aria-hidden />
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="font-mono text-[11px] tabular-nums text-mist">{item.startTime}</p>
                      <p className="mt-0.5 truncate text-[12.5px] font-bold text-paper">{program.title}</p>
                    </div>
                  </Link>
                </motion.div>
              ) : null
            )}
          </div>
        )}
      </section>

      {/* ================= CE SOIR ================= */}
      {evening.length > 0 && (
        <section className="border-t border-white/5 bg-ink-900/40" aria-label="Ce soir sur Balafon TV">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-balafon">Prime time</p>
            <h2 className="font-display mt-1 text-2xl font-black uppercase tracking-tight text-paper sm:text-3xl">
              Ce soir sur Balafon TV
            </h2>
            <ul className="mt-6 divide-y divide-ink-700 overflow-hidden rounded-2xl border border-ink-700 bg-ink-800/60">
              {evening.map(({ item, program }) => (
                <li key={item.id}>
                  <Link
                    to={`/tv/program/${program!.id}`}
                    className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-ink-700/60"
                  >
                    <span className="w-24 shrink-0 font-mono text-[14px] font-bold tabular-nums text-balafon">
                      {item.startTime}
                    </span>
                    <span className="hidden h-10 w-10 shrink-0 overflow-hidden rounded-lg sm:block">
                      <ProgramPoster program={program!} className="h-full w-full" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-extrabold text-paper">{program!.title}</span>
                      <span className="block truncate text-[12px] text-mist-dark">{program!.subtitle}</span>
                    </span>
                    <span
                      className="hidden shrink-0 rounded-md px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide sm:block"
                      style={{
                        background: CATEGORY_META[program!.category].soft,
                        color: CATEGORY_META[program!.category].color,
                      }}
                    >
                      {CATEGORY_META[program!.category].label}
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-mist-dark" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ================= TEASER REPLAY ================= */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6" aria-label="Replay disponibles">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-studio">À la demande</p>
            <h2 className="font-display mt-1 text-2xl font-black uppercase tracking-tight text-paper sm:text-3xl">Replay</h2>
          </div>
          <Link to="/tv/replay" className="flex items-center gap-1 text-[13px] font-bold text-mist transition-colors hover:text-studio">
            Tout le replay <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3">
          {replayables.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/tv/program/${p.id}`}
                className="group block w-40 shrink-0 overflow-hidden rounded-xl border border-ink-600 bg-ink-800 transition-all hover:-translate-y-1 hover:border-studio/50"
              >
                <div className="relative aspect-[2/3] overflow-hidden">
                  <ProgramPoster program={p} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute bottom-2 right-2 rounded bg-ink-950/85 px-1.5 py-0.5 font-mono text-[10px] text-studio">
                    {p.durationMinutes} min
                  </span>
                </div>
                <p className="truncate p-3 text-[12.5px] font-bold text-paper">{p.title}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <FakePlayer
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
        title={isOffAir ? "Balafon TV" : current?.title ?? "Balafon TV"}
        subtitle={isOffAir ? "Hors antenne — reprise à 06:00" : current?.subtitle}
        live={!isOffAir}
      />
    </div>
  );
}

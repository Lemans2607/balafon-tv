import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, ChevronRight, Clock, Moon, Play } from "lucide-react";

import { useNow, useCurrentProgram } from "../../hooks/useNow";
import { useScheduleStore } from "../../store/scheduleStore";
import { HERO_BACKDROP } from "../../data/programs";
import { CATEGORY_META, type Program } from "../../types";
import { durationLabel, formatClock, labelDay, todayKey, toMinutes } from "../../utils/time";
import { ProgressBar, SimClock } from "../../components/ui";
import { ProgramPoster } from "../../components/media/ProgramPoster";
import { FakePlayer } from "../../components/media/FakePlayer";
import { BALAFON_LOGO_URI } from "../../components/planby/planbyMappers";

/* ============================================================
   PORTAIL PUBLIC — BALAFON TV (chaîne TV uniquement, pas de radio)
   Ouverture sur ce qui est À L'ANTENNE, comme un vrai portail OTT.
   ============================================================ */

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

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
  const currentMeta = current ? CATEGORY_META[current.category] : null;

  const evening = useMemo(() => {
    if (!published) return [];
    return live.items
      .filter((it) => toMinutes(it.startTime) >= 17 * 60)
      .map((item) => ({ item, program: programs.find((p) => p.id === item.programId) }))
      .filter((x) => x.program && x.program!.category !== "off-air")
      .slice(0, 5);
  }, [live.items, programs, published]);

  const replayables = useMemo(
    () => programs.filter((p) => p.isReplayAvailable && p.category !== "off-air").slice(0, 10),
    [programs]
  );

  const upcoming = live.upcoming.filter(({ program }) => program && program.category !== "off-air");

  return (
    <div className="bg-ink-950 text-paper">
      {/* ================================================= HERO — L'ANTENNE */}
      <section className="relative flex min-h-[92vh] items-end overflow-hidden grain" aria-label="Programme en direct">
        {/* Fond vidéo simulé + couches cinématographiques */}
        <div className="absolute inset-0" aria-hidden>
          <img
            src={backdrop}
            alt=""
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            className="h-full w-full scale-[1.04] object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/45 to-ink-950/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/30 to-transparent" />
          <div className="glow-balafon absolute inset-0" />
          <div className="scanline" />
        </div>

        {/* Bug chaîne — habillage antenne */}
        <div className="absolute right-5 top-24 z-10 flex flex-col items-end gap-2 sm:right-8" aria-hidden>
          <span className="flex items-center gap-2 rounded-md border border-white/10 bg-ink-950/70 px-3 py-1.5 backdrop-blur-md">
            <img src={BALAFON_LOGO_URI} alt="" className="h-5 w-5 rounded" />
            <span className="font-display text-[12px] font-black uppercase tracking-widest text-paper">
              Balafon <span className="text-balafon">TV</span>
            </span>
          </span>
          <span className="rounded-md bg-ink-950/70 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-mist backdrop-blur-md">
            Canal 04 · Douala · {formatClock(now)}
          </span>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-14 pt-36 sm:px-6 lg:pb-20">
          <div className="grid items-end gap-10 lg:grid-cols-[1.5fr_1fr]">
            <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: "easeOut" }}>
              {/* Bandeau statut antenne */}
              {isOffAir ? (
                <span className="inline-flex items-center gap-2 rounded-md border border-ink-600 bg-ink-900/80 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-mist backdrop-blur">
                  <Moon size={13} aria-hidden /> Hors antenne — reprise 06:00
                </span>
              ) : (
                <span className="live-pulse inline-flex items-center gap-2.5 rounded-md bg-balafon px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-950">
                  <span className="flex h-3 items-end gap-[3px]" aria-hidden>
                    <span className="eq-bar1 w-[3px] rounded-sm bg-ink-950" />
                    <span className="eq-bar2 w-[3px] rounded-sm bg-ink-950" />
                    <span className="eq-bar3 w-[3px] rounded-sm bg-ink-950" />
                  </span>
                  En direct
                </span>
              )}

              <p className="mt-5 font-mono text-[11.5px] uppercase tracking-[0.28em] text-balafon">
                {labelDay(today)} · {isOffAir ? "Nuit" : "Antenne"}
              </p>

              <h1 className="font-display mt-3 max-w-3xl text-[44px] font-black uppercase leading-[0.95] tracking-tightest sm:text-[68px] lg:text-[76px]">
                {isOffAir ? (
                  <>
                    L’antenne revient <span className="text-balafon">à 06:00</span>
                  </>
                ) : (
                  current?.title
                )}
              </h1>

              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-mist sm:text-[16px]">
                {isOffAir
                  ? "Aucune diffusion en cours. Retrouvez C'le Matin dès 07 h 00 du lundi au vendredi, et nos magazines le week-end."
                  : current?.description}
              </p>

              {/* Méta précises — horodatage broadcast */}
              {currentItem && !isOffAir && (
                <div className="mt-6 flex flex-wrap items-center gap-2.5">
                  <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-ink-900/70 px-3.5 py-2 font-mono text-[13.5px] font-bold tabular-nums text-paper backdrop-blur">
                    <Clock size={14} className="text-balafon" aria-hidden />
                    {currentItem.startTime} – {currentItem.endTime}
                  </span>
                  {currentMeta && (
                    <span
                      className="rounded-lg px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-widest"
                      style={{ background: currentMeta.soft, color: currentMeta.color }}
                    >
                      {currentMeta.label}
                    </span>
                  )}
                  {nextProgram && nextItem && (
                    <span className="text-[13px] font-semibold text-mist">
                      Ensuite <ChevronRight size={13} className="inline text-balafon" aria-hidden />{" "}
                      <span className="text-paper">{nextProgram.title}</span>{" "}
                      <span className="font-mono tabular-nums text-balafon">{nextItem.startTime}</span>
                    </span>
                  )}
                </div>
              )}

              {!isOffAir && (
                <div className="mt-6 max-w-md">
                  <ProgressBar value={live.progress} />
                  <div className="mt-1.5 flex justify-between font-mono text-[11px] text-mist-dark">
                    <span>{Math.round(live.progress)} % écoulé</span>
                    <span className="tabular-nums">{currentItem?.startTime} → {currentItem?.endTime}</span>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => setPlayerOpen(true)}
                  className="group flex items-center gap-2.5 rounded-xl bg-balafon px-7 py-3.5 text-[14.5px] font-extrabold text-ink-950 shadow-[0_12px_36px_rgba(242,121,15,0.4)] transition-all hover:-translate-y-0.5 hover:bg-balafon-soft active:translate-y-0"
                >
                  <Play size={17} className="transition-transform group-hover:scale-110" aria-hidden />
                  Regarder le direct
                </button>
                <Link
                  to="/tv/guide"
                  className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.04] px-7 py-3.5 text-[14.5px] font-extrabold text-paper backdrop-blur transition-all hover:-translate-y-0.5 hover:border-balafon/70 hover:text-balafon"
                >
                  <CalendarDays size={16} aria-hidden /> Guide TV
                </Link>
              </div>
            </motion.div>

            {/* Colonne horloge — habillage régie */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="hidden lg:block"
            >
              <SimClock compact />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================================================= EN CE MOMENT */}
      <section className="relative mx-auto max-w-7xl px-4 pb-6 pt-16 sm:px-6" aria-label="En ce moment sur Balafon TV">
        <RailHeader kicker="Antenne" title="En ce moment" to="/tv/guide" toLabel="Guide complet" />

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          {/* Actuel — grande carte paysage */}
          <motion.article {...fadeUp} className={`group relative overflow-hidden rounded-xl border ${isOffAir ? "border-ink-700" : "border-balafon/40"} bg-ink-800`}>
            <div className="flex h-full flex-col sm:flex-row">
              <div className="relative aspect-video w-full shrink-0 overflow-hidden sm:aspect-auto sm:w-[46%]">
                {current && !isOffAir ? (
                  <>
                    <ProgramPoster program={current} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                    <span className="live-pulse absolute left-3.5 top-3.5 rounded-md bg-balafon px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-ink-950">
                      En direct
                    </span>
                  </>
                ) : (
                  <div className="glow-ocean flex h-full min-h-44 w-full items-center justify-center bg-ink-900">
                    <Moon size={44} className="text-ink-600" aria-hidden />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="font-mono text-[12px] font-bold tabular-nums text-balafon">
                  {currentItem ? `${currentItem.startTime} – ${currentItem.endTime}` : "00:00 – 06:00"}
                  {currentItem && <span className="text-mist-dark"> · {durationLabel(toMinutes(currentItem.endTime) - toMinutes(currentItem.startTime))}</span>}
                </p>
                <h3 className="font-display mt-2 text-[24px] font-black uppercase leading-tight tracking-tight">{isOffAir ? "Hors antenne" : current?.title}</h3>
                <p className="mt-2.5 line-clamp-3 text-[13.5px] leading-relaxed text-mist">
                  {isOffAir ? "Aucune diffusion planifiée. Reprise des programmes à 06 h 00." : current?.description}
                </p>
                <div className="mt-auto pt-5">
                  {!isOffAir && <ProgressBar value={live.progress} />}
                  <button
                    type="button"
                    onClick={() => (isOffAir ? navigate("/tv/guide") : setPlayerOpen(true))}
                    className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-extrabold text-balafon transition-colors hover:text-balafon-soft"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-balafon/15 transition-transform group-hover:scale-110">
                      <Play size={13} aria-hidden />
                    </span>
                    {isOffAir ? "Consulter le guide" : "Regarder maintenant"}
                  </button>
                </div>
              </div>
            </div>
          </motion.article>

          {/* Suivant */}
          <motion.article {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="group relative overflow-hidden rounded-xl border border-ink-700 bg-ink-800 transition-colors hover:border-ink-500">
            {nextProgram ? (
              <>
                <div className="relative aspect-video overflow-hidden">
                  <ProgramPoster program={nextProgram} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-transparent to-transparent" aria-hidden />
                  <span className="absolute left-3.5 top-3.5 rounded-md bg-ink-950/80 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-mist backdrop-blur">
                    Ensuite
                  </span>
                  <div className="absolute bottom-3.5 left-3.5 right-3.5">
                    <p className="font-mono text-[12px] font-bold tabular-nums text-balafon">{nextItem?.startTime}</p>
                    <h3 className="font-display mt-0.5 truncate text-[19px] font-black uppercase tracking-tight">{nextProgram.title}</h3>
                  </div>
                </div>
                <div className="flex items-center justify-between p-5 pt-4">
                  <p className="line-clamp-1 text-[12.5px] text-mist">{nextProgram.subtitle}</p>
                  <Link
                    to={`/tv/program/${nextProgram.id}`}
                    className="flex shrink-0 items-center gap-1 text-[12.5px] font-extrabold text-balafon hover:text-balafon-soft"
                  >
                    Détails <ArrowRight size={13} aria-hidden />
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-64 flex-col items-center justify-center p-6 text-center">
                <Moon size={30} className="text-ink-600" aria-hidden />
                <p className="mt-3 text-[14px] font-extrabold">Fin d’antenne</p>
                <p className="mt-1 text-[12.5px] text-mist-dark">Prochaine émission demain à 06:00</p>
              </div>
            )}
          </motion.article>
        </div>

        {/* À venir — rail défilant */}
        {upcoming.length > 1 && (
          <div className="mt-5 flex gap-4 overflow-x-auto pb-3">
            {upcoming.slice(1, 7).map(({ item, program }, i) => (
              <motion.div key={item.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }} className="shrink-0">
                <Link
                  to={`/tv/program/${program!.id}`}
                  className="group block w-52 overflow-hidden rounded-xl border border-ink-700 bg-ink-800 transition-all duration-300 hover:-translate-y-1 hover:border-ocean/60"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <ProgramPoster program={program!} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                    <span className="absolute bottom-2 left-2 rounded bg-ink-950/85 px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-balafon backdrop-blur">
                      {item.startTime}
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center bg-ink-950/0 transition-colors group-hover:bg-ink-950/30">
                      <span className="flex h-10 w-10 scale-75 items-center justify-center rounded-full bg-balafon opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                        <Play size={15} className="ml-0.5 text-ink-950" aria-hidden />
                      </span>
                    </span>
                  </div>
                  <div className="p-3.5">
                    <p className="truncate text-[13px] font-extrabold">{program!.title}</p>
                    <p className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wider" style={{ color: CATEGORY_META[program!.category].color }}>
                      {CATEGORY_META[program!.category].label}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ================================================= CE SOIR — liste éditoriale numérotée */}
      {evening.length > 0 && (
        <section className="relative mt-14 border-y border-ink-800 bg-ink-900/60 glow-ocean" aria-label="Ce soir sur Balafon TV">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <RailHeader kicker="Prime time" title="Ce soir sur Balafon TV" to="/tv/guide" toLabel="Toute la grille" dark />

            <ol className="mt-8 divide-y divide-ink-800">
              {evening.map(({ item, program }, i) => (
                <motion.li key={item.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.06 }}>
                  <Link
                    to={`/tv/program/${program!.id}`}
                    className="group relative flex items-center gap-5 py-4 pl-1 transition-colors hover:bg-white/[0.02] sm:gap-8 sm:py-5"
                  >
                    <span className="num-outline font-display w-16 shrink-0 text-[52px] font-black leading-none sm:w-24 sm:text-[72px]" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="hidden h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-ink-700 sm:block">
                      <ProgramPoster program={program!} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[17px] font-black uppercase tracking-tight sm:text-[20px]">
                        {program!.title}
                      </span>
                      <span className="mt-1 block truncate text-[12.5px] text-mist-dark">
                        {program!.subtitle ?? CATEGORY_META[program!.category].label}
                      </span>
                    </span>
                    <span className="hidden shrink-0 rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest md:block"
                      style={{ background: CATEGORY_META[program!.category].soft, color: CATEGORY_META[program!.category].color }}>
                      {CATEGORY_META[program!.category].label}
                    </span>
                    <span className="shrink-0 rounded-lg bg-balafon/12 px-3.5 py-2 font-mono text-[15px] font-bold tabular-nums text-balafon">
                      {item.startTime}
                    </span>
                    <ArrowRight size={17} className="shrink-0 text-ink-600 transition-all group-hover:translate-x-1 group-hover:text-balafon" aria-hidden />
                  </Link>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ================================================= REPLAY */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-label="Replay disponibles">
        <RailHeader kicker="À la demande" title="Replay" to="/tv/replay" toLabel="Tout le replay" accent="#00F5A0" />

        <div className="mt-6 flex gap-4 overflow-x-auto pb-3">
          {replayables.map((p, i) => (
            <motion.div key={p.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.04 }} className="shrink-0">
              <Link
                to={`/tv/program/${p.id}`}
                className="group block w-44 overflow-hidden rounded-xl border border-ink-700 bg-ink-800 transition-all duration-300 hover:-translate-y-1 hover:border-studio/50 sm:w-48"
              >
                <div className="relative aspect-[2/3] overflow-hidden">
                  <ProgramPoster program={p} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                  <span className="absolute inset-0 flex items-end justify-between p-2.5" aria-hidden>
                    <span className="rounded bg-ink-950/85 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider" style={{ color: CATEGORY_META[p.category].color }}>
                      {CATEGORY_META[p.category].label}
                    </span>
                    <span className="rounded bg-ink-950/85 px-1.5 py-0.5 font-mono text-[10px] font-bold text-studio">
                      {p.durationMinutes} min
                    </span>
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center bg-ink-950/0 transition-colors group-hover:bg-ink-950/35">
                    <span className="flex h-11 w-11 scale-75 items-center justify-center rounded-full bg-studio opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                      <Play size={16} className="ml-0.5 text-ink-950" aria-hidden />
                    </span>
                  </span>
                </div>
                <p className="truncate p-3.5 text-[13px] font-extrabold">{p.title}</p>
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

/* ------------------------------------------------ En-tête de rail éditorial */
function RailHeader({
  kicker,
  title,
  to,
  toLabel,
  accent = "#F2790F",
  dark = false,
}: {
  kicker: string;
  title: string;
  to: string;
  toLabel: string;
  accent?: string;
  dark?: boolean;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: accent }}>
          {kicker}
        </p>
        <h2 className={`font-display mt-1.5 text-[28px] font-black uppercase leading-none tracking-tight sm:text-[34px] ${dark ? "text-paper" : ""}`}>
          {title}
        </h2>
      </div>
      <Link
        to={to}
        className="group flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-700 px-3.5 py-2 text-[12.5px] font-extrabold text-mist transition-all hover:border-balafon/60 hover:text-balafon"
      >
        {toLabel}
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden />
      </Link>
    </div>
  );
}

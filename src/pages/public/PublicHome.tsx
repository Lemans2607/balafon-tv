import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, ChevronRight, Moon, Play } from "lucide-react";

import { useNow, useCurrentProgram } from "../../hooks/useNow";
import { useScheduleStore } from "../../store/scheduleStore";
import { HERO_BACKDROP } from "../../data/programs";
import { CATEGORY_META } from "../../types";
import { durationLabel, formatClock, labelDay, todayKey, toMinutes } from "../../utils/time";
import { LiveBadge, ProgressBar, SectionTitle, SimClock } from "../../components/ui";
import { ProgramPoster } from "../../components/media/ProgramPoster";
import { FakePlayer } from "../../components/media/FakePlayer";
import { BALAFON_LOGO_URI } from "../../components/planby/planbyMappers";

/* ============================================================
   PORTAIL PUBLIC — BALAFON TV (TV uniquement, jamais de radio)
   Ouverture « ON AIR » : billboard du programme à l'antenne,
   bandeau ticker défilant, rails façon plateforme OTT.
   ============================================================ */

const rise = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
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

  /* Éléments du ticker d'antenne */
  const tickerItems = useMemo(() => {
    const base = upcoming.slice(0, 8).map(({ item, program }) => ({
      heure: item.startTime,
      titre: program!.title,
      cat: program!.category,
    }));
    return base.length > 0
      ? base
      : [{ heure: "06:00", titre: "Reprise de l'antenne", cat: "news" as const }];
  }, [upcoming]);

  return (
    <div className="bg-ink-950 text-paper">
      {/* ============================ BILLBOARD ON AIR ============================ */}
      <section className="relative flex min-h-[94vh] flex-col justify-end overflow-hidden" aria-label="Programme en direct">
        <div className="absolute inset-0" aria-hidden>
          <img
            src={backdrop}
            alt=""
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            className="kenburns h-full w-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/35 to-transparent" />
          <div className="glow-balafon absolute inset-0" />
          <div className="scanline" />
        </div>

        {/* Bug antenne + horloge */}
        <div className="absolute right-5 top-24 z-10 flex flex-col items-end gap-2.5 sm:right-8 sm:top-28">
          <span className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-ink-950/70 px-3.5 py-2 backdrop-blur-md">
            <img src={BALAFON_LOGO_URI} alt="" className="h-5 w-5 rounded" aria-hidden />
            <span className="font-display text-[15px] uppercase tracking-[0.08em] text-paper">
              Balafon <span className="text-balafon">TV</span>
            </span>
          </span>
          <span className="rounded-lg border border-white/10 bg-ink-950/70 px-3 py-1.5 text-right backdrop-blur-md">
            <span className="block font-mono text-[20px] font-bold leading-none tabular-nums text-paper">
              {formatClock(now)}
            </span>
            <span className="mt-1 block font-mono text-[8.5px] uppercase tracking-[0.24em] text-mist">
              Canal 04 · Douala · WAT
            </span>
          </span>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 pt-40 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              {isOffAir ? (
                <span className="inline-flex items-center gap-2 rounded-md border border-ink-500 bg-ink-900/80 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-mist backdrop-blur">
                  <Moon size={13} aria-hidden /> Hors antenne · reprise 06:00
                </span>
              ) : (
                <LiveBadge />
              )}
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-balafon-soft">
                {labelDay(today)} — l'antenne
              </span>
            </div>

            <h1 className="font-display mt-5 text-[64px] leading-[0.9] sm:text-[96px] lg:text-[116px]">
              {isOffAir ? (
                <>
                  Retour à l'antenne <span className="text-balafon">06:00</span>
                </>
              ) : (
                current?.title
              )}
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-mist sm:text-[16px]">
              {isOffAir
                ? "Aucune diffusion en cours. C'le Matin ouvre l'antenne à 07 h 00 du lundi au vendredi ; magazines et talks prennent le relais tout au long de la journée."
                : current?.description}
            </p>

            {currentItem && !isOffAir && (
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <span className="rounded-lg border border-white/10 bg-ink-900/70 px-4 py-2.5 font-mono text-[15px] font-bold tabular-nums text-paper backdrop-blur">
                  {currentItem.startTime} <span className="text-balafon">→</span> {currentItem.endTime}
                </span>
                {currentMeta && (
                  <span
                    className="rounded-lg px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em]"
                    style={{ background: currentMeta.soft, color: currentMeta.color }}
                  >
                    {currentMeta.label}
                  </span>
                )}
              </div>
            )}

            {!isOffAir && (
              <div className="mt-6 max-w-md">
                <ProgressBar value={live.progress} />
                <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-mist">
                  <span>{Math.round(live.progress)} % écoulé</span>
                  <span>
                    {nextProgram ? (
                      <>
                        ensuite · {nextProgram.title} <span className="text-balafon">{nextItem?.startTime}</span>
                      </>
                    ) : (
                      "fin d'antenne"
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => setPlayerOpen(true)}
                className="sheen group flex items-center gap-3 rounded-xl bg-balafon px-8 py-4 text-[15px] font-extrabold text-white shadow-[0_14px_40px_rgba(227,30,36,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-balafon-soft active:translate-y-0"
              >
                <Play size={18} className="transition-transform duration-300 group-hover:scale-125" aria-hidden />
                Regarder le direct
              </button>
              <Link
                to="/tv/guide"
                className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.04] px-8 py-4 text-[15px] font-extrabold text-paper backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-balafon/70 hover:text-balafon"
              >
                <CalendarDays size={17} aria-hidden /> Guide TV
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Ticker d'antenne — défilement continu */}
        <div className="relative z-10 border-t border-white/10 bg-ink-950/85 backdrop-blur-md">
          <div className="flex items-stretch">
            <span className="z-10 flex shrink-0 items-center gap-2 bg-balafon px-4 py-3 font-mono text-[11px] font-extrabold uppercase tracking-[0.2em] text-white sm:px-5">
              <ChevronRight size={13} className="soft-blink" aria-hidden /> À suivre
            </span>
            <div className="relative flex-1 overflow-hidden">
              <div className="ticker-track items-center gap-0 py-3">
                {[0, 1].map((rep) => (
                  <div key={rep} className="flex items-center" aria-hidden={rep === 1}>
                    {tickerItems.map((t, i) => (
                      <span key={`${rep}-${i}`} className="flex items-center whitespace-nowrap">
                        <span className="px-4 font-mono text-[12.5px] font-bold tabular-nums text-balafon">{t.heure}</span>
                        <span className="pr-4 text-[13px] font-bold text-paper">{t.titre}</span>
                        <span
                          className="mr-5 rounded-sm px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-widest"
                          style={{ background: CATEGORY_META[t.cat].soft, color: CATEGORY_META[t.cat].color }}
                        >
                          {CATEGORY_META[t.cat].label}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-ink-500" aria-hidden />
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ EN CE MOMENT ============================ */}
      <section className="relative mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6" aria-label="En ce moment sur Balafon TV">
        <SectionTitle
          kicker="Sur l'antenne"
          title="En ce moment"
          right={
            <Link
              to="/tv/guide"
              className="group hidden shrink-0 items-center gap-2 rounded-lg border border-ink-600 px-4 py-2.5 text-[12.5px] font-extrabold text-mist transition-all hover:border-balafon/60 hover:text-balafon sm:flex"
            >
              Grille complète <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          }
        />

        <div className="mt-7 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          {/* Actuel */}
          <motion.article {...rise} className={`panel sheen group relative overflow-hidden ${isOffAir ? "" : "border-balafon/45 shadow-[0_0_0_1px_rgba(227,30,36,0.25),0_18px_44px_rgba(227,30,36,0.12)]"}`}>
            <div className="flex h-full flex-col sm:flex-row">
              <div className="relative aspect-video w-full shrink-0 overflow-hidden sm:aspect-auto sm:w-[45%]">
                {current && !isOffAir ? (
                  <>
                    <ProgramPoster program={current} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
                    <span className="absolute left-3.5 top-3.5"><LiveBadge /></span>
                  </>
                ) : (
                  <div className="glow-ocean flex h-full min-h-48 w-full items-center justify-center bg-ink-900">
                    <Moon size={46} className="text-ink-600" aria-hidden />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <p className="font-mono text-[12.5px] font-bold tabular-nums text-balafon">
                  {currentItem ? `${currentItem.startTime} – ${currentItem.endTime}` : "00:00 – 06:00"}
                  {currentItem && (
                    <span className="ml-2 text-mist-dark">· {durationLabel(toMinutes(currentItem.endTime) - toMinutes(currentItem.startTime))}</span>
                  )}
                </p>
                <h3 className="font-display mt-2 text-[32px] uppercase leading-[0.95]">{isOffAir ? "Hors antenne" : current?.title}</h3>
                <p className="mt-3 line-clamp-3 text-[13.5px] leading-relaxed text-mist">
                  {isOffAir ? "Aucune diffusion planifiée. Reprise des programmes à 06 h 00." : current?.description}
                </p>
                <div className="mt-auto pt-6">
                  {!isOffAir && <ProgressBar value={live.progress} />}
                  <button
                    type="button"
                    onClick={() => (isOffAir ? navigate("/tv/guide") : setPlayerOpen(true))}
                    className="mt-4 inline-flex items-center gap-2.5 text-[13.5px] font-extrabold text-balafon transition-colors hover:text-balafon-soft"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-balafon/15 transition-transform duration-300 group-hover:scale-110">
                      <Play size={14} aria-hidden />
                    </span>
                    {isOffAir ? "Consulter la grille" : "Regarder maintenant"}
                  </button>
                </div>
              </div>
            </div>
          </motion.article>

          {/* Suivant */}
          <motion.article {...rise} transition={{ ...rise.transition, delay: 0.08 }} className="panel sheen group relative overflow-hidden transition-colors hover:border-ink-500">
            {nextProgram ? (
              <>
                <div className="relative aspect-video overflow-hidden">
                  <ProgramPoster program={nextProgram} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-transparent" aria-hidden />
                  <span className="absolute left-3.5 top-3.5 rounded-md bg-ink-950/80 px-2.5 py-1 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-mist backdrop-blur">
                    Ensuite
                  </span>
                  <div className="absolute bottom-3.5 left-4 right-4">
                    <p className="font-mono text-[13px] font-bold tabular-nums text-balafon">{nextItem?.startTime}</p>
                    <h3 className="font-display mt-0.5 truncate text-[26px] uppercase leading-none">{nextProgram.title}</h3>
                  </div>
                </div>
                <div className="flex items-center justify-between p-5">
                  <p className="line-clamp-1 text-[12.5px] text-mist">{nextProgram.subtitle}</p>
                  <Link to={`/tv/program/${nextProgram.id}`} className="flex shrink-0 items-center gap-1 text-[12.5px] font-extrabold text-balafon hover:text-balafon-soft">
                    Fiche <ArrowRight size={13} aria-hidden />
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-72 flex-col items-center justify-center p-6 text-center">
                <Moon size={32} className="text-ink-600" aria-hidden />
                <p className="font-display mt-3 text-[22px] uppercase">Fin d'antenne</p>
                <p className="mt-1 text-[12.5px] text-mist-dark">Prochaine émission demain à 06:00</p>
              </div>
            )}
          </motion.article>
        </div>

        {/* À suivre — rail */}
        {upcoming.length > 1 && (
          <div className="mt-6 flex gap-4 overflow-x-auto pb-3">
            {upcoming.slice(1, 8).map(({ item, program }, i) => (
              <motion.div key={item.id} {...rise} transition={{ ...rise.transition, delay: i * 0.05 }} className="shrink-0">
                <Link
                  to={`/tv/program/${program!.id}`}
                  className="panel sheen group block w-56 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-ocean/70"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <ProgramPoster program={program!} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]" />
                    <span className="absolute bottom-2 left-2 rounded bg-ink-950/85 px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-balafon backdrop-blur">
                      {item.startTime}
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center bg-ink-950/0 transition-colors duration-300 group-hover:bg-ink-950/35">
                      <span className="flex h-10 w-10 scale-75 items-center justify-center rounded-full bg-balafon opacity-0 shadow-[0_6px_20px_rgba(227,30,36,0.5)] transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                        <Play size={15} className="ml-0.5 text-white" aria-hidden />
                      </span>
                    </span>
                  </div>
                  <div className="p-3.5">
                    <p className="truncate text-[13px] font-extrabold">{program!.title}</p>
                    <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: CATEGORY_META[program!.category].color }}>
                      {CATEGORY_META[program!.category].label}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ============================ CE SOIR — liste numérotée ============================ */}
      {evening.length > 0 && (
        <section className="relative mt-12 border-y border-ink-800 bg-ink-900/60 glow-ocean" aria-label="Ce soir sur Balafon TV">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <SectionTitle
              kicker="Prime time"
              title="Ce soir sur Balafon TV"
              accent="#0F6BD6"
              right={
                <Link to="/tv/guide" className="group hidden shrink-0 items-center gap-2 rounded-lg border border-ink-600 px-4 py-2.5 text-[12.5px] font-extrabold text-mist transition-all hover:border-ocean/70 hover:text-ocean-soft sm:flex">
                  Toute la grille <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              }
            />
            <ol className="mt-8 divide-y divide-ink-800">
              {evening.map(({ item, program }, i) => (
                <motion.li key={item.id} {...rise} transition={{ ...rise.transition, delay: i * 0.06 }}>
                  <Link
                    to={`/tv/program/${program!.id}`}
                    className="group relative flex items-center gap-5 py-4 pl-1 transition-colors duration-300 hover:bg-white/[0.02] sm:gap-8 sm:py-5"
                  >
                    <span className="num-outline font-display w-16 shrink-0 text-[54px] leading-none sm:w-24 sm:text-[76px]" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="hidden h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-ink-700 sm:block">
                      <ProgramPoster program={program!} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.07]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[22px] uppercase leading-tight sm:text-[26px]">{program!.title}</span>
                      <span className="mt-1 block truncate text-[12.5px] text-mist-dark">{program!.subtitle ?? CATEGORY_META[program!.category].label}</span>
                    </span>
                    <span
                      className="hidden shrink-0 rounded-md px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.14em] md:block"
                      style={{ background: CATEGORY_META[program!.category].soft, color: CATEGORY_META[program!.category].color }}
                    >
                      {CATEGORY_META[program!.category].label}
                    </span>
                    <span className="shrink-0 rounded-lg bg-balafon/12 px-4 py-2.5 font-mono text-[15px] font-bold tabular-nums text-balafon">
                      {item.startTime}
                    </span>
                    <ArrowRight size={17} className="shrink-0 text-ink-600 transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-balafon" aria-hidden />
                  </Link>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ============================ REPLAY ============================ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-label="Replay disponibles">
        <SectionTitle
          kicker="À la demande"
          title="Replay"
          accent="#00F5A0"
          right={
            <Link to="/tv/replay" className="group hidden shrink-0 items-center gap-2 rounded-lg border border-ink-600 px-4 py-2.5 text-[12.5px] font-extrabold text-mist transition-all hover:border-studio/60 hover:text-studio sm:flex">
              Tout le replay <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          }
        />
        <div className="mt-7 flex gap-4 overflow-x-auto pb-3">
          {replayables.map((p, i) => (
            <motion.div key={p.id} {...rise} transition={{ ...rise.transition, delay: i * 0.04 }} className="shrink-0">
              <Link
                to={`/tv/program/${p.id}`}
                className="panel sheen group block w-44 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-studio/60 sm:w-48"
              >
                <div className="relative aspect-[2/3] overflow-hidden">
                  <ProgramPoster program={p} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-ink-950/90 to-transparent p-2.5">
                    <span className="rounded bg-ink-950/85 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider" style={{ color: CATEGORY_META[p.category].color }}>
                      {CATEGORY_META[p.category].label}
                    </span>
                    <span className="rounded bg-ink-950/85 px-1.5 py-0.5 font-mono text-[10px] font-bold text-studio">{p.durationMinutes} min</span>
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center bg-ink-950/0 transition-colors duration-300 group-hover:bg-ink-950/35">
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

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <SimClock compact />
      </div>

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

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, BellRing, CalendarDays, Info, MonitorPlay, Play, Radio,
} from "lucide-react";

import type { Program, ScheduleItem } from "../../types";
import { CATEGORY_META } from "../../types";
import { useCurrentProgram, useNow } from "../../hooks/useNow";
import { useScheduleStore } from "../../store/scheduleStore";
import { useAppStore } from "../../store/appStore";
import { durationLabel, isoLocal, labelDay, tillISO, todayKey, toMinutes } from "../../utils/time";
import { Badge, DaySelector, EmptyState, LiveBadge, ProgressBar, SectionTitle } from "../../components/ui";
import { ProgramPoster } from "../../components/media/ProgramPoster";

/* ============================================================
   GUIDE TV — grille complète du jour, connectée au store réel
   (useScheduleStore, alimenté par le backend au démarrage de l'app).
   Présentation verticale façon « fil chronologique ».
   ============================================================ */

const rise = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

type Row = { item: ScheduleItem; program: Program };

export function PublicGuide() {
  const now = useNow(30_000); // horloge simulée — le direct et la progression se recalculent toutes les 30 s
  const today = todayKey();
  const [date, setDate] = useState<string>(today);
  const isToday = date === today;

  const grids = useScheduleStore((s) => s.grids);
  const programs = useScheduleStore((s) => s.programs);
  const pushToast = useAppStore((s) => s.toast);
  const live = useCurrentProgram(date, now);

  const published = grids[date]?.published === true;
  const current = isToday && published ? live.currentProgram : null;
  const currentItem = isToday && published ? live.current : null;

  const nowIso = useMemo(() => isoLocal(now), [now]);

  /* Toutes les émissions du jour (hors créneaux « hors antenne »), triées chronologiquement. */
  const dayItems = useMemo<Row[]>(() => {
    if (!published) return [];
    return live.items
      .map((item) => ({ item, program: programs.find((p) => p.id === item.programId) ?? null }))
      .filter((row): row is Row => !!row.program && row.program.category !== "off-air");
  }, [live.items, programs, published]);

  const rappel = (titre: string, heure: string) =>
    pushToast({
      tone: "success",
      title: "Rappel programmé",
      message: `« ${titre} » à ${heure} — notification simulée.`,
    });

  return (
    <div className="min-h-screen bg-ink-950 text-paper">
      {/* ——— En-tête ——— */}
      <div className="glow-balafon relative overflow-hidden border-b border-ink-800">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
            <p className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-balafon-soft">
              <MonitorPlay size={13} /> Balafon TV — Direct &amp; Prime time
            </p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
              <div>
                <h1 className="font-display text-[42px] uppercase leading-none text-paper sm:text-[54px]">
                  Guide <span className="text-balafon">TV</span>
                </h1>
                <p className="mt-2.5 flex items-center gap-2 text-[13px] text-mist">
                  <CalendarDays size={14} /> {labelDay(date)} — heure de Douala
                </p>
              </div>
              {published && (
                <span className="inline-flex items-center gap-2 rounded-lg border border-studio/25 bg-studio/10 px-3 py-2 text-[11px] font-bold text-studio">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-studio" /> Grille validée — Balafon TV
                </span>
              )}
            </div>
            <div className="mt-7">
              <DaySelector value={date} onChange={setDate} days={7} />
            </div>
          </motion.div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* ——— En ce moment ——— */}
        {isToday && (
          <motion.section {...rise} className="mb-14">
            <SectionTitle
              kicker="Antenne en direct"
              title="En ce moment"
              right={
                <span className="hidden items-center gap-2 font-mono text-[12px] tabular-nums text-mist-dark sm:inline-flex">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-balafon" />
                  Il est {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} à Douala
                </span>
              }
            />
            <div className="mt-6">
              {current && currentItem ? (
                <div className="panel glow-balafon relative overflow-hidden">
                  <div className="grid md:grid-cols-[1.15fr_0.85fr]">
                    <div className="relative z-10 flex flex-col justify-center gap-4 p-6 sm:p-9 lg:p-10">
                      <div className="flex flex-wrap items-center gap-3">
                        <LiveBadge />
                        <Badge color={CATEGORY_META[current.category].color} soft={CATEGORY_META[current.category].soft}>
                          {CATEGORY_META[current.category].label}
                        </Badge>
                        <span className="font-mono text-[13px] font-semibold tabular-nums text-mist">
                          {currentItem.startTime} – {currentItem.endTime}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-balafon">{Math.round(live.progress)} %</span>
                      </div>

                      <h2 className="font-display text-[32px] uppercase leading-[0.95] text-paper sm:text-[42px]">
                        {current.title}
                      </h2>

                      <p className="line-clamp-3 max-w-xl text-[13.5px] leading-relaxed text-mist">{current.description}</p>

                      {live.nextProgram && live.next && (
                        <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-mist-dark">
                          À suivre <ArrowRight size={13} className="text-balafon" />
                          <span className="font-semibold text-paper">{live.nextProgram.title}</span>
                          <span className="font-mono tabular-nums text-balafon-soft">{live.next.startTime}</span>
                        </p>
                      )}

                      <div className="mt-1 max-w-md">
                        <ProgressBar value={live.progress} />
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2.5">
                        <Link
                          to={`/tv/program/${current.id}`}
                          className="relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-balafon px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_18px_rgba(227,30,36,0.35)] transition-all duration-150 hover:-translate-y-px hover:bg-balafon-soft active:translate-y-0 active:scale-[0.97]"
                        >
                          <Play size={14} fill="currentColor" /> Voir la fiche
                        </Link>
                        <button
                          onClick={() => rappel(current.title, currentItem.startTime)}
                          className="relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-ink-600 bg-ink-800 px-4 py-2.5 text-[13px] font-semibold text-paper transition-all duration-150 hover:-translate-y-px hover:border-ink-500 hover:bg-ink-700 active:translate-y-0 active:scale-[0.97]"
                        >
                          <BellRing size={14} /> Me le rappeler
                        </button>
                      </div>
                    </div>

                    <div className="relative min-h-[220px] md:min-h-[320px]">
                      <ProgramPoster program={current} className="absolute inset-0 h-full w-full" />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-transparent to-transparent md:hidden" />
                      <div className="absolute inset-0 hidden bg-gradient-to-r from-ink-950 via-ink-950/30 to-transparent md:block" />
                      <div className="absolute bottom-4 right-4 hidden items-center gap-1.5 rounded-full border border-ink-600 bg-ink-950/60 px-3 py-1.5 backdrop-blur-md md:flex">
                        <Radio size={12} className="animate-pulse text-balafon" />
                        <span className="text-[10.5px] font-bold uppercase tracking-widest text-mist">En antenne</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<Radio size={26} />}
                  title="Antenne hors diffusion pour le moment"
                  hint={published ? "Le programme revient dès le prochain créneau de la grille." : "La grille de ce jour n'a pas encore été publiée."}
                />
              )}
            </div>
          </motion.section>
        )}

        {/* ——— Grille complète du jour (liste verticale chronologique) ——— */}
        <motion.section {...rise}>
          <SectionTitle
            kicker="Grille complète"
            title={isToday ? "Le programme du jour" : `Programme — ${labelDay(date, { short: true })}`}
            right={
              dayItems.length > 0 ? (
                <span className="hidden font-mono text-[12px] tabular-nums text-mist-dark sm:block">
                  {dayItems.length} émission{dayItems.length > 1 ? "s" : ""}
                </span>
              ) : undefined
            }
          />

          <div className="mt-8">
            {!published ? (
              <EmptyState
                icon={<CalendarDays size={26} />}
                title="Grille pas encore publiée"
                hint="La régie n'a pas encore validé la diffusion pour ce jour. Revenez bientôt."
              />
            ) : dayItems.length === 0 ? (
              <EmptyState icon={<MonitorPlay size={26} />} title="Aucune émission programmée" hint="Choisissez un autre jour dans le sélecteur ci-dessus." />
            ) : (
              <div className="relative border-l-2 border-ink-800 pl-6 sm:pl-9">
                <ol className="space-y-3">
                  {dayItems.map(({ item, program }, i) => {
                    const meta = CATEGORY_META[program.category];
                    const isLive = isToday && live.current?.id === item.id;
                    const isPast = tillISO(item) <= nowIso;
                    const startMin = toMinutes(item.startTime);
                    const isPrime = startMin >= 18 * 60 && startMin < 22 * 60;
                    const showReplay = isPast && program.isReplayAvailable;

                    return (
                      <motion.li
                        key={item.id}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-20px" }}
                        transition={{ duration: 0.35, ease: "easeOut", delay: Math.min(i, 8) * 0.03 }}
                        className="relative"
                      >
                        <span
                          aria-hidden
                          className={`absolute -left-[31px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ring-4 ring-ink-950 sm:-left-[41px] ${
                            isLive ? "live-pulse bg-balafon" : "bg-ink-600"
                          }`}
                          style={!isLive ? { background: meta.color, opacity: isPast ? 0.35 : 0.8 } : undefined}
                        />

                        <Link
                          to={`/tv/program/${program.id}`}
                          aria-label={`Détail de ${program.title}`}
                          className={`sheen group relative flex items-center gap-4 overflow-hidden rounded-2xl border p-3 transition-all duration-300 sm:p-4 ${
                            isLive
                              ? "border-balafon/50 bg-balafon/[0.07] shadow-[0_0_0_1px_rgba(227,30,36,0.15),0_14px_34px_rgba(2,4,9,0.5)]"
                              : "border-ink-700 bg-ink-900/50 hover:-translate-y-0.5 hover:border-ink-500"
                          } ${isPast && !isLive ? "opacity-45 grayscale-[0.35]" : ""}`}
                        >
                          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-32">
                            <ProgramPoster program={program} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {isLive && <LiveBadge size="sm" />}
                              {isPrime && !isLive && (
                                <span className="rounded-md bg-goldwarn/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-goldwarn">
                                  Prime
                                </span>
                              )}
                              {showReplay && (
                                <span className="rounded-md bg-studio/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-studio">
                                  Replay
                                </span>
                              )}
                              <span
                                className="hidden rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide sm:inline"
                                style={{ color: meta.color, background: meta.soft }}
                              >
                                {meta.label}
                              </span>
                            </div>
                            <h3 className="mt-1 truncate font-display text-[15.5px] uppercase leading-tight text-paper sm:text-[18px]">
                              {program.title}
                            </h3>
                            <p className="mt-0.5 truncate text-[12px] text-mist-dark">
                              {program.subtitle ?? meta.label} · {durationLabel(program.durationMinutes)}
                            </p>
                            {isLive && (
                              <div className="mt-2 max-w-[220px]">
                                <ProgressBar value={live.progress} />
                              </div>
                            )}
                          </div>

                          <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                            <span className="rounded-lg bg-balafon/12 px-3 py-1.5 font-mono text-[13px] font-bold tabular-nums text-balafon">
                              {item.startTime}
                            </span>
                            <span className="font-mono text-[10.5px] tabular-nums text-mist-dark">→ {item.endTime}</span>
                          </div>

                          <ArrowRight
                            size={17}
                            className="hidden shrink-0 text-ink-600 transition-all duration-300 group-hover:translate-x-1 group-hover:text-balafon sm:block"
                          />
                        </Link>
                      </motion.li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        </motion.section>

        <p className="mt-10 flex items-center gap-2 text-[12px] text-mist-dark">
          <Info size={14} />
          Les horaires peuvent évoluer en cas d'édition spéciale décidée en régie.
        </p>
      </main>
    </div>
  );
}

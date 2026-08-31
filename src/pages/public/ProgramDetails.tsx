import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, Clock, Play, Tag } from "lucide-react";
import { useScheduleStore } from "../../store/scheduleStore";
import { CATEGORY_META } from "../../types";
import { durationLabel, labelDay, todayKey, toMinutes } from "../../utils/time";
import { EmptyState } from "../../components/ui";
import { ProgramPoster } from "../../components/media/ProgramPoster";
import { FakePlayer } from "../../components/media/FakePlayer";

export function ProgramDetails() {
  const { id } = useParams();
  const programs = useScheduleStore((s) => s.programs);
  const scheduleMap = useScheduleStore((s) => s.scheduleMap);
  const [playerOpen, setPlayerOpen] = useState(false);

  const program = programs.find((p) => p.id === id);

  const airings = useMemo(() => {
    if (!program) return [];
    const today = todayKey();
    const list: Array<{ date: string; start: string; end: string }> = [];
    for (const date of Object.keys(scheduleMap).sort()) {
      if (date < today) continue;
      for (const it of scheduleMap[date]) {
        if (it.programId === program.id && toMinutes(it.endTime) > toMinutes(it.startTime)) {
          list.push({ date: it.date, start: it.startTime, end: it.endTime });
        }
      }
    }
    return list.slice(0, 7);
  }, [program, scheduleMap]);

  if (!program) {
    return (
      <div className="min-h-screen bg-ink-950 px-4 pt-32">
        <div className="mx-auto max-w-xl">
          <EmptyState
            icon={<Play size={32} />}
            title="Émission introuvable"
            hint="Cette émission n’existe pas ou a été retirée de la bibliothèque."
            action={
              <Link to="/tv" className="rounded-lg bg-balafon px-4 py-2 text-[13px] font-bold text-white">
                Retour à l’accueil
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const meta = CATEGORY_META[program.category];

  return (
    <div className="min-h-screen bg-ink-950 pb-20">
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0" aria-hidden>
          {program.backdropUrl && (
            <img src={program.backdropUrl} alt="" className="h-full w-full object-cover opacity-25 blur-sm" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/40" />
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-28 sm:px-6 md:grid-cols-[240px_1fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-48 md:mx-0 md:w-full">
            <ProgramPoster program={program} className="aspect-[2/3] w-full rounded-2xl border border-ink-600 shadow-2xl" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Link to="/tv/guide" className="flex items-center gap-1.5 text-[12.5px] font-bold text-mist transition-colors hover:text-balafon">
              <ArrowLeft size={14} aria-hidden /> Retour au guide
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider" style={{ background: meta.soft, color: meta.color }}>
                {meta.label}
              </span>
              <span className="flex items-center gap-1 rounded-md border border-ink-600 px-2.5 py-1 font-mono text-[11px] text-mist">
                <Clock size={11} aria-hidden /> {durationLabel(program.durationMinutes)}
              </span>
              {program.isReplayAvailable && (
                <span className="rounded-md bg-studio/12 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-studio">
                  Replay disponible
                </span>
              )}
              {program.fiabilite === "confirme" && (
                <span
                  className="rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ background: "rgba(0,245,160,0.1)", color: "#00F5A0" }}
                  title="Horaire rapporté par balafon.media ou la presse"
                >
                  Horaire confirmé
                </span>
              )}
              {program.fiabilite === "estime" && (
                <span
                  className="rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ background: "rgba(255,184,0,0.12)", color: "#FFB800" }}
                  title="Émission réelle (balafon.media) — horaire hypothétique pour la démonstration"
                >
                  Horaire estimé · démo
                </span>
              )}
            </div>
            {program.fiabilite === "estime" && (
              <p className="mt-3 max-w-2xl rounded-lg border border-goldwarn/30 bg-goldwarn/5 px-3 py-2 text-[11.5px] leading-relaxed text-goldwarn/90">
                Cette émission est bien réelle (catalogue balafon.media), mais son horaire exact n’a
                pas été vérifié : l’heure affichée est une hypothèse plausible pour la démonstration.
              </p>
            )}
            <h1 className="font-display mt-4 text-3xl font-black uppercase leading-tight tracking-tight text-paper sm:text-5xl">
              {program.title}
            </h1>
            {program.subtitle && <p className="mt-2 text-[15px] font-semibold text-balafon-soft">{program.subtitle}</p>}
            <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-mist">{program.description}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {program.tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full border border-ink-600 px-2.5 py-1 text-[11px] font-semibold text-mist">
                  <Tag size={10} aria-hidden /> {t}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {program.isReplayAvailable && (
                <button
                  type="button"
                  onClick={() => setPlayerOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-studio px-5 py-2.5 text-[13.5px] font-extrabold text-ink-950 transition-transform hover:scale-[1.03] active:scale-95"
                >
                  <Play size={15} aria-hidden /> Regarder en replay
                </button>
              )}
              <Link
                to="/tv"
                className="flex items-center gap-2 rounded-xl bg-balafon px-5 py-2.5 text-[13.5px] font-extrabold text-white shadow-[0_8px_24px_rgba(227,30,36,0.4)] transition-transform hover:scale-[1.03]"
              >
                <Play size={15} aria-hidden /> Regarder le direct
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6" aria-label="Prochaines diffusions">
        <h2 className="font-display flex items-center gap-2 text-xl font-black uppercase tracking-tight text-paper">
          <CalendarDays size={18} className="text-balafon" aria-hidden /> Prochaines diffusions
        </h2>
        {airings.length === 0 ? (
          <p className="mt-4 text-[13.5px] text-mist">Aucune diffusion planifiée sur les 7 prochains jours.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {airings.map((a, i) => (
              <motion.li
                key={`${a.date}-${a.start}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between rounded-xl border border-ink-600 bg-ink-800 px-4 py-3.5 transition-colors hover:border-ink-500"
              >
                <div>
                  <p className="text-[13.5px] font-extrabold text-paper">{labelDay(a.date)}</p>
                  <p className="font-mono text-[11.5px] text-mist-dark">{a.date}</p>
                </div>
                <span className="rounded-lg bg-balafon/12 px-3 py-1.5 font-mono text-[14px] font-bold tabular-nums text-balafon">
                  {a.start}
                </span>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <FakePlayer
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
        title={`Replay — ${program.title}`}
        subtitle={program.subtitle}
      />
    </div>
  );
}

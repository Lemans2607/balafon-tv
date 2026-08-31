import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Play } from "lucide-react";
import { useScheduleStore } from "../../store/scheduleStore";
import { useNow } from "../../hooks/useNow";
import { CATEGORY_META, type Program } from "../../types";
import { isoLocal, labelDay, sinceISO, tillISO } from "../../utils/time";
import { EmptyState } from "../../components/ui";
import { ProgramPoster } from "../../components/media/ProgramPoster";
import { FakePlayer } from "../../components/media/FakePlayer";

export function PublicReplay() {
  const programs = useScheduleStore((s) => s.programs);
  const scheduleMap = useScheduleStore((s) => s.scheduleMap);
  const now = useNow(30000);
  const [playing, setPlaying] = useState<Program | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const replayables = useMemo(
    () => programs.filter((p) => p.isReplayAvailable && p.category !== "off-air"),
    [programs]
  );

  const lastBroadcast = useMemo(() => {
    const map = new Map<string, { date: string; time: string }>();
    const nowIso = isoLocal(now);
    const dates = Object.keys(scheduleMap).sort().reverse();
    for (const date of dates) {
      for (const it of scheduleMap[date]) {
        if (map.has(it.programId)) continue;
        const till = tillISO(it);
        if (till <= nowIso) map.set(it.programId, { date: it.date, time: it.startTime });
      }
    }
    return map;
  }, [scheduleMap, now]);

  const cats = useMemo(() => {
    const set = new Set(replayables.map((p) => p.category));
    return ["all", ...set];
  }, [replayables]);

  const shown = replayables.filter((p) => filter === "all" || p.category === filter);

  return (
    <div className="min-h-screen bg-ink-950 pb-20">
      <div className="bg-noise-red border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-28 sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-studio">À la demande</p>
          <h1 className="font-display mt-1 text-3xl font-black uppercase tracking-tight text-paper sm:text-4xl">Replay</h1>
          <p className="mt-2 max-w-2xl text-[14px] text-mist">
            Retrouvez les émissions de Balafon TV après leur diffusion. Les replays restent
            disponibles 7 jours (démonstration — lecture simulée).
          </p>
          <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filtrer le replay">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={filter === c}
                onClick={() => setFilter(c)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-all ${
                  filter === c
                    ? "border-studio bg-studio/10 text-studio"
                    : "border-ink-600 bg-ink-800 text-mist hover:border-ink-500 hover:text-paper"
                }`}
              >
                {c === "all" ? "Tout" : CATEGORY_META[c as keyof typeof CATEGORY_META].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        {shown.length === 0 ? (
          <EmptyState
            icon={<Play size={34} />}
            title="Aucun replay dans cette catégorie"
            hint="Les émissions apparaissent ici après leur première diffusion à l’antenne."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((p, i) => {
              const last = lastBroadcast.get(p.id);
              return (
                <motion.article
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group overflow-hidden rounded-2xl border border-ink-600 bg-ink-800 transition-all hover:-translate-y-1 hover:border-studio/50"
                >
                  <button
                    type="button"
                    onClick={() => setPlaying(p)}
                    className="relative block aspect-[2/3] w-full overflow-hidden text-left"
                    aria-label={`Regarder le replay de ${p.title}`}
                  >
                    <ProgramPoster program={p} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                      <span className="flex h-12 w-12 scale-75 items-center justify-center rounded-full bg-studio opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100">
                        <Play size={18} className="ml-0.5 text-ink-950" aria-hidden />
                      </span>
                    </span>
                    <span className="absolute left-2 top-2 rounded bg-ink-950/85 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide"
                      style={{ color: CATEGORY_META[p.category].color }}>
                      {CATEGORY_META[p.category].label}
                    </span>
                    <span className="absolute bottom-2 right-2 rounded bg-ink-950/85 px-1.5 py-0.5 font-mono text-[10px] text-studio">
                      {p.durationMinutes} min
                    </span>
                  </button>
                  <div className="p-3.5">
                    <h2 className="truncate text-[14px] font-extrabold text-paper">{p.title}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-mist-dark">
                      <CalendarDays size={11} aria-hidden />
                      {last ? (
                        <>
                          Dernière diffusion · {labelDay(last.date, { short: true })} à{" "}
                          <span className="font-mono tabular-nums">{last.time}</span>
                        </>
                      ) : (
                        "Première diffusion à venir"
                      )}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      <FakePlayer
        open={playing !== null}
        onClose={() => setPlaying(null)}
        title={playing ? `Replay — ${playing.title}` : ""}
        subtitle={playing?.subtitle}
      />
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, LayoutGrid, ListTree, Radio, Tv } from "lucide-react";

import { useAppStore } from "../../store/appStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useNow, useCurrentProgram } from "../../hooks/useNow";
import { CATEGORY_META, type Program, type ProgramCategory, type ScheduleItem } from "../../types";
import { durationLabel, toHHMM, todayKey, toMinutes } from "../../utils/time";
import { detectScheduleGaps } from "../../utils/validation";
import { DaySelector, ProgressBar } from "../../components/ui";
import { ProgramPoster } from "../../components/media/ProgramPoster";
import { useSynopsis } from "../../components/epg/SynopsisDrawer";

/* ============================================================
   PublicGuide — Guide TV                              [REFONTE]

   La timeline Planby (BalafonEpg) est remplacée ici par une
   mosaïque de cartes-affiches groupées par créneau (Matin /
   Après-midi / Soirée / Nuit), avec une bascule vers une vue
   chronologique à la minute près.

   Ce que la refonte règle, point par point (Tableau 3 du rapport
   de stage — étude de l'existant) :
     1. Horaire exact par émission → toujours visible sur chaque
        carte ET dans la vue chronologique (colonne heure dédiée).
     2. « Nuit (0) » ambigu → un bloc hors-antenne explicite
        (catégorie CATEGORY_META["off-air"]) est un état différent
        d'un TROU (plage non renseignée) ; le ruban de complétude
        distingue visuellement les deux.
     3. Filtre par chaîne → déjà géré par PublicNavbar (Balafon TV
        est la seule chaîne peuplée à ce stade, voir MODIFICATIONS.md).
     4. Bandeau « en ce moment » → conservé tel quel, déjà correct.
     5. Contrôle de complétude → nouveau ruban, basé sur
        detectScheduleGaps() (déjà écrit dans utils/validation.ts,
        déjà utilisé par le Studio, jamais exposé au public avant).

   Le clic sur une émission ouvre désormais le tiroir synopsis
   (useSynopsis) au lieu de naviguer vers /tv/program/:id : c'est
   ce qui était explicitement demandé (« un synopsis apparaît »).
   La fiche complète reste accessible depuis le tiroir.
   ============================================================ */

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

const CRENEAUX = [
  { id: "matin", label: "Matin", debut: 360, fin: 720 },
  { id: "aprem", label: "Après-midi", debut: 720, fin: 1080 },
  { id: "soir", label: "Soirée", debut: 1080, fin: 1440 },
  { id: "nuit", label: "Nuit", debut: 0, fin: 360 },
] as const;

export function PublicGuide() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const grids = useScheduleStore((s) => s.grids);
  const programs = useScheduleStore((s) => s.programs);
  const now = useNow(1000);
  const today = todayKey();
  const [category, setCategory] = useState<ProgramCategory | "all">("all");
  const [mode, setMode] = useState<"affiches" | "chrono">("affiches");
  const ouvrirSynopsis = useSynopsis((s) => s.ouvrir);

  const live = useCurrentProgram(today, now);
  const jour = useCurrentProgram(selectedDate, now);
  const estAujourdhui = selectedDate === today;

  const grid = grids[selectedDate];
  const published = grid?.published === true;
  const publishedToday = grids[today]?.published === true;
  const liveMeta = live.currentProgram ? CATEGORY_META[live.currentProgram.category] : null;

  const byId = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs]);

  const items = useMemo(
    () => jour.items.filter((it) => byId.get(it.programId)?.category !== "off-air" || category === "all"),
    [jour.items, byId, category]
  );

  const filtres = useMemo(
    () => items.filter((it) => category === "all" || byId.get(it.programId)?.category === category),
    [items, byId, category]
  );

  /* Ruban de complétude — calculé sur la journée entière (00:00–24:00),
     hors filtre de catégorie, pour rester une mesure objective. */
  const trous = useMemo(() => detectScheduleGaps(jour.items, 0, 1440), [jour.items]);
  const minutesVides = trous.reduce((s, t) => s + t.durationMinutes, 0);

  const ouvrir = (item: ScheduleItem, program: Program | undefined) => {
    if (!program || program.category === "off-air") return;
    ouvrirSynopsis({ item, program, mode: "grille" });
  };

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

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filtrer par catégorie">
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

              <div className="flex shrink-0 gap-1 rounded-lg border border-ink-700 bg-ink-900/70 p-1">
                <button
                  type="button"
                  aria-pressed={mode === "affiches"}
                  onClick={() => setMode("affiches")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-bold transition-colors ${
                    mode === "affiches" ? "bg-white/10 text-paper" : "text-mist hover:text-paper"
                  }`}
                >
                  <LayoutGrid size={13} /> Affiches
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "chrono"}
                  onClick={() => setMode("chrono")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-bold transition-colors ${
                    mode === "chrono" ? "bg-white/10 text-paper" : "text-mist hover:text-paper"
                  }`}
                >
                  <ListTree size={13} /> Chronologie
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ================= GRILLE + PANNEAU ================= */}
      <div className="mx-auto mt-9 grid max-w-7xl gap-7 px-4 sm:px-6 lg:grid-cols-[1fr_310px]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          {!published && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-goldwarn/40 bg-goldwarn/8 px-4 py-3 text-[13px] font-bold text-goldwarn">
              <Tv size={15} aria-hidden />
              Programmation du jour en cours de validation par la Direction d'Antenne.
            </div>
          )}

          {/* ── ruban de complétude ──────────────────────────────── */}
          <div className="mb-5 rounded-xl border border-ink-700 bg-ink-900/70 p-4">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] font-bold text-paper">Couverture d'antenne de la journée</p>
              <span
                className={`text-[11.5px] font-bold ${trous.length === 0 ? "text-studio" : "text-goldwarn"}`}
              >
                {trous.length === 0
                  ? "Grille complète — 24 h couvertes"
                  : `${trous.length} plage${trous.length > 1 ? "s" : ""} vide${trous.length > 1 ? "s" : ""} — ${durationLabel(minutesVides)} à combler`}
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-ink-700">
              {[...items]
                .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
                .map((it) => {
                  const p = byId.get(it.programId);
                  const meta = p ? CATEGORY_META[p.category] : null;
                  const largeur = ((toMinutes(it.endTime) - toMinutes(it.startTime)) / 1440) * 100;
                  return (
                    <span
                      key={it.id}
                      title={`${it.startTime}–${it.endTime} · ${p?.title ?? ""}`}
                      style={{ width: `${largeur}%`, background: meta?.color ?? "#6B7280", opacity: p?.category === "off-air" ? 0.35 : 0.9 }}
                    />
                  );
                })}
              {trous.map((g) => (
                <span
                  key={g.id}
                  title={`${g.startTime}–${g.endTime} · plage vide`}
                  className="bg-[repeating-linear-gradient(-45deg,rgba(255,184,0,0.55)_0_4px,rgba(255,184,0,0.15)_4px_8px)]"
                  style={{ width: `${(g.durationMinutes / 1440) * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[9.5px] text-mist-dark">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>
          </div>

          {mode === "affiches" ? (
            <VueAffiches
              items={filtres}
              programs={byId}
              now={now}
              estAujourdhui={estAujourdhui}
              onSelect={ouvrir}
            />
          ) : (
            <VueChronologie
              items={filtres}
              trous={category === "all" ? trous : []}
              programs={byId}
              now={now}
              estAujourdhui={estAujourdhui}
              onSelect={ouvrir}
            />
          )}
        </motion.div>

        {/* Panneau À suivre */}
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
                    <button
                      type="button"
                      onClick={() => ouvrir(item, program ?? undefined)}
                      className="group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
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
                    </button>
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
              hypothèses de démonstration ; la grille définitive est validée chaque jour par la Direction d'Antenne.
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

/* ================================================================== */

function VueAffiches({
  items,
  programs,
  now,
  estAujourdhui,
  onSelect,
}: {
  items: ScheduleItem[];
  programs: Map<string, Program>;
  now: Date;
  estAujourdhui: boolean;
  onSelect: (item: ScheduleItem, program: Program | undefined) => void;
}) {
  const sections = CRENEAUX.map((c) => ({
    creneau: c,
    dedans: items
      .filter((it) => toMinutes(it.startTime) < c.fin && toMinutes(it.endTime) > c.debut)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
  })).filter((s) => s.dedans.length > 0);

  if (sections.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-600 bg-ink-800/40 px-6 py-14 text-center text-[13px] text-mist">
        Aucune émission ne correspond à ce filtre pour cette journée.
      </p>
    );
  }

  const minutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="space-y-8">
      {sections.map(({ creneau, dedans }) => (
        <section key={creneau.id}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-[15px] font-extrabold uppercase tracking-wide text-paper">
              {creneau.label}
            </h2>
            <p className="font-mono text-[11px] text-mist-dark">
              {dedans.length} émission{dedans.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {dedans.map((item) => {
              const program = programs.get(item.programId);
              if (!program) return null;
              const meta = CATEGORY_META[program.category];
              const debut = toMinutes(item.startTime);
              const fin = toMinutes(item.endTime);
              const enDirect = estAujourdhui && minutes >= debut && minutes < fin && program.category !== "off-air";
              const passe = estAujourdhui && minutes >= fin;
              const horsAntenne = program.category === "off-air";

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={horsAntenne}
                  onClick={() => onSelect(item, program)}
                  className={`group relative overflow-hidden rounded-xl border text-left transition-all duration-300 ${
                    horsAntenne
                      ? "cursor-default border-dashed border-ink-600 bg-ink-800/30"
                      : "border-ink-700 bg-ink-900/60 hover:-translate-y-1 hover:border-ink-500"
                  } ${passe ? "opacity-45" : ""}`}
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden">
                    <ProgramPoster
                      program={program}
                      className={`h-full w-full object-cover transition-transform duration-300 ${
                        horsAntenne ? "" : "group-hover:scale-[1.06]"
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                    <div className="absolute left-2 top-2 flex items-center gap-1">
                      {enDirect ? (
                        <span className="live-pulse flex items-center gap-1 rounded bg-balafon px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-white">
                          <Radio size={8} /> Direct
                        </span>
                      ) : (
                        <span
                          className="rounded px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide"
                          style={{ background: meta.soft, color: meta.color }}
                        >
                          {meta.label.split(" ")[0]}
                        </span>
                      )}
                    </div>
                    {enDirect && (
                      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/15">
                        <div
                          className="h-full bg-balafon"
                          style={{ width: `${((minutes - debut) / (fin - debut)) * 100}%` }}
                        />
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-2 right-2">
                      <p className="font-mono text-[10.5px] font-bold text-white tabular-nums">
                        {item.startTime} – {item.endTime}
                      </p>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="truncate text-[12px] font-extrabold text-paper">{program.title}</p>
                    {!horsAntenne && (
                      <p className="mt-0.5 truncate text-[10.5px] text-mist-dark">
                        {durationLabel(fin - debut)}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ================================================================== */

function VueChronologie({
  items,
  trous,
  programs,
  now,
  estAujourdhui,
  onSelect,
}: {
  items: ScheduleItem[];
  trous: ReturnType<typeof detectScheduleGaps>;
  programs: Map<string, Program>;
  now: Date;
  estAujourdhui: boolean;
  onSelect: (item: ScheduleItem, program: Program | undefined) => void;
}) {
  type Ligne =
    | { trou: true; debut: number; fin: number; id: string }
    | { trou: false; debut: number; fin: number; item: ScheduleItem; program: Program | undefined };

  const lignes: Ligne[] = [
    ...items.map((it) => ({
      trou: false as const,
      debut: toMinutes(it.startTime),
      fin: toMinutes(it.endTime),
      item: it,
      program: programs.get(it.programId),
    })),
    ...trous.map((g) => ({ trou: true as const, debut: toMinutes(g.startTime), fin: toMinutes(g.endTime), id: g.id })),
  ].sort((a, b) => a.debut - b.debut);

  const minutes = now.getHours() * 60 + now.getMinutes();

  if (lignes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-600 bg-ink-800/40 px-6 py-14 text-center text-[13px] text-mist">
        Aucune émission ne correspond à ce filtre pour cette journée.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/60 p-3 sm:p-4">
      {lignes.map((l) => {
        const duree = l.fin - l.debut;
        const hauteur = Math.max(58, Math.round(duree * 0.42));
        const cle = l.trou ? l.id : l.item.id;

        if (l.trou) {
          return (
            <div key={cle} className="grid grid-cols-[64px_1fr] gap-3" style={{ minHeight: hauteur }}>
              <div className="pt-2.5 text-right font-mono text-[12px] font-bold text-goldwarn">
                {toHHMM(l.debut)}
              </div>
              <div className="mb-2 flex items-center rounded-lg border border-dashed border-goldwarn/45 bg-[repeating-linear-gradient(-45deg,rgba(255,184,0,0.12)_0_7px,rgba(255,184,0,0.03)_7px_14px)] px-3.5 py-2.5">
                <p className="text-[12.5px] font-bold text-goldwarn">Plage non renseignée</p>
              </div>
            </div>
          );
        }

        const { item, program } = l;
        if (!program) return null;
        const meta = CATEGORY_META[program.category];
        const enDirect = estAujourdhui && minutes >= l.debut && minutes < l.fin && program.category !== "off-air";
        const passe = estAujourdhui && minutes >= l.fin;
        const horsAntenne = program.category === "off-air";

        return (
          <div key={cle} className="grid grid-cols-[64px_1fr] gap-3" style={{ minHeight: hauteur }}>
            <div className="pt-2.5 text-right">
              <p className="font-mono text-[13px] font-bold tabular-nums" style={{ color: meta.color }}>
                {item.startTime}
              </p>
              <p className="font-mono text-[10.5px] text-mist-dark">{item.endTime}</p>
            </div>
            <button
              type="button"
              disabled={horsAntenne}
              onClick={() => onSelect(item, program)}
              className={`mb-2 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                horsAntenne
                  ? "cursor-default border-dashed border-ink-600 bg-ink-800/30"
                  : "border-ink-700 bg-ink-800/50 hover:border-ink-500 hover:bg-ink-800/80"
              } ${passe ? "opacity-45" : ""} ${enDirect ? "!border-balafon/50 !bg-balafon/10" : ""}`}
            >
              <div className="flex items-center gap-2">
                {enDirect && (
                  <span className="live-pulse flex items-center gap-1 rounded bg-balafon px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-white">
                    <Radio size={8} /> Direct
                  </span>
                )}
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide"
                  style={{ background: meta.soft, color: meta.color }}
                >
                  {meta.label}
                </span>
                {program.fiabilite === "estime" && (
                  <span className="rounded bg-goldwarn/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-goldwarn">
                    Estimé
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[14px] font-extrabold text-paper">{program.title}</p>
              {!horsAntenne && program.description && (
                <p className="mt-1 line-clamp-2 text-[12px] text-mist">{program.description}</p>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

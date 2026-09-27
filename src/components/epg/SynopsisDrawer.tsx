/* ============================================================
   SynopsisDrawer — la fiche qui s'ouvre au clic sur une émission
   Nouveau fichier.

   Un seul tiroir pour toute l'application : Guide TV et Replay
   l'ouvrent via `useSynopsis.getState().ouvrir(...)`. Monté une
   seule fois dans App.tsx (voir <SynopsisDrawer/> juste avant
   <ToastHost/>), jamais dupliqué par page.

   Construit sur le composant `Drawer` déjà présent dans
   components/ui (utilisé par PublicNavbar et StaffShell) : même
   comportement de fermeture (Échap, clic sur le voile, piège de
   focus), aucune logique de tiroir réinventée.
   ============================================================ */
import { create } from "zustand";
import { Bell, Clock3, PlayCircle } from "lucide-react";

import { Drawer, ProgressBar } from "../ui";
import { ProgramPoster } from "../media/ProgramPoster";
import { CATEGORY_META } from "../../types";
import type { Program, ScheduleItem } from "../../types";
import { useNow } from "../../hooks/useNow";
import { isoLocal, progressPct, sinceISO, tillISO, toMinutes } from "../../utils/time";

export interface ContenuSynopsis {
  item: ScheduleItem;
  program: Program | null;
  /** "grille" : horaires du direct + rappel · "replay" : diffusion passée. */
  mode: "grille" | "replay";
  /** Ligne de contexte pour un replay, ex. « Hier · 20:00 ». */
  diffuseLe?: string;
}

interface EtatSynopsis {
  contenu: ContenuSynopsis | null;
  ouvrir: (c: ContenuSynopsis) => void;
  fermer: () => void;
}

export const useSynopsis = create<EtatSynopsis>((set) => ({
  contenu: null,
  ouvrir: (contenu) => set({ contenu }),
  fermer: () => set({ contenu: null }),
}));

export function SynopsisDrawer() {
  const contenu = useSynopsis((s) => s.contenu);
  const fermer = useSynopsis((s) => s.fermer);
  const now = useNow(1000);

  const item = contenu?.item;
  const program = contenu?.program ?? null;
  const meta = program ? CATEGORY_META[program.category] : null;

  const enDirect =
    !!item && contenu?.mode === "grille" && sinceISO(item) <= isoLocal(now) && tillISO(item) > isoLocal(now);
  const avance = item && enDirect ? progressPct(now, sinceISO(item), tillISO(item)) : 0;
  const dureeMin = item ? toMinutes(item.endTime) - toMinutes(item.startTime) : 0;

  return (
    <Drawer open={!!contenu} onClose={fermer} title={program?.title ?? "Émission"}>
      {program && item && (
        <div className="-mx-4 -mt-4">
          <div className="relative">
            <ProgramPoster program={program} className="h-40 w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/10 to-transparent" />
            {meta && (
              <span
                className="absolute left-4 top-4 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide"
                style={{ background: meta.soft, color: meta.color }}
              >
                {meta.label}
              </span>
            )}
            {enDirect && (
              <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-balafon px-2.5 py-1 text-[10.5px] font-extrabold text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> DIRECT
              </span>
            )}
          </div>

          <div className="space-y-4 px-4 pt-3">
            <div className="flex items-center gap-2 font-mono text-[12.5px] text-mist">
              <Clock3 size={13} />
              <span>
                {item.startTime} – {item.endTime}
              </span>
              <span className="text-mist-dark">· {dureeMin} min</span>
              {contenu?.mode === "replay" && contenu.diffuseLe && (
                <span className="text-mist-dark">· {contenu.diffuseLe}</span>
              )}
            </div>

            {enDirect && (
              <div>
                <ProgressBar value={avance} color={meta?.color} />
                <p className="mt-1.5 font-mono text-[10.5px] text-mist-dark">
                  {Math.round(avance)} % écoulé
                </p>
              </div>
            )}

            <div>
              <h3 className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mist-dark">
                Synopsis
              </h3>
              <p className="text-[13.5px] leading-relaxed text-paper/90">
                {program.description?.trim() ||
                  "Le synopsis de cette émission n'a pas encore été renseigné par la Direction d'Antenne."}
              </p>
            </div>

            {program.subtitle && (
              <p className="text-[12.5px] italic text-mist">{program.subtitle}</p>
            )}

            {program.tags && program.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {program.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-ink-600 px-2 py-0.5 text-[10.5px] text-mist"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-ink-700 pt-3 text-[12.5px]">
              <dt className="text-mist-dark">Fiabilité</dt>
              <dd className="text-right text-paper">
                {program.fiabilite === "estime" ? "horaire estimé" : "confirmé par la régie"}
              </dd>
              <dt className="text-mist-dark">Replay</dt>
              <dd className="text-right text-paper">
                {program.isReplayAvailable ? "disponible 7 jours" : "non disponible"}
              </dd>
            </dl>

            <div className="flex gap-2 pb-1 pt-1">
              {enDirect && (
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-balafon py-2.5 text-[13px] font-extrabold text-white transition-transform hover:scale-[1.02]"
                >
                  <PlayCircle size={16} /> Regarder le direct
                </button>
              )}
              {contenu?.mode === "replay" && (
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-balafon py-2.5 text-[13px] font-extrabold text-white transition-transform hover:scale-[1.02]"
                >
                  <PlayCircle size={16} /> Lancer le replay
                </button>
              )}
              {!enDirect && contenu?.mode === "grille" && program.category !== "off-air" && (
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-ink-600 py-2.5 text-[13px] font-bold text-mist hover:text-paper"
                >
                  <Bell size={15} /> Me le rappeler
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { format } from "date-fns";
import type { AppRole, GridInfo, GridStatus, LogEntry, Program, ScheduleItem } from "../types";
import {
  CATEGORY_TO_GENRE,
  CLIPS_PROGRAM_ID,
  GENRE_TO_CATEGORY,
  OFF_AIR_PROGRAM_ID,
  RERUN_PROGRAM_ID,
  SEED_PROGRAMS,
} from "../data/programs";
import { buildSeedData } from "../data/schedules";
import {
  dateKey,
  DAY_END,
  isoFor,
  isoLocal,
  toHHMM,
  toMinutes,
  todayKey,
} from "../utils/time";
import { detectOverlaps } from "../utils/validation";
import type { GrilleAPI } from "../utils/planbyAdapter";
import { ajouterEmission, supprimerEmission } from "../api/emission";
import { useAppStore } from "./appStore";

export interface MutationResult {
  ok: boolean;
  error?: string;
  item?: ScheduleItem;
}

interface ScheduleState {
  programs: Program[];
  scheduleMap: Record<string, ScheduleItem[]>;
  grids: Record<string, GridInfo>;
  logs: LogEntry[];
  seededFor: string;
  /** Origine des données : démo locale (catalogue embarqué) ou API Django */
  source: "demo" | "api";

  ensureSeed: () => void;
  resetAll: () => void;
  hydrateFromApi: (grilles: GrilleAPI[]) => void;
  /** Le backend a répondu « aucune grille validée » : efface réellement l'affichage. */
  viderGrille: (motif: string) => void;

  addScheduleItem: (opts: {
    programId: string;
    date: string;
    startMin: number;
    user: string;
    role: AppRole;
    source?: ScheduleItem["source"];
  }) => MutationResult;

  removeScheduleItem: (opts: {
    itemId: string;
    date: string;
    user: string;
    role: AppRole;
  }) => MutationResult;

  setGridStatus: (opts: {
    date: string;
    status: GridInfo["status"];
    user: string;
    role: AppRole;
    note?: string;
  }) => void;

  addLog: (log: Omit<LogEntry, "id" | "at">) => void;
  upsertProgram: (program: Program) => void;
  deleteProgram: (id: string) => void;
}

let logSeq = 0;
let itemSeq = 1000;

function makeLog(log: Omit<LogEntry, "id" | "at">): LogEntry {
  logSeq += 1;
  return { ...log, id: `log-${logSeq}-${Date.now()}`, at: isoLocal(new Date()) };
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      programs: SEED_PROGRAMS,
      scheduleMap: {},
      grids: {},
      logs: [],
      seededFor: "",
      source: "demo",

      ensureSeed: () => {
        const today = todayKey();
        /* Si l'API Django a déjà hydraté les données, on ne ré-injecte pas la démo */
        if (get().source === "api") return;
        if (get().seededFor !== today || !get().scheduleMap[today]) {
          const seed = buildSeedData();
          set({
            scheduleMap: seed.scheduleMap,
            grids: seed.grids,
            logs: seed.logs,
            programs: SEED_PROGRAMS,
            seededFor: today,
          });
        }
      },

      resetAll: () => {
        const seed = buildSeedData();
        set({
          scheduleMap: seed.scheduleMap,
          grids: seed.grids,
          logs: seed.logs,
          programs: SEED_PROGRAMS,
          seededFor: todayKey(),
          source: "demo",
        });
      },

      /* ============================================================
         Hydratation depuis l'API Django (GET /api/grilles/?statut=validee)
         via l'adaptateur Planby — remplace le jeu de démo local.
         ============================================================ */
      hydrateFromApi: (grilles) => {
        const statutNormalise = (s: string | undefined): GridStatus => {
          const clean = (s ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          if (clean.includes("valid")) return "validated";
          if (clean.includes("attente") || clean.includes("pending")) return "pending";
          return "draft";
        };

        /* ── CORRECTIF ────────────────────────────────────────────────
           `programsBase` NE PART PLUS de `get().programs`.

           La version précédente faisait `[...get().programs]` puis
           `.push(...)` : la bibliothèque ne faisait QUE grandir d'un
           appel à l'autre. Une émission supprimée côté Django restait
           donc affichée indéfiniment (bibliothèque, filtres, panneau
           « À suivre »), même après un rechargement, puisque
           `programs` est persistée dans le localStorage.

           On repart des seules entrées système du catalogue local
           (hors-antenne, rediffusion, clips) et on reconstruit tout le
           reste depuis la réponse serveur, qui fait autorité.
           ──────────────────────────────────────────────────────────── */
        const idsSysteme = new Set([OFF_AIR_PROGRAM_ID, RERUN_PROGRAM_ID, CLIPS_PROGRAM_ID]);
        const programsBase: Program[] = SEED_PROGRAMS.filter((p) => idsSysteme.has(p.id));
        const parCle = new Map(programsBase.map((p) => [p.id, p]));
        const scheduleMap: Record<string, ScheduleItem[]> = {};
        const gridsOut: Record<string, GridInfo> = {};
        let seq = 0;

        for (const grille of grilles) {
          const statut = statutNormalise((grille as unknown as { statut?: string }).statut);

          for (const emission of grille.emissions ?? []) {
            const debut = new Date(emission.heure_debut);
            const fin = new Date(emission.heure_fin);
            if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) continue;

            /* Identité stable côté serveur : le titre seul provoquait des
               collisions entre deux émissions homonymes de grilles
               différentes, et empêchait de retrouver un programme après
               un renommage côté Django. */
            const cle = `api-emission-${emission.id}`;
            let program = parCle.get(cle);

            if (!program) {
              const localParTitre = SEED_PROGRAMS.find(
                (p) => p.title.toLowerCase() === emission.titre.trim().toLowerCase()
              );
              const categorie = GENRE_TO_CATEGORY[emission.genre] ?? "entertainment";
              program = {
                id: cle,
                title: emission.titre.trim(),
                description: emission.description || localParTitre?.description || "",
                category: categorie,
                durationMinutes: Math.max(
                  5,
                  Math.round((fin.getTime() - debut.getTime()) / 60000)
                ),
                /* Priorité : affiche Django → affiche locale connue → aucune
                   (ProgramPoster générera un repli visuel dans ce cas). */
                posterUrl: emission.image_affiche || localParTitre?.posterUrl || "",
                backdropUrl: localParTitre?.backdropUrl,
                subtitle: localParTitre?.subtitle,
                status: "validated",
                isReplayAvailable: localParTitre?.isReplayAvailable ?? false,
                tags: localParTitre?.tags ?? [emission.genre],
                fiabilite: emission.fiabilite ?? "confirme",
              };
              parCle.set(cle, program);
              programsBase.push(program);
            }

            const date = dateKey(debut);
            (scheduleMap[date] ??= []).push({
              id: `api-${grille.id}-${emission.id}-${++seq}`,
              programId: program.id,
              channelId: "balafon-tv",
              date,
              startTime: format(debut, "HH:mm"),
              endTime: format(fin, "HH:mm"),
              status: statut,
              source: "import",
              lastModifiedBy: "API Django",
              updatedAt: isoLocal(new Date()),
              /* Conservé pour que le Studio puisse écrire vers Django
                 (PATCH/DELETE) sans re-résoudre l'identifiant serveur. */
              serverId: Number(emission.id),
            });

            gridsOut[date] = {
              date,
              status: statut,
              author: "API Django",
              updatedAt: isoLocal(new Date()),
              published: statut === "validated",
              serverId: Number(grille.id),
            };
          }
        }

        for (const jour of Object.keys(scheduleMap)) {
          scheduleMap[jour].sort((a, b) => a.startTime.localeCompare(b.startTime));
        }

        set({
          programs: programsBase,
          scheduleMap,
          grids: gridsOut,
          seededFor: todayKey(),
          source: "api",
          logs: [
            {
              id: `log-api-${Date.now()}`,
              at: isoLocal(new Date()),
              user: "API Django",
              role: "directeur",
              action: "Hydratation depuis le backend",
              details: `${Object.keys(scheduleMap).length} jour(s) et ${programsBase.length} émission(s) reçus de GET /api/grilles/?statut=validee.`,
              severity: "info",
            },
            ...get().logs,
          ],
        });
      },

      /* ── CORRECTIF ────────────────────────────────────────────────────
         Le backend a répondu, et il n'a rien : ce n'est pas une panne,
         c'est l'état réel de la base après suppression de toutes les
         émissions validées. La version précédente confondait ce cas avec
         « backend injoignable » et laissait l'ancienne grille affichée.
         ────────────────────────────────────────────────────────────── */
      viderGrille: (motif) => {
        const idsSysteme = new Set([OFF_AIR_PROGRAM_ID, RERUN_PROGRAM_ID, CLIPS_PROGRAM_ID]);
        set({
          scheduleMap: {},
          grids: {},
          programs: SEED_PROGRAMS.filter((p) => idsSysteme.has(p.id)),
          source: "api",
          seededFor: todayKey(),
          logs: [
            {
              id: `log-vide-${Date.now()}`,
              at: isoLocal(new Date()),
              user: "API Django",
              role: "directeur",
              action: "Grille vidée",
              details: motif,
              severity: "warning",
            },
            ...get().logs,
          ],
        });
      },

      addScheduleItem: ({ programId, date, startMin, user, role, source = "admin" }) => {
        const program = get().programs.find((p) => p.id === programId);
        if (!program) return { ok: false, error: "Programme introuvable dans la bibliothèque." };
        if (program.category === "off-air")
          return { ok: false, error: "Le bloc « Hors antenne » est généré automatiquement." };

        const endMin = startMin + program.durationMinutes;
        if (endMin > DAY_END)
          return {
            ok: false,
            error: `Dépassement de 00:00 — « ${program.title} » (${program.durationMinutes} min) démarrerait trop tard (fin ${toHHMM(endMin)}).`,
          };

        const existing = (get().scheduleMap[date] ?? []).filter(
          (it) => it.programId !== "p-offair"
        );
        const candidate: ScheduleItem = {
          id: `sch-${date}-${++itemSeq}`,
          programId,
          channelId: "balafon-tv",
          date,
          startTime: toHHMM(startMin),
          endTime: toHHMM(endMin),
          status: get().grids[date]?.status ?? "draft",
          source,
          lastModifiedBy: user,
          updatedAt: isoLocal(new Date()),
        };
        const overlaps = detectOverlaps([...existing, candidate]);
        if (overlaps.length > 0) {
          const o = overlaps.find((x) => x.a.id === candidate.id || x.b.id === candidate.id);
          const other = o ? (o.a.id === candidate.id ? o.b : o.a) : null;
          return {
            ok: false,
            error: `Créneau occupé — chevauchement avec « ${
              other ? get().programs.find((p) => p.id === other.programId)?.title ?? other.startTime : "un autre programme"
            } ». Dépôt refusé.`,
          };
        }

        const grid = get().grids[date] ?? {
          date,
          status: "draft" as const,
          author: user,
          updatedAt: isoLocal(new Date()),
          published: false,
        };
        set({
          scheduleMap: {
            ...get().scheduleMap,
            [date]: [...(get().scheduleMap[date] ?? []), candidate],
          },
          grids: { ...get().grids, [date]: { ...grid, updatedAt: isoLocal(new Date()) } },
          logs: [
            makeLog({
              user,
              role,
              action: "Ajout à la grille",
              details: `« ${program.title} » planifié le ${date} de ${candidate.startTime} à ${candidate.endTime}.`,
              severity: "info",
              date,
            }),
            ...get().logs,
          ],
        });

        /* ── Sens inverse (Studio → Django) ────────────────────────────
           Cette écriture n'existait pas avant ce correctif : l'ajout ne
           touchait que ce store local, jamais la base. Elle ne se
           déclenche que si la journée éditée provient déjà de l'API
           (grid.serverId défini) : pour une journée purement locale/démo,
           il n'y a pas encore de Grille Django à laquelle rattacher
           l'émission, et le comportement reste local comme avant — voir
           MODIFICATIONS.md pour la portée exacte de ce correctif. */
        if (grid.serverId) {
          const genre = CATEGORY_TO_GENRE[program.category] ?? "autre";
          void ajouterEmission(grid.serverId, {
            titre: program.title,
            genre,
            description: program.description,
            heure_debut: isoFor(date, startMin),
            heure_fin: isoFor(date, endMin),
            image_affiche: program.posterUrl || null,
            fiabilite: program.fiabilite ?? "estime",
          })
            .then((creee) => {
              // Aligne l'identifiant serveur pour qu'un retrait immédiat
              // puisse cibler DELETE /api/emissions/{id}/ sans attendre le
              // prochain rafraîchissement de useGrilleQuery.
              set({
                scheduleMap: {
                  ...get().scheduleMap,
                  [date]: (get().scheduleMap[date] ?? []).map((it) =>
                    it.id === candidate.id ? { ...it, serverId: creee.id } : it
                  ),
                },
              });
            })
            .catch((err) => {
              useAppStore.getState().toast({
                title: "Écriture Django refusée",
                message: `« ${program.title} » a été ajouté localement mais pas dans la base : ${String(err)}.`,
                tone: "warning",
              });
            });
        }

        return { ok: true, item: candidate };
      },

      removeScheduleItem: ({ itemId, date, user, role }) => {
        const items = get().scheduleMap[date] ?? [];
        const target = items.find((i) => i.id === itemId);
        if (!target) return { ok: false, error: "Élément introuvable." };
        const program = get().programs.find((p) => p.id === target.programId);
        set({
          scheduleMap: {
            ...get().scheduleMap,
            [date]: items.filter((i) => i.id !== itemId),
          },
          logs: [
            makeLog({
              user,
              role,
              action: "Retrait de la grille",
              details: `« ${program?.title ?? target.programId} » retiré du ${date} (créneau ${target.startTime}–${target.endTime}).`,
              severity: "warning",
              date,
            }),
            ...get().logs,
          ],
        });

        /* ── Sens inverse (Studio → Django) ────────────────────────────
           `target.serverId` n'existe que pour les créneaux hydratés
           depuis l'API (voir hydrateFromApi) : un retrait purement local
           reste purement local, comme avant ce correctif. */
        if (target.serverId) {
          void supprimerEmission(target.serverId).catch((err) => {
            useAppStore.getState().toast({
              title: "Suppression Django refusée",
              message: `« ${program?.title ?? target.programId} » a été retiré localement mais pas de la base : ${String(err)}.`,
              tone: "warning",
            });
          });
        }

        return { ok: true, item: target };
      },

      setGridStatus: ({ date, status, user, role, note }) => {
        const prev = get().grids[date];
        set({
          grids: {
            ...get().grids,
            [date]: {
              date,
              status,
              author: prev?.author ?? user,
              updatedAt: isoLocal(new Date()),
              published: status === "validated",
            },
          },
          scheduleMap: {
            ...get().scheduleMap,
            [date]: (get().scheduleMap[date] ?? []).map((it) => ({ ...it, status })),
          },
          logs: [
            makeLog({
              user,
              role,
              action:
                status === "validated"
                  ? "Validation éditoriale"
                  : status === "pending"
                  ? "Soumission pour validation"
                  : "Repassage en brouillon",
              details: note ?? `Grille du ${date} → statut « ${status} ».`,
              severity: status === "validated" ? "info" : "warning",
              date,
            }),
            ...get().logs,
          ],
        });
      },

      addLog: (log) => set({ logs: [makeLog(log), ...get().logs] }),

      upsertProgram: (program) => {
        const exists = get().programs.some((p) => p.id === program.id);
        set({
          programs: exists
            ? get().programs.map((p) => (p.id === program.id ? program : p))
            : [...get().programs, program],
          logs: [
            makeLog({
              user: "Martin Essomba",
              role: "directeur",
              action: exists ? "Modification programme" : "Création programme",
              details: `« ${program.title} » (${program.durationMinutes} min) ${exists ? "mis à jour" : "ajouté à la bibliothèque"}.`,
              severity: "info",
            }),
            ...get().logs,
          ],
        });
      },

      deleteProgram: (id) => {
        const p = get().programs.find((x) => x.id === id);
        set({
          programs: get().programs.filter((x) => x.id !== id),
          logs: [
            makeLog({
              user: "Martin Essomba",
              role: "directeur",
              action: "Suppression programme",
              details: `« ${p?.title ?? id} » retiré de la bibliothèque.`,
              severity: "warning",
            }),
            ...get().logs,
          ],
        });
      },
    }),
    {
      /* CORRECTIF : v3 → v4. Purge les caches locaux déjà pollués par le
         bug de synchronisation (émissions supprimées côté Django restées
         dans la bibliothèque locale). Sans ce changement de clé, les
         navigateurs déjà ouverts auraient conservé indéfiniment leur
         ancien état, même après la mise à jour du code. */
      name: "balafon-schedule-v4",
      partialize: (s) => ({
        programs: s.programs,
        scheduleMap: s.scheduleMap,
        grids: s.grids,
        logs: s.logs.slice(0, 200),
        seededFor: s.seededFor,
        /* CORRECTIF : `source` n'était pas persistée. Au rechargement de
           la page, elle revenait toujours à "demo", ce qui désarmait le
           garde-fou de ensureSeed() (`if (get().source === "api") return`)
           et permettait au jeu de démonstration d'écraser les données
           réelles reçues de Django lors du prochain ensureSeed(). */
        source: s.source,
      }),
    }
  )
);

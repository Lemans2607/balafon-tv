import { create } from "zustand";
import { persist } from "zustand/middleware";
import { format } from "date-fns";
import type { AppRole, GridInfo, GridStatus, LogEntry, Program, ScheduleItem } from "../types";
import { GENRE_TO_CATEGORY, SEED_PROGRAMS } from "../data/programs";
import { buildSeedData } from "../data/schedules";
import {
  dateKey,
  DAY_END,
  isoLocal,
  toHHMM,
  toMinutes,
  todayKey,
} from "../utils/time";
import { detectOverlaps } from "../utils/validation";
import type { GrilleAPI } from "../utils/planbyAdapter";

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

        const programsBase = [...get().programs];
        const parTitre = new Map(programsBase.map((p) => [p.title.toLowerCase(), p]));
        const scheduleMap: Record<string, ScheduleItem[]> = {};
        const gridsOut: Record<string, GridInfo> = {};
        let seq = 0;

        for (const grille of grilles) {
          const statut = statutNormalise((grille as unknown as { statut?: string }).statut);
          for (const emission of grille.emissions ?? []) {
            const debut = new Date(emission.heure_debut);
            const fin = new Date(emission.heure_fin);
            if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) continue;

            const titre = emission.titre.trim();
            let program = parTitre.get(titre.toLowerCase());
            if (!program) {
              program = {
                id: `api-${grille.chaine.slug}-${emission.id}`,
                title: titre,
                description: emission.description ?? "",
                category: GENRE_TO_CATEGORY[emission.genre] ?? "entertainment",
                durationMinutes: Math.max(
                  5,
                  Math.round((fin.getTime() - debut.getTime()) / 60000)
                ),
                posterUrl: "",
                status: "validated",
                isReplayAvailable: false,
                tags: [emission.genre],
                fiabilite: "confirme",
              };
              parTitre.set(titre.toLowerCase(), program);
              programsBase.push(program);
            }

            const date = dateKey(debut);
            const item: ScheduleItem = {
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
            };
            (scheduleMap[date] ??= []).push(item);
            gridsOut[date] = {
              date,
              status: statut,
              author: "API Django",
              updatedAt: isoLocal(new Date()),
              published: statut === "validated",
            };
          }
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
              role: "admin",
              action: "Hydratation depuis le backend",
              details: `${Object.keys(scheduleMap).length} jour(s) de grille chargés depuis GET /api/grilles/?statut=validee.`,
              severity: "info",
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
              user: "Sandra Kamga",
              role: "admin",
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
              user: "Sandra Kamga",
              role: "admin",
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
      name: "balafon-schedule-v2",
      partialize: (s) => ({
        programs: s.programs,
        scheduleMap: s.scheduleMap,
        grids: s.grids,
        logs: s.logs.slice(0, 200),
        seededFor: s.seededFor,
      }),
    }
  )
);

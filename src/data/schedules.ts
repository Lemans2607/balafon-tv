import { format, parseISO } from "date-fns";
import type { Alert, GridInfo, LogEntry, ScheduleItem, UserAccount } from "../types";
import { CHANNEL_ID } from "../types";
import { depuisCatalogueDemo } from "../utils/planbyAdapter";
import { CATALOGUE_EMISSIONS, OFF_AIR_PROGRAM_ID, RERUN_PROGRAM_ID, CLIPS_PROGRAM_ID, SEED_PROGRAMS } from "./programs";
import { addDaysKey, dateKey, isoLocal, toHHMM, toMinutes, todayKey } from "../utils/time";
import { detectScheduleGaps } from "../utils/validation";

/* ============================================================
   Données de démonstration — Balafon TV
   Les grilles sont GÉNÉRÉES depuis le catalogue réel des émissions
   (emissions_reelles_balafon_tv.json) via l'adaptateur Planby
   `depuisCatalogueDemo`, puis complétées par des blocs de
   continuité (Rediffusion / Balafon Clips / Hors antenne).
   Fenêtre d'antenne : 06:00 → 24:00 · Hors antenne 00:00 → 06:00.
   ============================================================ */

/* Deux rôles métier : le Directeur d'Antenne est l'admin de la plateforme. */
export const USERS: Record<string, UserAccount> = {
  directeur: {
    id: "u-directeur",
    name: "Martin Essomba",
    role: "directeur",
    roleLabel: "Directeur d’Antenne",
    initials: "ME",
  },
  regie: {
    id: "u-regie",
    name: "Rodrigue Talla",
    role: "regie",
    roleLabel: "Opérateur Régie",
    initials: "RT",
  },
};

const SYSTEM_USER = "Système (continuité d’antenne)";

function lundiDe(dateStr: string): Date {
  const d = parseISO(dateStr);
  const decalage = (d.getDay() + 6) % 7; // 0 pour lundi
  const lundi = new Date(d);
  lundi.setDate(lundi.getDate() - decalage);
  return lundi;
}

/** ProgrammePlanby (ISO UTC) → créneau local HH:mm pour une date donnée */
function epgDuJour(epgSemaine: ReturnType<typeof depuisCatalogueDemo>["epg"], date: string) {
  const parTitre = new Map(SEED_PROGRAMS.map((p) => [p.title, p]));
  return epgSemaine
    .filter((e) => dateKey(new Date(e.since)) === date)
    .map((e) => {
      const program = parTitre.get(e.title);
      const duree = Math.round((new Date(e.till).getTime() - new Date(e.since).getTime()) / 60000);
      return {
        programId: program?.id ?? "p-rediff",
        title: e.title,
        startMin: toMinutes(format(new Date(e.since), "HH:mm")),
        duree,
      };
    })
    .sort((a, b) => a.startMin - b.startMin);
}

/** Anti-chevauchement : décale un programme qui en heurte un autre (ex. Séries Cultes après C'le Weekend le samedi) */
function resolveOverlaps(rows: Array<{ programId: string; startMin: number; duree: number }>) {
  const out: Array<{ programId: string; startMin: number; duree: number }> = [];
  let cursor = 0;
  for (const r of rows) {
    const start = Math.max(r.startMin, cursor);
    const end = start + r.duree;
    if (end > 1440) continue; // dépasse minuit → non planifiable
    out.push({ ...r, startMin: start });
    cursor = end;
  }
  return out;
}

let fillSeq = 0;

/** Complète les trous entre programmes avec Rediffusion (60') / Balafon Clips (30') en alternance */
function fillGaps(items: ScheduleItem[], date: string, status: GridInfo["status"]): ScheduleItem[] {
  const gaps = detectScheduleGaps(items, 0, 1440);
  const fillers: ScheduleItem[] = [];
  let flip = true;
  for (const g of gaps) {
    let cursor = toMinutes(g.startTime);
    const end = toMinutes(g.endTime);
    while (cursor < end) {
      const remaining = end - cursor;
      const useRediff = flip && remaining >= 60;
      const duree = useRediff ? 60 : 30;
      fillers.push({
        id: `sch-${date}-fill-${++fillSeq}`,
        programId: useRediff ? RERUN_PROGRAM_ID : CLIPS_PROGRAM_ID,
        channelId: CHANNEL_ID,
        date,
        startTime: toHHMM(cursor),
        endTime: toHHMM(cursor + duree),
        status,
        source: "import",
        lastModifiedBy: SYSTEM_USER,
        updatedAt: isoLocal(new Date()),
      });
      cursor += duree;
      flip = !flip;
    }
  }
  return [...items, ...fillers];
}

let itemSeq = 0;

function buildDay(
  date: string,
  epgSemaine: ReturnType<typeof depuisCatalogueDemo>["epg"],
  status: GridInfo["status"],
  options: { fill: boolean }
): { items: ScheduleItem[]; grid: GridInfo } {
  const rows = resolveOverlaps(epgDuJour(epgSemaine, date));

  let items: ScheduleItem[] = [
    {
      id: `sch-${date}-offair`,
      programId: OFF_AIR_PROGRAM_ID,
      channelId: CHANNEL_ID,
      date,
      startTime: "00:00",
      endTime: "06:00",
      status,
      source: "import",
      lastModifiedBy: SYSTEM_USER,
      updatedAt: isoLocal(new Date()),
    },
    ...rows.map((r) => {
      itemSeq += 1;
      return {
        id: `sch-${date}-${itemSeq}`,
        programId: r.programId,
        channelId: CHANNEL_ID,
        date,
        startTime: toHHMM(r.startMin),
        endTime: toHHMM(r.startMin + r.duree),
        status,
        source: "import" as const,
        lastModifiedBy: "Import catalogue Balafon TV",
        updatedAt: isoLocal(new Date()),
      };
    }),
  ];

  if (options.fill) items = fillGaps(items, date, status);

  return {
    items,
    grid: {
      date,
      status,
      author: "Import catalogue Balafon TV",
      updatedAt: isoLocal(new Date()),
      published: status === "validated",
    },
  };
}

export function buildSeedData(): {
  scheduleMap: Record<string, ScheduleItem[]>;
  grids: Record<string, GridInfo>;
  alerts: Alert[];
  logs: LogEntry[];
} {
  itemSeq = 0;
  fillSeq = 0;
  const today = todayKey();
  const epgSemaine = depuisCatalogueDemo(
    CATALOGUE_EMISSIONS,
    CHANNEL_ID,
    "Balafon TV",
    lundiDe(today)
  ).epg;

  /* Jour volontairement laissé INCOMPLET (trous réels du catalogue, non comblés)
     pour démontrer : hachures rouges, publication bloquée, correction par drag & drop. */
  const incompleteDay = addDaysKey(today, 2);

  const plan: Array<{ offset: number; status: GridInfo["status"]; fill: boolean }> = [
    { offset: -1, status: "validated", fill: true },
    { offset: 0, status: "validated", fill: true },
    { offset: 1, status: "pending", fill: true },
    { offset: 2, status: "draft", fill: false }, // ← journée incomplète de démonstration
    { offset: 3, status: "draft", fill: true },
    { offset: 4, status: "draft", fill: true },
    { offset: 5, status: "draft", fill: true },
  ];

  const scheduleMap: Record<string, ScheduleItem[]> = {};
  const grids: Record<string, GridInfo> = {};
  for (const p of plan) {
    const key = addDaysKey(today, p.offset);
    const { items, grid } = buildDay(key, epgSemaine, p.status, { fill: p.fill });
    scheduleMap[key] = items;
    grids[key] = grid;
  }

  const gaps = detectScheduleGaps(scheduleMap[incompleteDay] ?? [], 360, 1440);
  const nowIso = isoLocal(new Date());

  const alerts: Alert[] = [
    {
      id: "al-seed-1",
      severity: "info",
      title: "Grille d’aujourd’hui validée",
      message: `La grille du ${today} (générée depuis le catalogue réel Balafon TV) a été validée par ${USERS.directeur.name} et publiée sur le portail public.`,
      createdAt: nowIso,
      source: "director",
      acknowledged: false,
    },
    {
      id: "al-seed-2",
      severity: "warning",
      title: "Grille incomplète détectée",
      message: `${gaps.length} trous détectés sur la grille du ${incompleteDay} (${gaps
        .map((g) => `${g.startTime}–${g.endTime}`)
        .join(", ")}). Publication impossible tant que l’Admin n’a pas complété la grille.`,
      createdAt: nowIso,
      source: "system",
      acknowledged: false,
      relatedScheduleId: incompleteDay,
    },
    {
      id: "al-seed-3",
      severity: "info",
      title: "Synchronisation vMix simulée",
      message: "Dernière synchronisation de démonstration effectuée avec succès. Mode démonstration — connexion vMix simulée.",
      createdAt: nowIso,
      source: "vmix",
      acknowledged: true,
      acknowledgedAt: nowIso,
      acknowledgedBy: USERS.regie.name,
    },
  ];

  const logs: LogEntry[] = [
    {
      id: "log-seed-1",
      at: nowIso,
      user: USERS.directeur.name,
      role: "directeur",
      action: "Validation éditoriale",
      details: `Grille du ${today} validée pour diffusion — 13 émissions du catalogue réel + continuité d’antenne.`,
      severity: "info",
      date: today,
    },
    {
      id: "log-seed-2",
      at: nowIso,
      user: SYSTEM_USER,
      role: "directeur",
      action: "Import du catalogue Balafon TV",
      details: `Semaine générée depuis emissions_reelles_balafon_tv.json (sources : balafon.media, Le Jour — horaires « estimés » signalés dans les fiches).`,
      severity: "info",
    },
    {
      id: "log-seed-3",
      at: nowIso,
      user: USERS.directeur.name,
      role: "directeur",
      action: "Construction de grille",
      details: `Grille du ${incompleteDay} laissée volontairement incomplète (${gaps.length} créneaux à combler) pour la démonstration.`,
      severity: "warning",
      date: incompleteDay,
    },
  ];

  return { scheduleMap, grids, alerts, logs };
}

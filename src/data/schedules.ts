import type { Alert, GridInfo, LogEntry, ScheduleItem, UserAccount } from "../types";
import { addDaysKey, isoLocal, todayKey } from "../utils/time";
import { OFF_AIR_PROGRAM_ID } from "./programs";

/* ============================================================
   Données de démonstration — Balafon TV
   Fenêtre d'antenne : 06:00 → 24:00 · Hors antenne 00:00 → 06:00
   ============================================================ */

export const USERS: Record<string, UserAccount> = {
  admin: {
    id: "u-admin",
    name: "Sandra Kamga",
    role: "admin",
    roleLabel: "Administratrice Antenne",
    initials: "SK",
  },
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

type Row = [programId: string, start: string, end: string];

/** Journée type complète (06:00 → 24:00 + hors antenne) */
export const FULL_DAY_ROWS: Row[] = [
  [OFF_AIR_PROGRAM_ID, "00:00", "06:00"],
  ["p-info-matin", "06:00", "07:00"],
  ["p-grand-debat", "07:00", "08:30"],
  ["p-femme", "08:30", "09:00"],
  ["p-entre-nous", "09:00", "10:00"],
  ["p-hitparade", "10:00", "12:00"],
  ["p-info-midi", "12:00", "13:00"],
  ["p-doc", "13:00", "14:00"],
  ["p-culture", "14:00", "15:30"],
  ["p-meufs", "15:30", "17:00"],
  ["p-sport", "17:00", "18:00"],
  ["p-journal", "18:00", "19:00"],
  ["p-doc", "19:00", "20:00"],
  ["p-cine", "20:00", "21:30"],
  ["p-serie", "21:30", "23:00"],
  ["p-nuits", "23:00", "24:00"],
];

/** Journée volontairement incomplète (2 trous : 14:00–15:30 et 21:30–23:00) */
export const INCOMPLETE_DAY_ROWS: Row[] = FULL_DAY_ROWS.filter(
  ([, s]) => s !== "14:00" && s !== "21:30"
);

/** Journée partielle (matinée uniquement) */
export const PARTIAL_DAY_ROWS: Row[] = FULL_DAY_ROWS.filter(
  ([, s]) => ["00:00", "06:00", "07:00", "08:30", "09:00", "10:00", "12:00"].includes(s)
);

let seq = 0;
function makeItem(date: string, [programId, startTime, endTime]: Row, status: GridInfo["status"]): ScheduleItem {
  seq += 1;
  return {
    id: `sch-${date}-${seq}`,
    programId,
    channelId: "balafon-tv",
    date,
    startTime,
    endTime,
    status,
    source: "admin",
    lastModifiedBy: USERS.admin.name,
    updatedAt: isoLocal(new Date()),
  };
}

function buildDay(
  date: string,
  rows: Row[],
  status: GridInfo["status"],
  author: string
): { items: ScheduleItem[]; grid: GridInfo } {
  return {
    items: rows.map((r) => makeItem(date, r, status)),
    grid: { date, status, author, updatedAt: isoLocal(new Date()), published: status === "validated" },
  };
}

export function buildSeedData(): {
  scheduleMap: Record<string, ScheduleItem[]>;
  grids: Record<string, GridInfo>;
  alerts: Alert[];
  logs: LogEntry[];
} {
  seq = 0;
  const today = todayKey();
  const days: Array<{ offset: number; rows: Row[]; status: GridInfo["status"]; author: string }> = [
    { offset: -1, rows: FULL_DAY_ROWS, status: "validated", author: USERS.admin.name },
    { offset: 0, rows: FULL_DAY_ROWS, status: "validated", author: USERS.admin.name },
    { offset: 1, rows: FULL_DAY_ROWS, status: "pending", author: USERS.admin.name },
    { offset: 2, rows: INCOMPLETE_DAY_ROWS, status: "draft", author: USERS.admin.name },
    { offset: 3, rows: PARTIAL_DAY_ROWS, status: "draft", author: USERS.admin.name },
    { offset: 4, rows: [[OFF_AIR_PROGRAM_ID, "00:00", "06:00"]], status: "draft", author: USERS.admin.name },
    { offset: 5, rows: [[OFF_AIR_PROGRAM_ID, "00:00", "06:00"]], status: "draft", author: USERS.admin.name },
  ];

  const scheduleMap: Record<string, ScheduleItem[]> = {};
  const grids: Record<string, GridInfo> = {};
  for (const d of days) {
    const key = addDaysKey(today, d.offset);
    const { items, grid } = buildDay(key, d.rows, d.status, d.author);
    scheduleMap[key] = items;
    grids[key] = grid;
  }

  const nowIso = isoLocal(new Date());
  const incompleteDay = addDaysKey(today, 2);

  const alerts: Alert[] = [
    {
      id: "al-seed-1",
      severity: "info",
      title: "Grille d’aujourd’hui validée",
      message: `La grille du ${today} a été validée par ${USERS.directeur.name} et publiée sur le portail public.`,
      createdAt: nowIso,
      source: "director",
      acknowledged: false,
    },
    {
      id: "al-seed-2",
      severity: "warning",
      title: "Grille incomplète détectée",
      message: `2 trous détectés sur la grille du ${incompleteDay} (14:00–15:30 et 21:30–23:00). Publication impossible.`,
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
      details: `Grille du ${today} validée pour diffusion.`,
      severity: "info",
      date: today,
    },
    {
      id: "log-seed-2",
      at: nowIso,
      user: USERS.admin.name,
      role: "admin",
      action: "Construction de grille",
      details: `Grille du ${incompleteDay} enregistrée en brouillon — 2 créneaux à compléter.`,
      severity: "warning",
      date: incompleteDay,
    },
  ];

  return { scheduleMap, grids, alerts, logs };
}

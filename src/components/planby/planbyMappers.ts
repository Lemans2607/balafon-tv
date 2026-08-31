import type { Program, ProgramCategory, GridStatus, ScheduleItem } from "../../types";
import { CATEGORY_META, CHANNEL_ID } from "../../types";
import {
  ADMIN_DAY_START,
  DAY_END,
  isoFor,
  isoLocal,
  progressPct,
  sinceISO,
  tillISO,
  toMinutes,
} from "../../utils/time";
import { detectScheduleGaps } from "../../utils/validation";

export type EpgMode = "public" | "admin" | "regie";

/* ============================================================
   Transformation des données métier Balafon → format Planby.
   Toute la logique métier (trous, hors antenne) est calculée ici,
   en dehors du moteur Planby.
   ============================================================ */

export interface PlanbyEpgData {
  channelUuid: string;
  id: string;
  title: string;
  description: string;
  since: string;
  till: string;
  image: string;
  category: ProgramCategory;
  programId: string;
  scheduleId: string;
  status: string;
  gridStatus: GridStatus | null;
  isLive: boolean;
  isMissing: boolean;
  isOffAir: boolean;
  isRerun: boolean;
  progress: number;
  durationMinutes: number;
}

export const BALAFON_LOGO_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' rx='10' fill='%23FF3D00'/%3E%3Cg fill='%23050505'%3E%3Crect x='9' y='15' width='5' height='18' rx='2.5'/%3E%3Crect x='17' y='11' width='5' height='26' rx='2.5'/%3E%3Crect x='25' y='13' width='5' height='22' rx='2.5'/%3E%3Crect x='33' y='17' width='5' height='14' rx='2.5'/%3E%3C/g%3E%3C/svg%3E";

/** Chaîne Planby représentant Balafon TV — la seule chaîne du portail */
export const BALAFON_CHANNELS = [
  {
    uuid: CHANNEL_ID,
    logo: BALAFON_LOGO_URI,
    title: "Balafon TV",
  },
];

function sameDayKey(a: Date, key: string): boolean {
  const y = a.getFullYear();
  const m = String(a.getMonth() + 1).padStart(2, "0");
  const d = String(a.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}` === key;
}

export interface EnrichedSchedule {
  item: ScheduleItem;
  program: Program | null;
  since: string;
  till: string;
  isLive: boolean;
  progress: number;
}

/** Items réels enrichis (pour listes mobile, rails, régie…) */
export function enrichDay(
  items: ScheduleItem[],
  programs: Program[],
  date: string,
  now: Date
): EnrichedSchedule[] {
  const byId = new Map(programs.map((p) => [p.id, p]));
  const live = sameDayKey(now, date);
  const nowIso = isoLocal(now);
  return items
    .filter((it) => toMinutes(it.endTime) > toMinutes(it.startTime))
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
    .map((item) => {
      const since = sinceISO(item);
      const till = tillISO(item);
      return {
        item,
        program: byId.get(item.programId) ?? null,
        since,
        till,
        isLive: live && nowIso >= since && nowIso < till,
        progress: live ? progressPct(now, since, till) : 0,
      };
    });
}

export interface MapOptions {
  items: ScheduleItem[];
  programs: Program[];
  date: string;
  mode: EpgMode;
  now: Date;
  gridStatus: GridStatus | null;
}

/**
 * mapScheduleToPlanbyEpg — données compatibles Planby :
 * { channelUuid, id, image, since, till, title, description, … }
 *  - mode public/régie : fenêtre 00:00 → 24:00, périodes vides → « Hors antenne »
 *  - mode admin : fenêtre 06:00 → 24:00, trous → blocs « Programme manquant »
 */
export function mapScheduleToPlanbyEpg({
  items,
  programs,
  date,
  mode,
  now,
  gridStatus,
}: MapOptions): PlanbyEpgData[] {
  const byId = new Map(programs.map((p) => [p.id, p]));
  const windowStart = mode === "admin" ? ADMIN_DAY_START : 0;
  const windowEnd = DAY_END;

  const real = items
    .filter((it) => {
      const s = toMinutes(it.startTime);
      const e = toMinutes(it.endTime);
      return e > s && e > windowStart && s < windowEnd;
    })
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  const live = sameDayKey(now, date);
  const nowIso = isoLocal(now);

  const toData = (item: ScheduleItem): PlanbyEpgData => {
    const program = byId.get(item.programId);
    const since = sinceISO(item);
    const till = tillISO(item);
    const isLive = live && nowIso >= since && nowIso < till && mode !== "admin";
    return {
      channelUuid: CHANNEL_ID,
      id: item.id,
      title: program?.title ?? "Programme",
      description: program?.description ?? "",
      since,
      till,
      image: program?.posterUrl ?? "",
      category: program?.category ?? "entertainment",
      programId: item.programId,
      scheduleId: item.id,
      status: item.status,
      gridStatus,
      isLive,
      isMissing: false,
      isOffAir: program?.category === "off-air",
      isRerun: program?.category === "rerun",
      progress: isLive ? progressPct(now, since, till) : 0,
      durationMinutes: toMinutes(item.endTime) - toMinutes(item.startTime),
    };
  };

  const result: PlanbyEpgData[] = real.map(toData);

  /* Pseudo-blocs calculés hors Planby */
  if (mode === "admin") {
    const gaps = detectScheduleGaps(real, windowStart, windowEnd);
    for (const g of gaps) {
      result.push({
        channelUuid: CHANNEL_ID,
        id: `gap-${g.startTime}`,
        title: "Programme manquant",
        description: "Aucun programme planifié sur ce créneau.",
        since: isoFor(date, toMinutes(g.startTime)),
        till: isoFor(date, toMinutes(g.endTime)),
        image: "",
        category: "off-air",
        programId: "gap",
        scheduleId: g.id,
        status: "draft",
        gridStatus,
        isLive: false,
        isMissing: true,
        isOffAir: false,
        isRerun: false,
        progress: 0,
        durationMinutes: g.durationMinutes,
      });
    }
  } else {
    /* Remplissage Hors antenne : aucune période vide ne doit exister */
    let cursor = windowStart;
    const holes: Array<{ s: number; e: number }> = [];
    for (const it of real) {
      const s = Math.max(windowStart, toMinutes(it.startTime));
      const e = Math.min(windowEnd, toMinutes(it.endTime));
      if (s > cursor) holes.push({ s: cursor, e: s });
      cursor = Math.max(cursor, e);
    }
    if (cursor < windowEnd) holes.push({ s: cursor, e: windowEnd });
    for (const h of holes) {
      result.push({
        channelUuid: CHANNEL_ID,
        id: `offair-${date}-${h.s}`,
        title: "Hors antenne",
        description: "Aucune diffusion planifiée.",
        since: isoFor(date, h.s),
        till: isoFor(date, h.e),
        image: "",
        category: "off-air",
        programId: "p-offair",
        scheduleId: `offair-${date}-${h.s}`,
        status: "validated",
        gridStatus,
        isLive: live && nowIso >= isoFor(date, h.s) && nowIso < isoFor(date, h.e),
        isMissing: false,
        isOffAir: true,
        isRerun: false,
        progress: 0,
        durationMinutes: h.e - h.s,
      });
    }
  }

  return result.sort((a, b) => new Date(a.since).getTime() - new Date(b.since).getTime());
}

export function categoryColor(cat: ProgramCategory): string {
  return CATEGORY_META[cat]?.color ?? "#9CA3AF";
}

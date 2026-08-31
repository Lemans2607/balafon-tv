import type { Program, ScheduleGap, ScheduleItem } from "../types";
import { DAY_END, durationLabel, toHHMM, toMinutes } from "./time";

/* ============================================================
   Règles métier — indépendantes de Planby
   (détection de trous, chevauchements, complétude, publication)
   ============================================================ */

export function sortItems(items: ScheduleItem[]): ScheduleItem[] {
  return [...items].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

export interface OverlapPair {
  a: ScheduleItem;
  b: ScheduleItem;
}

/** Détection de chevauchements (règle : aucun programme ne peut en chevaucher un autre) */
export function detectOverlaps(items: ScheduleItem[]): OverlapPair[] {
  const sorted = sortItems(items);
  const pairs: OverlapPair[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (toMinutes(a.endTime) > toMinutes(b.startTime)) pairs.push({ a, b });
  }
  return pairs;
}

/**
 * Détection des trous horaires dans la fenêtre [startMin, endMin].
 * Retourne la liste des créneaux sans diffusion.
 */
export function detectScheduleGaps(
  items: ScheduleItem[],
  startMin: number,
  endMin: number = DAY_END
): ScheduleGap[] {
  const gaps: ScheduleGap[] = [];
  const valid = sortItems(items).filter(
    (it) => toMinutes(it.endTime) > startMin && toMinutes(it.startTime) < endMin
  );
  let cursor = startMin;
  const date = valid[0]?.date ?? "";
  for (const it of valid) {
    const s = Math.max(startMin, toMinutes(it.startTime));
    const e = Math.min(endMin, toMinutes(it.endTime));
    if (s > cursor) {
      gaps.push({
        id: `gap-${date}-${cursor}`,
        date,
        startTime: toHHMM(cursor),
        endTime: toHHMM(s),
        durationMinutes: s - cursor,
      });
    }
    cursor = Math.max(cursor, e);
  }
  if (cursor < endMin) {
    gaps.push({
      id: `gap-${date}-${cursor}`,
      date,
      startTime: toHHMM(cursor),
      endTime: toHHMM(endMin),
      durationMinutes: endMin - cursor,
    });
  }
  return gaps;
}

/** Minutes couvertes dans la fenêtre */
export function coveredMinutes(
  items: ScheduleItem[],
  startMin: number,
  endMin: number = DAY_END
): number {
  const valid = sortItems(items).filter(
    (it) => toMinutes(it.endTime) > startMin && toMinutes(it.startTime) < endMin
  );
  let covered = 0;
  let cursor = startMin;
  for (const it of valid) {
    const s = Math.max(startMin, toMinutes(it.startTime));
    const e = Math.min(endMin, toMinutes(it.endTime));
    if (s >= cursor) covered += e - s;
    cursor = Math.max(cursor, e);
  }
  return covered;
}

export function coveragePercent(
  items: ScheduleItem[],
  startMin: number,
  endMin: number = DAY_END
): number {
  const total = endMin - startMin;
  if (total <= 0) return 100;
  return Math.round((coveredMinutes(items, startMin, endMin) / total) * 100);
}

/** Un programme est "complet" s'il peut être diffusé */
export function isProgramComplete(p?: Program): boolean {
  return Boolean(
    p && p.title.trim() && p.description.trim() && p.durationMinutes > 0
  );
}

export interface PublishVerdict {
  ok: boolean;
  gaps: ScheduleGap[];
  overlaps: OverlapPair[];
  incompletePrograms: string[];
  reasons: string[];
  coverage: number;
}

/** Contrôle de complétude avant publication — aucune règle dans Planby */
export function validateGridForPublish(
  items: ScheduleItem[],
  programs: Program[],
  gridStatus: string,
  startMin: number,
  endMin: number = DAY_END
): PublishVerdict {
  const gaps = detectScheduleGaps(items, startMin, endMin);
  const overlaps = detectOverlaps(items);
  const byId = new Map(programs.map((p) => [p.id, p]));
  const incompletePrograms = items
    .filter((it) => !isProgramComplete(byId.get(it.programId)))
    .map((it) => byId.get(it.programId)?.title ?? it.programId);

  const reasons: string[] = [];
  if (gaps.length > 0)
    reasons.push(
      `Grille incomplète — ${gaps.length} trou${gaps.length > 1 ? "s" : ""} détecté${
        gaps.length > 1 ? "s" : ""
      } (${gaps.map((g) => `${g.startTime}–${g.endTime}`).join(", ")})`
    );
  if (overlaps.length > 0)
    reasons.push(`${overlaps.length} chevauchement(s) de programmes`);
  if (incompletePrograms.length > 0)
    reasons.push(`Programmes incomplets : ${[...new Set(incompletePrograms)].join(", ")}`);
  if (gridStatus !== "validated")
    reasons.push("La grille n’a pas encore été validée par le Directeur d’Antenne");

  return {
    ok: reasons.length === 0,
    gaps,
    overlaps,
    incompletePrograms,
    reasons,
    coverage: coveragePercent(items, startMin, endMin),
  };
}

export function gapLabel(g: ScheduleGap): string {
  return `${g.startTime} – ${g.endTime} · ${durationLabel(g.durationMinutes)}`;
}

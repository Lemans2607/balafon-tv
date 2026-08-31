import {
  addDays,
  addMinutes,
  differenceInMinutes,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";

/** Fenêtre d'antenne Admin/Régie : 06:00 → 24:00 */
export const ADMIN_DAY_START = 6 * 60; // minutes
export const DAY_END = 24 * 60; // minutes ("24:00" = fin de journée)

/** "HH:mm" → minutes depuis minuit ("24:00" → 1440) */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** minutes → "HH:mm" (1440 → "24:00") */
export function toHHMM(minutes: number): string {
  const m = Math.max(0, Math.min(DAY_END, Math.round(minutes)));
  if (m === DAY_END) return "24:00";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Clé de date locale YYYY-MM-DD */
export function dateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function addDaysKey(key: string, days: number): string {
  return dateKey(addDays(parseISO(key), days));
}

/** ISO local (sans fuseau) pour Planby — ex: 2026-08-28T18:00:00 */
export function isoLocal(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm:ss");
}

/** ISO local depuis clé de date + minutes ("24:00" bascule au lendemain 00:00) */
export function isoFor(dateStr: string, minutes: number): string {
  if (minutes >= DAY_END) {
    return `${addDaysKey(dateStr, 1)}T00:00:00`;
  }
  return `${dateStr}T${toHHMM(minutes)}:00`;
}

export function sinceISO(item: { date: string; startTime: string }): string {
  return isoFor(item.date, toMinutes(item.startTime));
}

export function tillISO(item: { date: string; endTime: string }): string {
  return isoFor(item.date, toMinutes(item.endTime));
}

/** "1 h 30" / "45 min" */
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

export function isProgramLive(now: Date, since: string, till: string): boolean {
  const t = now.getTime();
  return t >= new Date(since).getTime() && t < new Date(till).getTime();
}

export function progressPct(now: Date, since: string, till: string): number {
  const s = new Date(since).getTime();
  const e = new Date(till).getTime();
  if (e <= s) return 0;
  return Math.max(0, Math.min(100, ((now.getTime() - s) / (e - s)) * 100));
}

/** Arrondi au cran de 30 minutes */
export function snap30(minutes: number): number {
  return Math.round(minutes / 30) * 30;
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function labelDay(key: string, opts?: { short?: boolean }): string {
  const d = parseISO(key);
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diff = differenceInMinutes(target, today) / 1440;
  if (diff === 0) return "Aujourd’hui";
  if (diff === 1) return "Demain";
  if (diff === -1) return "Hier";
  return format(d, opts?.short ? "EEE d MMM" : "EEEE d MMMM", { locale: fr });
}

export function formatHM(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

export function formatClock(d: Date): string {
  return format(d, "HH:mm:ss");
}

/** Heure simulée = heure réelle + offset persisté */
export function simNow(offsetMinutes: number, base: Date = new Date()): Date {
  return addMinutes(base, offsetMinutes);
}

export function isSameDayKey(key: string, d: Date): boolean {
  return dateKey(d) === key;
}

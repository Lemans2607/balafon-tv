import { useEffect, useMemo, useState } from "react";
import type { Program, ScheduleItem } from "../types";
import { useAppStore } from "../store/appStore";
import { useScheduleStore } from "../store/scheduleStore";
import { isoLocal, progressPct, simNow, sinceISO, tillISO, toMinutes } from "../utils/time";

/* ============================================================
   useNow — horloge de démonstration
   Heure simulée = heure réelle + offset (persisté), tick 1 s
   ============================================================ */
export function useNow(intervalMs = 1000): Date {
  const offset = useAppStore((s) => s.simOffsetMin);
  const [now, setNow] = useState(() => simNow(offset));
  useEffect(() => {
    setNow(simNow(offset));
    const id = window.setInterval(() => setNow(simNow(offset)), intervalMs);
    return () => window.clearInterval(id);
  }, [offset, intervalMs]);
  return now;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    setMatches(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

export interface LiveContext {
  current: ScheduleItem | null;
  currentProgram: Program | null;
  next: ScheduleItem | null;
  nextProgram: Program | null;
  previous: ScheduleItem | null;
  progress: number; // %
  upcoming: Array<{ item: ScheduleItem; program: Program | null }>;
  items: ScheduleItem[];
}

/* ============================================================
   useCurrentProgram — programme en direct / suivant / à venir
   Calculé depuis le store, indépendant du rendu Planby.
   ============================================================ */
export function useCurrentProgram(date: string, now: Date): LiveContext {
  const scheduleMap = useScheduleStore((s) => s.scheduleMap);
  const programs = useScheduleStore((s) => s.programs);

  return useMemo(() => {
    const byId = new Map(programs.map((p) => [p.id, p]));
    const items = (scheduleMap[date] ?? [])
      .filter((it) => toMinutes(it.endTime) > toMinutes(it.startTime))
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    const nowIso = isoLocal(now);
    let current: ScheduleItem | null = null;
    let next: ScheduleItem | null = null;
    let previous: ScheduleItem | null = null;

    for (const it of items) {
      const s = sinceISO(it);
      const t = tillISO(it);
      if (nowIso >= s && nowIso < t) current = it;
      else if (s >= nowIso && !next) next = it;
      else if (t <= nowIso) previous = it;
    }

    const upcoming = items
      .filter((it) => sinceISO(it) >= nowIso)
      .slice(0, 6)
      .map((item) => ({ item, program: byId.get(item.programId) ?? null }));

    return {
      current,
      currentProgram: current ? byId.get(current.programId) ?? null : null,
      next,
      nextProgram: next ? byId.get(next.programId) ?? null : null,
      previous,
      progress: current ? progressPct(now, sinceISO(current), tillISO(current)) : 0,
      upcoming,
      items,
    };
  }, [date, now, scheduleMap, programs]);
}

/* ============================================================
   usePlayhead — position (px) du playhead dans l'EPG Planby
   ============================================================ */
export function usePlayheadX(
  now: Date,
  dateKeyStr: string,
  dayStartMin: number,
  pxPerMinute: number,
  sidebarWidth: number
): number | null {
  return useMemo(() => {
    const d = new Date(now);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    if (key !== dateKeyStr) return null;
    const min = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    if (min < dayStartMin || min > 1440) return null;
    return sidebarWidth + (min - dayStartMin) * pxPerMinute;
  }, [now, dateKeyStr, dayStartMin, pxPerMinute, sidebarWidth]);
}

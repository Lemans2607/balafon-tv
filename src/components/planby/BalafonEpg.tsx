import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Epg, Layout, useEpg } from "planby";
import { ChevronLeft, ChevronRight, List, LocateFixed } from "lucide-react";
import { useScheduleStore } from "../../store/scheduleStore";
import { CATEGORY_META } from "../../types";
import type { GridStatus } from "../../types";
import { formatClock, labelDay, snap30, toMinutes } from "../../utils/time";
import { useMediaQuery, usePlayheadX } from "../../hooks/useNow";
import { EPG_GEOMETRY, PLANBY_GLOBAL_CSS, planbyTheme } from "./planbyTheme";
import {
  BALAFON_CHANNELS,
  mapScheduleToPlanbyEpg,
  type EpgMode,
  type PlanbyEpgData,
} from "./planbyMappers";
import { BalafonProgram } from "./BalafonProgram";
import { BalafonChannel } from "./BalafonChannel";
import { BalafonTimeline } from "./BalafonTimeline";

interface Props {
  date: string;
  mode: EpgMode;
  now: Date;
  dayStartMin?: number;
  heightPx?: number;
  showControls?: boolean;
  gridStatus?: GridStatus | null;
  categoryFilter?: string | null;
  publicGate?: boolean;
  onSelectItem?: (data: PlanbyEpgData) => void;
  onRemoveItem?: (scheduleId: string) => void;
  onMissingClick?: (data: PlanbyEpgData) => void;
  onDropProgram?: (programId: string, startMin: number) => void;
}

/* ============================================================
   BalafonEpg — moteur EPG Planby (affichage principal)
   - timeline horizontale, heures, ligne de chaînes, virtualisation
   - playhead rouge synchronisé sur l'heure simulée
   - fallback HTML5 Drag & Drop (fonction non incluse dans Planby libre)
   - bascule automatique en liste verticale sur mobile
   ============================================================ */
export function BalafonEpg({
  date,
  mode,
  now,
  dayStartMin = mode === "admin" ? 360 : 0,
  heightPx = 224,
  showControls = true,
  gridStatus = null,
  categoryFilter = null,
  publicGate = false,
  onSelectItem,
  onRemoveItem,
  onMissingClick,
  onDropProgram,
}: Props) {
  const scheduleMap = useScheduleStore((s) => s.scheduleMap);
  const programs = useScheduleStore((s) => s.programs);
  const grids = useScheduleStore((s) => s.grids);
  const isMobile = useMediaQuery("(max-width: 820px)");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [dropHover, setDropHover] = useState(false);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Re-calcul des états live/progress chaque minute (léger) */
  const nowBucket = Math.floor(now.getTime() / 60000);
  const rawItems = scheduleMap[date] ?? [];
  const items = useMemo(() => {
    /* Portail public : seules les grilles validées + publiées sont diffusées */
    if (publicGate) {
      const g = grids[date];
      if (!g || g.status !== "validated" || !g.published) return [];
    }
    if (!categoryFilter) return rawItems;
    const byId = new Map(programs.map((p) => [p.id, p]));
    return rawItems.filter((it) => byId.get(it.programId)?.category === categoryFilter);
  }, [rawItems, categoryFilter, programs, publicGate, grids, date]);

  const epg = useMemo(
    () =>
      mapScheduleToPlanbyEpg({
        items,
        programs,
        date,
        mode,
        now: new Date(nowBucket * 60000),
        gridStatus,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, programs, date, mode, nowBucket, gridStatus]
  );

  const startDate = useMemo(() => `${date}T${hhmm(dayStartMin)}:00`, [date, dayStartMin]);
  const endDate = useMemo(() => `${nextDay(date)}T00:00:00`, [date]);

  const { getEpgProps, getLayoutProps, onScrollLeft, onScrollRight } = useEpg({
    epg,
    channels: BALAFON_CHANNELS,
    startDate,
    endDate,
    width: width || undefined,
    height: heightPx,
    isSidebar: true,
    isTimeline: true,
    isLine: false, // playhead custom (heure simulée + rouge Balafon)
    isBaseTimeFormat: false,
    dayWidth: EPG_GEOMETRY.dayWidth,
    sidebarWidth: EPG_GEOMETRY.sidebarWidth,
    itemHeight: EPG_GEOMETRY.itemHeight,
    theme: planbyTheme,
    globalStyles: PLANBY_GLOBAL_CSS,
  });

  const layout = getLayoutProps();
  const pxPerMinute = layout.hourWidth / 60;

  const getScrollEl = useCallback((): HTMLElement | null => {
    const content = wrapperRef.current?.querySelector('[data-testid="content"]');
    return (content?.parentElement as HTMLElement) ?? null;
  }, []);

  const scrollToNow = useCallback(
    (instant: boolean) => {
      const el = getScrollEl();
      if (!el) return;
      const n = new Date(now);
      const key = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
        n.getDate()
      ).padStart(2, "0")}`;
      if (key !== date) {
        el.scrollTo({ left: 0, behavior: instant ? "auto" : "smooth" });
        return;
      }
      const minutes = n.getHours() * 60 + n.getMinutes() - dayStartMin;
      const target = Math.max(
        0,
        minutes * pxPerMinute - el.clientWidth / 2 + layout.sidebarWidth
      );
      if (instant) {
        const prev = el.style.scrollBehavior;
        el.style.scrollBehavior = "auto";
        el.scrollLeft = target;
        el.style.scrollBehavior = prev;
      } else {
        el.scrollTo({ left: target, behavior: "smooth" });
      }
    },
    [date, dayStartMin, getScrollEl, layout.sidebarWidth, now, pxPerMinute]
  );

  /* Positionnement initial + à chaque changement de jour */
  useEffect(() => {
    if (!width) return;
    const id = window.setTimeout(() => scrollToNow(true), 60);
    return () => window.clearTimeout(id);
  }, [date, width, scrollToNow]);

  const playheadX = usePlayheadX(now, date, dayStartMin, pxPerMinute, layout.sidebarWidth);

  /* ---------- Drag & Drop HTML5 (fallback Planby libre) ---------- */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDropHover(false);
      if (!onDropProgram) return;
      const programId = e.dataTransfer.getData("text/balafon-program");
      if (!programId) return;
      const el = getScrollEl();
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const xInContent = e.clientX - rect.left + el.scrollLeft - layout.sidebarWidth;
      const minutes = snap30(dayStartMin + xInContent / pxPerMinute);
      const clamped = Math.max(dayStartMin, Math.min(1440 - 30, minutes));
      onDropProgram(programId, clamped);
    },
    [dayStartMin, getScrollEl, layout.sidebarWidth, onDropProgram, pxPerMinute]
  );

  if (isMobile) {
    return (
      <MobileDayList
        date={date}
        mode={mode}
        epg={epg}
        now={now}
        showControls={showControls}
        onSelectItem={onSelectItem}
        onMissingClick={onMissingClick}
        onScrollToNow={() => scrollToNow(false)}
      />
    );
  }

  return (
    <div className="select-none">
      {showControls && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-lg border border-ink-600 bg-ink-800">
            <button
              type="button"
              aria-label="Faire défiler la timeline vers la gauche"
              onClick={() => onScrollLeft(layout.hourWidth * 2)}
              className="p-2 text-mist transition-colors hover:bg-ink-700 hover:text-paper"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="h-5 w-px bg-ink-600" aria-hidden />
            <button
              type="button"
              aria-label="Faire défiler la timeline vers la droite"
              onClick={() => onScrollRight(layout.hourWidth * 2)}
              className="p-2 text-mist transition-colors hover:bg-ink-700 hover:text-paper"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => scrollToNow(false)}
            className="flex items-center gap-1.5 rounded-lg bg-balafon px-3 py-2 text-[12px] font-bold text-white shadow-[0_4px_16px_rgba(227,30,36,0.4)] transition-transform hover:scale-[1.03] active:scale-95"
          >
            <LocateFixed size={14} aria-hidden />
            Aller à maintenant
          </button>
          <div className="ml-auto flex items-center gap-3">
            {mode === "admin" && <AdminLegend />}
            <span className="font-mono text-[13px] tabular-nums text-mist" aria-label="Heure actuelle">
              {formatClock(now)}
            </span>
          </div>
        </div>
      )}

      <div
        ref={wrapperRef}
        role="region"
        aria-label={`Guide des programmes Balafon TV — ${labelDay(date)}`}
        onDragOver={
          onDropProgram
            ? (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setDropHover(true);
              }
            : undefined
        }
        onDragLeave={onDropProgram ? () => setDropHover(false) : undefined}
        onDrop={onDropProgram ? handleDrop : undefined}
        className={`relative overflow-hidden rounded-xl border transition-colors ${
          dropHover ? "border-balafon/70 shadow-[0_0_0_3px_rgba(227,30,36,0.2)]" : "border-ink-700"
        }`}
        style={{ height: heightPx, background: "#0B0E14" }}
      >
        {width > 0 && (
          <Epg {...getEpgProps()}>
            <Layout
              {...getLayoutProps()}
              renderProgram={({ program, isBaseTimeFormat }) => (
                <BalafonProgram
                  key={program.data.id}
                  program={program}
                  isBaseTimeFormat={isBaseTimeFormat}
                  mode={mode}
                  onSelect={onSelectItem}
                  onRemove={onRemoveItem}
                  onMissingClick={onMissingClick}
                />
              )}
              renderChannel={({ channel }) => <BalafonChannel key={channel.uuid} channel={channel} />}
              renderTimeline={(tl) => <BalafonTimeline key="tl" {...tl} />}
            />
          </Epg>
        )}

        {/* Playhead rouge — synchronisé sur l'heure simulée */}
        {playheadX !== null && (
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-30"
            style={{ left: playheadX }}
            aria-hidden
          >
            <div className="h-full w-[2px] bg-balafon shadow-[0_0_10px_rgba(227,30,36,0.85)]" />
            <div className="absolute left-1/2 top-1 -translate-x-1/2 rounded bg-balafon px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
              {formatClock(now).slice(0, 5)}
            </div>
          </div>
        )}

        {dropHover && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-balafon/5">
            <span className="rounded-lg border border-balafon/60 bg-ink-900/90 px-4 py-2 text-[13px] font-bold text-paper">
              Déposer pour planifier à cette heure
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** "23:00 – 24:00" : une fin à minuit se note 24:00 côté antenne */
function endLabel(d: PlanbyEpgData): string {
  const end = d.till.slice(11, 16);
  const start = d.since.slice(11, 16);
  return end === "00:00" && start !== "00:00" ? "24:00" : end;
}

function nextDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate()
  ).padStart(2, "0")}`;
}

function AdminLegend() {
  return (
    <div className="hidden items-center gap-3 text-[10.5px] font-semibold uppercase tracking-wide text-mist lg:flex">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-balafon" aria-hidden /> Live
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-studio" aria-hidden /> Validé
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-goldwarn" aria-hidden /> Brouillon
      </span>
      <span className="flex items-center gap-1.5">
        <span className="hatch-red h-2.5 w-2.5 rounded-sm border border-crit" aria-hidden /> Trou
      </span>
    </div>
  );
}

/* ============================================================
   Fallback mobile : liste verticale de la journée
   ============================================================ */
function MobileDayList({
  date,
  mode,
  epg,
  now,
  showControls,
  onSelectItem,
  onMissingClick,
  onScrollToNow,
}: {
  date: string;
  mode: EpgMode;
  epg: PlanbyEpgData[];
  now: Date;
  showControls: boolean;
  onSelectItem?: (data: PlanbyEpgData) => void;
  onMissingClick?: (data: PlanbyEpgData) => void;
  onScrollToNow: () => void;
}) {
  const rows = useMemo(() => {
    if (mode === "admin") return epg.filter((d) => toMinutes(d.till.slice(11, 16)) > 360 || d.isMissing);
    return epg;
  }, [epg, mode]);

  return (
    <div>
      {showControls && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-mist">
            <List size={14} aria-hidden /> Vue liste (mobile)
          </span>
          <button
            type="button"
            onClick={onScrollToNow}
            className="flex items-center gap-1.5 rounded-lg bg-balafon px-3 py-1.5 text-[12px] font-bold text-white"
          >
            <LocateFixed size={13} aria-hidden /> Maintenant
          </button>
        </div>
      )}
      <ul className="space-y-2">
        {rows.map((d) => {
          const meta = CATEGORY_META[d.category];
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => (d.isMissing ? onMissingClick?.(d) : onSelectItem?.(d))}
                disabled={d.isMissing && !onMissingClick}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  d.isMissing
                    ? "hatch-red border-crit/70 bg-crit/5"
                    : d.isLive
                    ? "border-balafon/70 bg-ink-800"
                    : "border-ink-700 bg-ink-800 hover:border-ink-500"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] tabular-nums text-mist">
                    {d.since.slice(11, 16)} – {endLabel(d)}
                  </span>
                  {d.isLive && (
                    <span className="live-pulse rounded bg-balafon px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white">
                      En direct
                    </span>
                  )}
                  {d.isMissing && (
                    <span className="rounded bg-crit/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-crit">
                      Programme manquant
                    </span>
                  )}
                  {d.isRerun && (
                    <span className="rounded bg-goldwarn/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-goldwarn">
                      Rediffusion
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[14px] font-bold text-paper">{d.title}</p>
                {!d.isMissing && (
                  <p
                    className="mt-0.5 inline-block rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: meta?.soft, color: meta?.color }}
                  >
                    {meta?.label}
                  </p>
                )}
                {d.isLive && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-600">
                    <div className="h-full bg-balafon" style={{ width: `${Math.round(d.progress)}%` }} />
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

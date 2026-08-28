import { ProgramBox, ProgramContent, useProgram } from "planby";
import type { Program as PlanbyProgramType } from "planby";
import { AlertTriangle, Moon, Play, Repeat, Trash2 } from "lucide-react";
import type { PlanbyEpgData, EpgMode } from "./planbyMappers";
import { CATEGORY_META } from "../../types";
import { durationLabel, formatHM } from "../../utils/time";

/* Planby 2.x n'exporte pas le type interne de l'élément positionné :
   on le redéfinit structurellement ({ position, data }). */
export interface BalafonProgramItem {
  position: { width: number; height: number; top: number; left: number };
  data: PlanbyProgramType;
}

interface Props {
  program: BalafonProgramItem;
  isBaseTimeFormat: boolean;
  mode: EpgMode;
  onSelect?: (data: PlanbyEpgData) => void;
  onRemove?: (scheduleId: string) => void;
  onMissingClick?: (data: PlanbyEpgData) => void;
}

/* ============================================================
   Rendu personnalisé d'un programme dans l'EPG Planby.
   États : direct (rouge) · validé (vert) · brouillon (or) ·
   trou (hachuré rouge) · hors antenne · rediffusion.
   ============================================================ */
export function BalafonProgram({ program, isBaseTimeFormat, mode, onSelect, onRemove, onMissingClick }: Props) {
  const { styles } = useProgram({ program, isBaseTimeFormat, minWidth: 150 });
  const data = program.data as unknown as PlanbyEpgData;
  const width = styles.width;
  const meta = CATEGORY_META[data.category];
  const narrow = width < 84;
  const mid = width < 160;
  const timeLabel = `${formatHM(data.since)} – ${formatHM(data.till)}`;

  const clickable = !data.isMissing && Boolean(onSelect);

  const inner = data.isMissing ? (
    /* ---- Trou de grille : zone hachurée rouge ---- */
    <div
      className={`hatch-red absolute inset-0 rounded-lg border border-crit/70 p-2 text-left ${
        onMissingClick ? "cursor-pointer transition-colors hover:border-crit" : ""
      }`}
      style={{ background: "rgba(239,68,68,0.06)" }}
      onClick={onMissingClick ? () => onMissingClick(data) : undefined}
      role={onMissingClick ? "button" : undefined}
      tabIndex={onMissingClick ? 0 : undefined}
      onKeyDown={
        onMissingClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onMissingClick(data);
              }
            }
          : undefined
      }
      aria-label={onMissingClick ? `Compléter le créneau ${timeLabel}` : undefined}
    >
      <div className="flex items-center gap-1.5 text-crit">
        <AlertTriangle size={13} aria-hidden />
        {!narrow && (
          <span className="text-[12px] font-bold uppercase tracking-wide">Programme manquant</span>
        )}
      </div>
      {!narrow && (
        <p className="mt-1 font-mono text-[11px] leading-snug text-crit/90">
          {timeLabel}
          <span className="block text-crit/70">{durationLabel(data.durationMinutes)}</span>
        </p>
      )}
      {!narrow && (
        <p className="mt-1 text-[10px] text-mist">Glissez un programme ici (Admin)</p>
      )}
    </div>
  ) : data.isOffAir ? (
    /* ---- Hors antenne ---- */
    <div className="absolute inset-0 rounded-lg border border-ink-600/60 bg-[#0a0d14] p-2 text-left">
      <div className="flex items-center gap-1.5 text-mist-dark">
        <Moon size={13} aria-hidden />
        {!narrow && (
          <span className="text-[12px] font-bold uppercase tracking-wide text-mist">
            Hors antenne
          </span>
        )}
        {data.isLive && <LiveDot compact={narrow} />}
      </div>
      {!narrow && (
        <p className="mt-1 font-mono text-[11px] text-mist-dark">{timeLabel}</p>
      )}
      {!mid && (
        <p className="mt-0.5 text-[11px] leading-snug text-mist-dark">
          Aucune diffusion planifiée
        </p>
      )}
    </div>
  ) : (
    /* ---- Programme réel ---- */
    <div
      className="group/card absolute inset-0 overflow-hidden rounded-lg border bg-ink-800 p-2 text-left transition-all duration-200 hover:bg-ink-700"
      style={{
        borderColor: data.isLive ? "rgba(255,61,0,0.75)" : "rgba(42,49,66,0.9)",
        boxShadow: data.isLive ? "0 0 0 1px rgba(255,61,0,0.35), 0 6px 18px rgba(255,61,0,0.12)" : undefined,
      }}
    >
      <span
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: meta?.color ?? "#9CA3AF" }}
        aria-hidden
      />
      <div className="flex h-full flex-col pl-2">
        <div className="flex items-center gap-1.5">
          {data.isLive && <LiveDot compact={narrow} />}
          {data.isRerun && !narrow && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-goldwarn/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-goldwarn">
              <Repeat size={9} aria-hidden /> Rediff.
            </span>
          )}
          {mode === "admin" && data.gridStatus === "validated" && !narrow && (
            <span className="rounded-sm bg-studio/12 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-studio">
              Validé
            </span>
          )}
          {mode === "admin" && data.gridStatus === "draft" && !narrow && (
            <span className="rounded-sm bg-goldwarn/12 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-goldwarn">
              Brouillon
            </span>
          )}
        </div>
        <p
          className="mt-0.5 truncate text-[13px] font-bold leading-tight text-paper"
          title={data.title}
        >
          {data.title}
        </p>
        {!narrow && (
          <p className="font-mono text-[11px] text-mist">
            {timeLabel}
            {mid ? "" : ` · ${durationLabel(data.durationMinutes)}`}
          </p>
        )}
        {!mid && (
          <div className="mt-auto flex items-center justify-between gap-2 pb-0.5">
            <span
              className="rounded-sm px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide"
              style={{ background: meta?.soft, color: meta?.color }}
            >
              {meta?.label}
            </span>
            {mode === "admin" && onRemove && !data.isOffAir && (
              <button
                type="button"
                aria-label={`Retirer ${data.title} de la grille`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(data.scheduleId);
                }}
                className="rounded p-0.5 text-mist opacity-0 transition-opacity hover:bg-crit/20 hover:text-crit focus-visible:opacity-100 group-hover/card:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            )}
            {mode !== "admin" && !data.isOffAir && (
              <span className="flex items-center gap-1 rounded bg-balafon/15 px-1.5 py-px text-[10px] font-bold text-balafon opacity-0 transition-opacity group-hover/card:opacity-100">
                <Play size={9} aria-hidden /> Détails
              </span>
            )}
          </div>
        )}
      </div>
      {/* Barre de progression du direct */}
      {data.isLive && (
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-ink-600" aria-hidden>
          <div
            className="h-full bg-balafon transition-[width] duration-700"
            style={{ width: `${Math.round(data.progress)}%` }}
          />
        </div>
      )}
    </div>
  );

  return (
    <ProgramBox width={width} style={styles.position}>
      <ProgramContent
        width={width}
        isLive={data.isLive}
        onClick={clickable ? () => onSelect?.(data) : undefined}
        aria-label={`${data.title}, ${timeLabel}`}
      >
        <div className="pointer-events-none absolute inset-0" />
        <div className="absolute inset-0">{inner}</div>
      </ProgramContent>
    </ProgramBox>
  );
}

function LiveDot({ compact }: { compact?: boolean }) {
  return (
    <span
      className="live-pulse inline-flex items-center gap-1 rounded-sm bg-balafon px-1 py-px text-[9px] font-extrabold uppercase tracking-wider text-white"
      aria-label="En direct"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
      {compact ? "" : "Direct"}
    </span>
  );
}

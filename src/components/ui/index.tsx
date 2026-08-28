import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, Timer, X, XCircle } from "lucide-react";
import { useAppStore, type ToastItem } from "../../store/appStore";
import { addDaysKey, labelDay, todayKey } from "../../utils/time";

/* ============================================================
   Primitives UI — Balafon Studio
   ============================================================ */

type ButtonVariant = "primary" | "green" | "outline" | "ghost" | "danger" | "gold";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";
  const sizes = {
    sm: "px-2.5 py-1.5 text-[12px]",
    md: "px-3.5 py-2 text-[13px]",
    lg: "px-5 py-2.5 text-[14px]",
  };
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-balafon text-white hover:bg-balafon-soft shadow-[0_4px_18px_rgba(255,61,0,0.3)]",
    green: "bg-studio text-ink-950 hover:brightness-110 shadow-[0_4px_18px_rgba(0,245,160,0.25)]",
    outline: "border border-ink-600 bg-ink-800 text-paper hover:border-ink-500 hover:bg-ink-700",
    ghost: "text-mist hover:bg-ink-700 hover:text-paper",
    danger: "bg-crit/15 text-crit border border-crit/40 hover:bg-crit/25",
    gold: "bg-goldwarn/15 text-goldwarn border border-goldwarn/40 hover:bg-goldwarn/25",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Badge({
  color,
  soft,
  children,
  className = "",
}: {
  color: string;
  soft: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide ${className}`}
      style={{ color, background: soft }}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, color = "#FF3D00" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-600" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-600 bg-ink-800/40 px-6 py-12 text-center">
      <div className="mb-3 text-mist-dark">{icon}</div>
      <p className="font-display text-[15px] font-bold text-paper">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-[12.5px] text-mist">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- Modale ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  tone = "default",
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  tone?: "default" | "critical";
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`w-full ${width} overflow-hidden rounded-2xl border shadow-2xl ${
              tone === "critical" ? "border-crit/60 bg-[#160b0d]" : "border-ink-600 bg-ink-800"
            }`}
          >
            <div
              className={`flex items-center justify-between gap-3 border-b px-5 py-4 ${
                tone === "critical" ? "border-crit/30" : "border-ink-700"
              }`}
            >
              <h2 className={`font-display text-[16px] font-extrabold ${tone === "critical" ? "text-crit" : "text-paper"}`}>
                {title}
              </h2>
              <button
                type="button"
                aria-label="Fermer la fenêtre"
                onClick={onClose}
                className="rounded-lg p-1.5 text-mist transition-colors hover:bg-ink-700 hover:text-paper"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ---------- Drawer latéral ---------- */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="absolute bottom-0 right-0 top-0 flex w-[92vw] max-w-sm flex-col border-l border-ink-600 bg-ink-900"
          >
            <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3.5">
              <h2 className="font-display text-[15px] font-extrabold text-paper">{title}</h2>
              <button
                type="button"
                aria-label="Fermer le panneau"
                onClick={onClose}
                className="rounded-lg p-1.5 text-mist hover:bg-ink-700 hover:text-paper"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ---------- Sélecteur de jours (7 jours glissants) ---------- */
export function DaySelector({
  value,
  onChange,
  startOffset = 0,
  days = 7,
}: {
  value: string;
  onChange: (date: string) => void;
  startOffset?: number;
  days?: number;
}) {
  const today = todayKey();
  const list = Array.from({ length: days }, (_, i) => addDaysKey(today, startOffset + i));
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Choisir un jour">
      {list.map((d) => {
        const active = d === value;
        const isToday = d === today;
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(d)}
            className={`shrink-0 rounded-lg border px-3 py-2 text-left transition-all ${
              active
                ? "border-balafon bg-balafon/15 shadow-[0_0_14px_rgba(255,61,0,0.2)]"
                : "border-ink-600 bg-ink-800 hover:border-ink-500 hover:bg-ink-700"
            }`}
          >
            <span className={`block text-[11px] font-extrabold uppercase tracking-wide ${active ? "text-balafon" : "text-mist"}`}>
              {labelDay(d, { short: true })}
            </span>
            <span className="mt-0.5 block font-mono text-[10.5px] tabular-nums text-mist-dark">
              {d.slice(8, 10)}/{d.slice(5, 7)}
              {isToday ? " ·auj." : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Horloge de démonstration ---------- */
export function SimClock({ compact = false }: { compact?: boolean }) {
  const offset = useAppStore((s) => s.simOffsetMin);
  const setOffset = useAppStore((s) => s.setSimOffset);
  const toast = useAppStore((s) => s.toast);

  const apply = (v: number, silent = false) => {
    setOffset(v);
    if (!silent && v !== 0)
      toast({
        title: "Heure de démonstration modifiée",
        message: `Horloge simulée décalée de ${v > 0 ? "+" : ""}${v} min. Le direct, le playhead et la régie suivent cette heure.`,
        tone: "info",
      });
  };

  return (
    <div className={`rounded-xl border border-ink-600 bg-ink-800 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-mist">
          <Timer size={13} className="text-goldwarn" aria-hidden /> Horloge de démonstration
        </span>
        <span className={`font-mono tabular-nums ${offset === 0 ? "text-mist-dark" : "text-goldwarn"}`}>
          {offset === 0 ? "temps réel" : `${offset > 0 ? "+" : ""}${offset} min`}
        </span>
      </div>
      <input
        type="range"
        min={-480}
        max={480}
        step={15}
        value={offset}
        onChange={(e) => apply(Number(e.target.value), true)}
        aria-label="Décaler l'heure simulée"
        className="mt-3 w-full accent-[#FFB800]"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[
          { label: "Réel", v: 0 },
          { label: "+1 h", v: 60 },
          { label: "+3 h", v: 180 },
          { label: "+6 h", v: 360 },
          { label: "18:00*", v: "evening" },
        ].map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              if (p.v === "evening") {
                const d = new Date();
                const target = 18 * 60 - (d.getHours() * 60 + d.getMinutes());
                apply(target);
              } else apply(p.v as number);
            }}
            className={`rounded-md border px-2 py-1 font-mono text-[11px] font-bold transition-colors ${
              (p.v === "evening" ? false : offset === p.v)
                ? "border-goldwarn/60 bg-goldwarn/15 text-goldwarn"
                : "border-ink-600 text-mist hover:border-ink-500 hover:text-paper"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10.5px] leading-snug text-mist-dark">
        * Simule un prime time de 18 h. Le décalage est persisté et partagé par tout le studio.
      </p>
    </div>
  );
}

/* ---------- Toasts ---------- */
function ToastCard({ toast }: { toast: ToastItem }) {
  const dismiss = useAppStore((s) => s.dismissToast);
  const ref = useRef<number>(0);
  useEffect(() => {
    ref.current = window.setTimeout(() => dismiss(toast.id), toast.action ? 7000 : 4500);
    return () => window.clearTimeout(ref.current);
  }, [toast, dismiss]);

  const icons = {
    success: <CheckCircle2 size={16} className="text-studio" aria-hidden />,
    error: <XCircle size={16} className="text-crit" aria-hidden />,
    warning: <AlertTriangle size={16} className="text-goldwarn" aria-hidden />,
    info: <Info size={16} className="text-sysblue" aria-hidden />,
  };
  const border = {
    success: "border-studio/50",
    error: "border-crit/50",
    warning: "border-goldwarn/50",
    info: "border-sysblue/50",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 30, scale: 0.96 }}
      role="status"
      className={`pointer-events-auto w-full max-w-sm rounded-xl border ${border[toast.tone]} bg-ink-800/95 p-3 shadow-2xl backdrop-blur`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0">{icons[toast.tone]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-paper">{toast.title}</p>
          {toast.message && <p className="mt-0.5 text-[12px] leading-snug text-mist">{toast.message}</p>}
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                dismiss(toast.id);
              }}
              className="mt-2 rounded-md border border-ink-500 bg-ink-700 px-2.5 py-1 text-[11.5px] font-bold text-paper transition-colors hover:border-balafon hover:text-balafon"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Fermer la notification"
          onClick={() => dismiss(toast.id)}
          className="shrink-0 rounded p-1 text-mist-dark hover:text-paper"
        >
          <X size={13} />
        </button>
      </div>
    </motion.div>
  );
}

export function ToastHost() {
  const toasts = useAppStore((s) => s.toasts);
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[94vw] max-w-sm flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

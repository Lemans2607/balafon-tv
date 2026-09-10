import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Check, Info, Moon, Sun, X, type LucideIcon } from "lucide-react";
import type { Categorie, Role, StatutGrille } from "../types";
import { CATS, JOURS_COURT, ROLES, STATUTS } from "../utils/epg";
import { useTheme } from "../state/themeStore";

/* ——— Logo « Balafon + Guide » (navbar, Studio, footer, connexion, EPG) ——— */

export function LogoBalafon({
  compact = false,
  clair = false,
}: {
  compact?: boolean;
  /** true = texte blanc forcé (sur surfaces toujours sombres : portail, sidebar, login) */
  clair?: boolean;
}) {
  const titre = clair ? "text-white" : "text-ink";
  return (
    <span className="inline-flex items-center gap-2 select-none" aria-label="Balafon + Guide">
      <svg width={compact ? 26 : 32} height={compact ? 26 : 32} viewBox="0 0 64 64" aria-hidden="true" className="flex-none">
        <rect width="64" height="64" rx="15" fill="#FF3D00" />
        <text x="32" y="44" fontFamily="Arial, Helvetica, sans-serif" fontSize="36" fontWeight="800" fill="#fff" textAnchor="middle">
          B
        </text>
        <rect x="15" y="49" width="22" height="4.5" rx="2.25" fill="#fff" opacity=".9" />
        <rect x="41" y="49" width="8" height="4.5" rx="2.25" fill="#fff" opacity=".55" />
      </svg>
      <span className="leading-none">
        <span className={`font-display font-extrabold tracking-tight block ${titre}`} style={{ fontSize: compact ? 15 : 18 }}>
          Balafon<span className="text-bred font-black"> + </span>Guide
        </span>
        {!compact && (
          <span className={`block text-[8.5px] font-bold uppercase tracking-[0.3em] mt-1 ${clair ? "text-white/35" : "text-inkfaint"}`}>
            Balafon TV · Douala
          </span>
        )}
      </span>
    </span>
  );
}

/** Bascule clair / sombre (topbar Studio). */
export function ThemeToggle() {
  const { theme, basculer } = useTheme();
  return (
    <button
      onClick={basculer}
      className="grid place-items-center w-9 h-9 rounded-lg border border-line text-inksoft hover:text-ink hover:border-line2 transition-colors"
      title={theme === "light" ? "Passer en sombre" : "Passer en clair"}
      aria-label="Basculer le thème"
    >
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}

/* ——— Chips & badges ——— */

export function CatChip({ cat, compact = false }: { cat: Categorie; compact?: boolean }) {
  const c = CATS[cat];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-bold ${compact ? "text-[9.5px] px-1.5 py-0.5" : "text-[11px] px-2 py-1"}`}
      style={{ color: c.color, background: `${c.color}1a`, border: `1px solid ${c.color}40` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

export function StatutChip({ statut, compact = false }: { statut: StatutGrille; compact?: boolean }) {
  const s = STATUTS[statut];
  const vert = statut === "validee";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-bold ${compact ? "text-[9.5px] px-1.5 py-0.5" : "text-[11px] px-2 py-1"}`}
      style={{
        color: s.color,
        background: `${s.color}14`,
        border: `1px solid ${s.color}45`,
      }}
    >
      {vert ? (
        <Check size={compact ? 10 : 12} />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full flex-none ${statut === "brouillon" ? "" : "animate-pulse"}`} style={{ background: s.color }} />
      )}
      {s.label}
    </span>
  );
}

export function GoldChip({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-bold text-gold border border-gold/40 bg-gold/10 ${compact ? "text-[9.5px] px-1.5 py-0.5" : "text-[10.5px] px-2 py-0.5"}`}
    >
      <span className="w-1 h-1 rounded-full bg-gold" /> {label}
    </span>
  );
}

export function RoleChip({ role }: { role: Role }) {
  const r = ROLES[role];
  const color = role === "regie" ? "#FF3D00" : role === "directeur" ? "#00A86B" : "#B26A00";
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2 py-0.5 rounded" style={{ color, background: `${color}14`, border: `1px solid ${color}40` }}>
      {r.label}
    </span>
  );
}

/* ——— Onglets de jours ——— */

export function OngletsJours({
  actif,
  onChange,
  etats,
  soulignerAujourdhui,
}: {
  actif: number;
  onChange: (i: number) => void;
  etats?: ("complet" | "trous" | "vide")[];
  soulignerAujourdhui?: number;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Jours de la semaine">
      {JOURS_COURT.map((j, i) => {
        const actifI = i === actif;
        const etat = etats?.[i];
        return (
          <button
            key={j}
            role="tab"
            aria-selected={actifI}
            onClick={() => onChange(i)}
            className={`flex-none inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-[12.5px] font-bold transition-all duration-200 ${
              actifI
                ? "bg-bred border-bred text-white shadow-glow-red"
                : soulignerAujourdhui === i
                ? "bg-pane border-gold/50 text-gold hover:border-gold/80"
                : "bg-pane border-line text-inksoft hover:border-line2 hover:text-ink"
            }`}
          >
            {j}
            {etat && !actifI && (
              <span className={`w-1.5 h-1.5 rounded-full ${etat === "complet" ? "bg-sgreen" : etat === "trous" ? "bg-bred animate-blink-alert" : "bg-line2"}`} />
            )}
            {etat && actifI && <span className={`w-1.5 h-1.5 rounded-full bg-white ${etat === "vide" ? "opacity-40" : ""}`} />}
          </button>
        );
      })}
    </div>
  );
}

/* ——— Modale ——— */

export function Modale({
  ouvert,
  onFermer,
  titre,
  sousTitre,
  children,
  footer,
  largeur = "max-w-lg",
  ton = "neutre",
}: {
  ouvert: boolean;
  onFermer: () => void;
  titre: string;
  sousTitre?: string;
  children: ReactNode;
  footer?: ReactNode;
  largeur?: string;
  ton?: "neutre" | "rouge";
}) {
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ouvert, onFermer]);

  if (!ouvert) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px] animate-fade" onClick={onFermer} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${largeur} max-h-[88vh] overflow-y-auto rounded-xl shadow-pop animate-scale-in glass-pane ${
          ton === "rouge" ? "!border-bred/50" : ""
        }`}
      >
        {ton === "rouge" && <span className="absolute inset-x-0 top-0 h-[3px] bg-bred rounded-t-xl" />}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
          <div>
            <h2 className="font-display text-[17px] font-extrabold tracking-tight text-ink">{titre}</h2>
            {sousTitre && <p className="text-[12px] text-inkdim mt-0.5">{sousTitre}</p>}
          </div>
          <button
            onClick={onFermer}
            className="grid place-items-center w-8 h-8 rounded-lg text-inkfaint hover:text-ink hover:bg-pane2 transition-colors"
            aria-label="Fermer"
          >
            <X size={17} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-line">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({
  ouvert,
  titre,
  message,
  confirmLabel = "Confirmer",
  annulerLabel = "Annuler",
  danger = true,
  loading = false,
  onAnnuler,
  onConfirmer,
}: {
  ouvert: boolean;
  titre: string;
  message: ReactNode;
  confirmLabel?: string;
  annulerLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onAnnuler: () => void;
  onConfirmer: () => void;
}) {
  return (
    <Modale ouvert={ouvert} onFermer={onAnnuler} titre={titre} ton={danger ? "rouge" : "neutre"}>
      <div className="flex items-start gap-3.5">
        <span className={`grid place-items-center w-10 h-10 rounded-lg flex-none ${danger ? "bg-bred/15 text-bred" : "bg-sgreen/15 text-sgreen"}`}>
          <AlertTriangle size={19} />
        </span>
        <p className="text-[13.5px] text-inksoft leading-relaxed">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2.5">
        <button onClick={onAnnuler} className="px-4 py-2 rounded-lg border border-line text-[13px] font-semibold text-inksoft hover:bg-pane2 transition-colors">
          {annulerLabel}
        </button>
        <button
          onClick={onConfirmer}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${
            danger ? "bg-bred hover:bg-bred2 text-white shadow-glow-red" : "bg-sgreen hover:brightness-110 !text-night"
          }`}
        >
          {loading && <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modale>
  );
}

/* ——— Toasts (surface sombre dans les deux thèmes, pour rester lisibles partout) ——— */

type ToastType = "succes" | "erreur" | "info" | "alerte";
interface Toast {
  id: number;
  type: ToastType;
  titre: string;
  message?: string;
}
const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

const T_META: Record<ToastType, { Icon: LucideIcon; bar: string; icon: string }> = {
  succes: { Icon: Check, bar: "bg-sgreen", icon: "text-sgreen" },
  erreur: { Icon: AlertTriangle, bar: "bg-bred", icon: "text-bred" },
  info: { Icon: Info, bar: "bg-[#3D9BFF]", icon: "text-[#3D9BFF]" },
  alerte: { Icon: AlertTriangle, bar: "bg-gold", icon: "text-gold" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[95] flex flex-col gap-2 w-[min(370px,calc(100vw-2rem))]">
        {toasts.map((t) => {
          const m = T_META[t.type];
          return (
            <div key={t.id} className="relative overflow-hidden flex items-start gap-3 toast-dark rounded-xl shadow-pop pl-4 pr-3 py-3 animate-rise" role="status">
              <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${m.bar}`} />
              <m.Icon size={17} className={`${m.icon} mt-0.5 flex-none`} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-white leading-snug">{t.titre}</p>
                {t.message && <p className="text-[12px] text-white/55 mt-0.5 leading-snug">{t.message}</p>}
              </div>
              <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="text-white/35 hover:text-white transition-colors mt-0.5" aria-label="Fermer">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast doit être utilisé sous <ToastProvider>");
  return ctx;
}

/* ——— Barre de progression ——— */

export function ProgressBar({
  value,
  color = "var(--color-bred)",
  striped = false,
  className = "h-[5px]",
}: {
  value: number;
  color?: string;
  striped?: boolean;
  className?: string;
}) {
  return (
    <div className={`w-full rounded-full bg-line2/40 overflow-hidden ${className}`}>
      <div
        className="relative h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      >
        {striped && <span className="absolute inset-0 stripes-dark" style={{ animation: "shimmer 1.2s linear infinite" }} />}
      </div>
    </div>
  );
}

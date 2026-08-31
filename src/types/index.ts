/* ============================================================
   BALAFON + GUIDE — Types métier
   Balafon Media Group · Balafon TV (Cameroun)
   ============================================================ */

export type ProgramCategory =
  | "news"
  | "talk"
  | "entertainment"
  | "culture"
  | "sport"
  | "documentary"
  | "series"
  | "music"
  | "commercial"
  | "rerun"
  | "off-air";

export type ProgramStatus =
  | "draft"
  | "pending"
  | "validated"
  | "live"
  | "completed"
  | "cancelled";

/** Deux rôles métier : le Directeur d'Antenne EST l'admin de la plateforme. */
export type UserRole = "directeur" | "regie";
export type AppRole = "public" | UserRole;

export type GridStatus = "draft" | "pending" | "validated";

export interface Program {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  category: ProgramCategory;
  durationMinutes: number;
  posterUrl: string;
  backdropUrl?: string;
  status: ProgramStatus;
  isLive?: boolean;
  isReplayAvailable?: boolean;
  tags: string[];
  /** Fiabilité de l'horaire (catalogue réel Balafon TV) */
  fiabilite?: "confirme" | "estime";
}

export interface ScheduleItem {
  id: string;
  programId: string;
  channelId: "balafon-tv";
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm ("24:00" = minuit fin de journée)
  status: GridStatus | "live" | "completed";
  source: "admin" | "director" | "import";
  lastModifiedBy?: string;
  updatedAt: string; // ISO
}

export interface GridInfo {
  date: string;
  status: GridStatus;
  author: string;
  updatedAt: string;
  published?: boolean;
}

export interface Alert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  createdAt: string; // ISO
  source: "director" | "admin" | "vmix" | "system";
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  relatedScheduleId?: string;
  actionRequired?: boolean;
}

export interface LogEntry {
  id: string;
  at: string; // ISO
  user: string;
  role: AppRole;
  action: string;
  details: string;
  severity: "info" | "warning" | "critical";
  date?: string; // grille concernée
}

export interface ScheduleGap {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  initials: string;
}

/* ============================================================
   Métadonnées d'affichage (libellés + couleurs sémantiques)
   ============================================================ */

export const CATEGORY_META: Record<
  ProgramCategory,
  { label: string; color: string; soft: string }
> = {
  news: { label: "Information", color: "#E31E24", soft: "rgba(227,30,36,0.14)" },
  talk: { label: "Débat & Talk", color: "#3B82F6", soft: "rgba(59,130,246,0.14)" },
  entertainment: { label: "Divertissement", color: "#FFB800", soft: "rgba(255,184,0,0.14)" },
  culture: { label: "Culture", color: "#00F5A0", soft: "rgba(0,245,160,0.12)" },
  sport: { label: "Sport", color: "#34D399", soft: "rgba(52,211,153,0.13)" },
  documentary: { label: "Documentaire", color: "#A78BFA", soft: "rgba(167,139,250,0.14)" },
  series: { label: "Série & Cinéma", color: "#F472B6", soft: "rgba(244,114,182,0.14)" },
  music: { label: "Musique", color: "#22D3EE", soft: "rgba(34,211,238,0.13)" },
  commercial: { label: "Écran publicitaire", color: "#9CA3AF", soft: "rgba(156,163,175,0.12)" },
  rerun: { label: "Rediffusion", color: "#F59E0B", soft: "rgba(245,158,11,0.13)" },
  "off-air": { label: "Hors antenne", color: "#6B7280", soft: "rgba(107,114,128,0.14)" },
};

export const STATUS_META: Record<
  GridStatus,
  { label: string; color: string; soft: string }
> = {
  draft: { label: "Brouillon", color: "#FFB800", soft: "rgba(255,184,0,0.14)" },
  pending: { label: "En attente de validation", color: "#3B82F6", soft: "rgba(59,130,246,0.14)" },
  validated: { label: "Validée pour diffusion", color: "#00F5A0", soft: "rgba(0,245,160,0.12)" },
};

export const SEVERITY_META: Record<
  Alert["severity"],
  { label: string; color: string; soft: string }
> = {
  info: { label: "Info", color: "#3B82F6", soft: "rgba(59,130,246,0.14)" },
  warning: { label: "Attention", color: "#FFB800", soft: "rgba(255,184,0,0.14)" },
  critical: { label: "Action requise", color: "#EF4444", soft: "rgba(239,68,68,0.16)" },
};

export const CHANNEL_ID = "balafon-tv" as const;

/* ——— Modèle métier « Balafon+ Guide » ——— */

/* Compatibilité entre les modules historiques et le modèle actuel. */
export {
  CATEGORY_META,
  CHANNEL_ID,
  SEVERITY_META,
  STATUS_META,
} from "./types/index";
export type {
  Alert,
  AppRole,
  GridInfo,
  GridStatus,
  Program,
  ProgramCategory,
  ProgramStatus,
  ScheduleGap,
  ScheduleItem,
  UserAccount,
  UserRole,
} from "./types/index";

export type Role = "admin" | "directeur" | "regie";

export type Categorie =
  | "information"
  | "divertissement"
  | "sport"
  | "culture"
  | "film"
  | "jeunesse";

export type TypeDiffusion = "direct" | "enregistre" | "rediffusion";

export type StatutGrille = "brouillon" | "en_attente" | "validee";

/** Programme de la bibliothèque (source du drag & drop). */
export interface Programme {
  id: string;
  titre: string;
  categorie: Categorie;
  duree: number; // minutes — multiple de 30
  type: TypeDiffusion;
  description: string;
  image?: string;
}

/** Bloc placé sur la timeline EPG (slot de 30 min, 06:00 → 24:00). */
export interface BlocPlace {
  id: string;
  programmeId: string;
  slot: number; // 0 = 06:00 … 35 = 23:30
}

/** Une grille = une semaine complète de Balafon TV (7 jours). */
export interface Grille {
  id: string;
  nom: string;
  semaine: string; // libellé affiché
  statut: StatutGrille;
  jours: BlocPlace[][]; // index 0 = Lundi … 6 = Dimanche
  antenne: boolean; // grille actuellement diffusée (miroir régie + portail)
  creePar: string;
  majLe: number;
}

/** Alerte temps réel destinée à la Régie de diffusion. */
export interface Alerte {
  id: string;
  ts: number;
  heure: string; // HH:MM de l'événement
  texte: string;
  acquittee: boolean;
}

/** Journal tracé des modifications (audit). */
export interface LogEntry {
  id: string;
  ts: number;
  acteur: Role | "systeme";
  action: string;
}

export interface Db {
  version: number;
  grilles: Grille[];
  alertes: Alerte[];
  log: LogEntry[];
}

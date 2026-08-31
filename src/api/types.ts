/* ============================================================
   Types TypeScript — miroir du schéma OpenAPI Django (drf-spectacular).
   Cohérents avec backend/programmation/models.py, comptes, alertes.
   ============================================================ */

export type RoleBackend = "administrateur" | "directeur_antenne" | "diffuseur";

export type StatutGrille = "brouillon" | "en_validation" | "validee";

export type GenreEmission =
  | "info"
  | "divertissement"
  | "sport"
  | "culture"
  | "musique"
  | "religion"
  | "jeunesse"
  | "talk"
  | "serie"
  | "magazine"
  | "autre";

export interface Utilisateur {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: RoleBackend;
  role_display: string;
  fonction?: string;
  poste_regie?: string;
  date_joined?: string;
}

export interface Chaine {
  id: number;
  nom: string;
  slug: string;
  type: "tv" | "radio";
  actif: boolean;
}

export interface Emission {
  id: number;
  grille: number;
  titre: string;
  genre: GenreEmission;
  description?: string;
  /** ISO 8601 renvoyé par DRF */
  heure_debut: string;
  heure_fin: string;
}

export interface Grille {
  id: number;
  chaine: number;
  chaine_detail?: Chaine;
  date_debut: string;
  date_fin: string;
  statut: StatutGrille;
  statut_display?: string;
  date_creation?: string;
  date_validation?: string | null;
  cree_par?: number | null;
  cree_par_nom?: string;
  valide_par?: number | null;
  emissions?: Emission[];
}

export type TypeAlerte =
  | "modification_derniere_minute"
  | "grille_incomplete"
  | "validation"
  | "synchro_vmix"
  | "autre";

export interface Alerte {
  id: number;
  type: TypeAlerte;
  type_display?: string;
  message: string;
  date_envoi: string;
  statut_lecture: boolean;
  grille_id?: number | null;
}

export interface SynchroVmixResultat {
  grille_id: number;
  statut: "en_attente" | "succes" | "echec";
  reponse_vmix: Record<string, unknown>;
  date_synchro: string;
}

export interface ReponseConnexion {
  access: string;
  refresh: string;
  utilisateur: Utilisateur;
}

/* Structure paginée DRF (PageNumberPagination) */
export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

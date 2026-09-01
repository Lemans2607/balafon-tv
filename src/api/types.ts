/* ============================================================
   Types TypeScript — miroir du schéma OpenAPI Django (drf-spectacular).
   Cohérents avec backend/programmation/models.py, comptes, alertes.
   ============================================================ */

/**
 * Rôles métier — source de vérité unique côté frontend (champ `role` du backend).
 * Le Directeur d'Antenne EST l'administrateur : il n'existe pas de rôle admin séparé.
 */
export type RoleBackend = "directeur_antenne" | "diffuseur";

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
  /** Rôle métier (source de vérité) : directeur_antenne | diffuseur */
  role: RoleBackend;
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
  /** Lien vers l'affiche affichée sur le frontend (vignettes EPG). */
  image_affiche?: string | null;
  fiabilite?: "confirme" | "estime";
}

export interface Grille {
  id: number;
  /** Le backend imbrique la chaîne (objet) ; un id est toléré en repli. */
  chaine: Chaine | number;
  chaine_detail?: Chaine;
  chaine_nom?: string;
  date_debut: string;
  date_fin: string;
  statut: StatutGrille;
  statut_display?: string;
  date_creation?: string;
  date_validation?: string | null;
  cree_par?: number | null;
  cree_par_nom?: string;
  valide_par?: number | null;
  est_complete?: boolean;
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

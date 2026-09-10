import type { Role } from "../types";
import { estEmailValide, normaliserEmail } from "../utils/validators";

/**
 * Service comptes Studio — simulation locale de l'API Django.
 *
 * En production, ces fonctions appellent le backend :
 *   GET    /api/auth/comptes/        → listerComptes()
 *   POST   /api/auth/comptes/        → ajouterCompte()
 *   DELETE /api/auth/comptes/:id/    → supprimerCompte()
 *
 * Les rôles Django (groupes back-office) sont convertis vers les rôles
 * visuels Studio via convertirRoleDjango().
 */

export type RoleDjango = "admin" | "directeur_antenne" | "regie_diffusion" | "technicien";

export interface CompteStudio {
  id: string;
  nom: string;
  email: string;
  roleDjango: RoleDjango;
  actif: boolean;
  dernierAcces: number | null;
}

const LS_KEY = "balafon_comptes_v1";

const SEED: CompteStudio[] = [
  { id: "c-admin", nom: "Sylvie Ekotto", email: "admin@balafon.cm", roleDjango: "admin", actif: true, dernierAcces: Date.now() - 2 * 3_600_000 },
  { id: "c-dir", nom: "Martin Njoya", email: "direction@balafon.cm", roleDjango: "directeur_antenne", actif: true, dernierAcces: Date.now() - 26 * 3_600_000 },
  { id: "c-regie", nom: "Josué Talla", email: "regie@balafon.cm", roleDjango: "regie_diffusion", actif: true, dernierAcces: Date.now() - 5 * 3_600_000 },
  { id: "c-tech", nom: "Clarisse Mbarga", email: "c.mbarga@balafon.cm", roleDjango: "technicien", actif: false, dernierAcces: null },
];

const latency = () => new Promise<void>((r) => setTimeout(r, 320 + Math.random() * 240));

function lire(): CompteStudio[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const comptes = JSON.parse(raw) as CompteStudio[];
      if (Array.isArray(comptes) && comptes.length > 0) return comptes;
    }
  } catch {
    /* re-seed */
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(SEED));
  } catch {
    /* mémoire seule */
  }
  return SEED;
}

function ecrire(comptes: CompteStudio[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(comptes));
  } catch {
    /* mémoire seule */
  }
}

/** GET /api/auth/comptes/ */
export async function listerComptes(): Promise<CompteStudio[]> {
  await latency();
  return lire();
}

/** POST /api/auth/comptes/ */
export async function ajouterCompte(input: { nom: string; email: string; roleDjango: RoleDjango }): Promise<CompteStudio> {
  await latency();
  if (!estEmailValide(input.email)) throw new Error("Adresse email invalide.");
  const comptes = lire();
  const email = normaliserEmail(input.email);
  if (comptes.some((c) => c.email === email)) {
    throw new Error("Un compte existe déjà avec cet email.");
  }
  const compte: CompteStudio = {
    id: `c-${Date.now().toString(36)}`,
    nom: input.nom.trim(),
    email,
    roleDjango: input.roleDjango,
    actif: true,
    dernierAcces: null,
  };
  ecrire([compte, ...comptes]);
  return compte;
}

/** DELETE /api/auth/comptes/:id/ */
export async function supprimerCompte(id: string): Promise<void> {
  await latency();
  const comptes = lire();
  const reste = comptes.filter((c) => c.id !== id);
  if (reste.filter((c) => c.roleDjango === "admin").length === 0 && comptes.some((c) => c.id === id && c.roleDjango === "admin")) {
    throw new Error("Impossible : au moins un compte administrateur doit rester actif.");
  }
  ecrire(reste);
}

/** Conversion des rôles Django → rôles visuels Studio. */
export function convertirRoleDjango(roleDjango: RoleDjango): Role | null {
  switch (roleDjango) {
    case "admin":
      return "admin";
    case "directeur_antenne":
      return "directeur";
    case "regie_diffusion":
      return "regie";
    case "technicien":
      return null; // pas d'accès Studio pour l'instant
  }
}

export const ROLES_DJANGO: { value: RoleDjango; label: string }[] = [
  { value: "admin", label: "Administrateur (admin)" },
  { value: "directeur_antenne", label: "Directeur d'Antenne (directeur_antenne)" },
  { value: "regie_diffusion", label: "Régie de diffusion (regie_diffusion)" },
  { value: "technicien", label: "Technicien (technicien)" },
];

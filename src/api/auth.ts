/* Fonctions d'authentification — POST /api/auth/*. */
import { api, stockageJetons } from "./client";
import type { ReponseConnexion, Utilisateur } from "./types";

export interface CompteAPI extends Utilisateur {
  est_admin: boolean;
  est_directeur_antenne: boolean;
}

export async function connexion(email: string, motDePasse: string): Promise<Utilisateur> {
  const { data } = await api.post<ReponseConnexion>("/auth/connexion/", {
    email,
    mot_de_passe: motDePasse,
  });
  stockageJetons.enregistrer(data.access, data.refresh);
  return data.utilisateur;
}

export async function deconnexion(): Promise<void> {
  const refresh = stockageJetons.lireRefresh();
  try {
    if (refresh) await api.post("/auth/deconnexion/", { refresh });
  } finally {
    stockageJetons.effacer();
  }
}

export async function profil(): Promise<Utilisateur> {
  const { data } = await api.get<Utilisateur>("/auth/profil/");
  return data;
}

export async function listerComptes(): Promise<CompteAPI[]> {
  const { data } = await api.get<CompteAPI[] | { results: CompteAPI[] }>("/auth/comptes/");
  return Array.isArray(data) ? data : data.results;
}

/* CRUD grilles + actions métier — /api/grilles/*. */
import { api } from "./client";
import type { Emission, Grille, Page } from "./types";

export async function listerGrilles(params?: {
  statut?: string;
  chaine?: string;
  date?: string;
}): Promise<Grille[]> {
  const { data } = await api.get<Page<Grille>>("/grilles/", { params });
  return data.results;
}

export async function creerGrille(grille: Partial<Grille>): Promise<Grille> {
  const { data } = await api.post<Grille>("/grilles/", grille);
  return data;
}

export async function majGrille(id: number, patch: Partial<Grille>): Promise<Grille> {
  const { data } = await api.patch<Grille>(`/grilles/${id}/`, patch);
  return data;
}

export async function supprimerGrille(id: number): Promise<void> {
  await api.delete(`/grilles/${id}/`);
}

/** POST /grilles/{id}/valider/ — Directeur d'Antenne uniquement. */
export async function validerGrille(id: number): Promise<Grille> {
  const { data } = await api.post<Grille>(`/grilles/${id}/valider/`);
  return data;
}

export async function completudeGrille(
  id: number
): Promise<{ complete: boolean; creneaux_vides: Array<{ debut: string; fin: string }> }> {
  const { data } = await api.get(`/grilles/${id}/completude/`);
  return data;
}

/** GET /grilles/en-cours/?chaine= — indicateur public « en direct ». */
export async function enCours(chaine?: string): Promise<
  Array<{ chaine: { slug: string; nom: string }; grille_id: number; en_direct: Emission | null }>
> {
  const { data } = await api.get("/grilles/en-cours/", { params: chaine ? { chaine } : {} });
  return data;
}

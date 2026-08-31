/* CRUD émissions — /api/grilles/{id}/emissions/ et /api/emissions/{id}/. */
import { api } from "./client";
import type { Emission } from "./types";

export async function listerEmissions(grilleId: number): Promise<Emission[]> {
  const { data } = await api.get<Emission[]>(`/grilles/${grilleId}/emissions/`);
  return data;
}

export async function ajouterEmission(
  grilleId: number,
  emission: Omit<Emission, "id" | "grille">
): Promise<Emission> {
  const { data } = await api.post<Emission>(`/grilles/${grilleId}/emissions/`, emission);
  return data;
}

export async function majEmission(id: number, patch: Partial<Emission>): Promise<Emission> {
  const { data } = await api.patch<Emission>(`/emissions/${id}/`, patch);
  return data;
}

export async function supprimerEmission(id: number): Promise<void> {
  await api.delete(`/emissions/${id}/`);
}

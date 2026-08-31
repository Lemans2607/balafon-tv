/* Alertes — GET /api/alertes/ + POST marquer-lue. */
import { api } from "./client";
import type { Alerte, Page } from "./types";

export async function listerAlertes(): Promise<Alerte[]> {
  const { data } = await api.get<Page<Alerte>>("/alertes/");
  return data.results;
}

export async function marquerLue(id: number): Promise<Alerte> {
  const { data } = await api.post<Alerte>(`/alertes/${id}/marquer-lue/`);
  return data;
}

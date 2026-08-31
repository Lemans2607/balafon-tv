/* vMix — POST /api/vmix/synchroniser/{id}/ + GET /api/vmix/etat/. */
import { api } from "./client";
import type { SynchroVmixResultat } from "./types";

export async function synchroniserVmix(grilleId: number): Promise<SynchroVmixResultat> {
  const { data } = await api.post<SynchroVmixResultat>(`/vmix/synchroniser/${grilleId}/`);
  return data;
}

export async function etatVmix(): Promise<{ mode: string; en_ligne: boolean }> {
  const { data } = await api.get("/vmix/etat/");
  return data;
}

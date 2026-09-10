/* CRUD grilles + actions métier — /api/grilles/*. */
import { api } from "./client";
import type { Chaine, Emission, GenreEmission, Grille, Page } from "./types";

function liste<T>(data: T[] | Page<T>): T[] {
  return Array.isArray(data) ? data : data.results;
}

export async function listerGrilles(params?: {
  statut?: string;
  chaine?: string;
  date?: string;
}): Promise<Grille[]> {
  const { data } = await api.get<Grille[] | Page<Grille>>("/grilles/", { params });
  return liste(data);
}

export async function listerChaines(): Promise<Chaine[]> {
  const { data } = await api.get<Chaine[] | Page<Chaine>>("/chaines/");
  return liste(data);
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

const GENRE_PAR_CATEGORIE: Record<string, GenreEmission> = {
  news: "info",
  talk: "talk",
  entertainment: "divertissement",
  culture: "culture",
  sport: "sport",
  documentary: "magazine",
  series: "serie",
  music: "musique",
  rerun: "autre",
  commercial: "autre",
  "off-air": "autre",
};

function isoEmission(date: string, time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date(`${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
  return value.toISOString();
}

/** Persiste un créneau créé dans le constructeur dans la grille du jour. */
export async function enregistrerEmissionPlanifiee(input: {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  category: string;
  posterUrl?: string;
  fiabilite?: "confirme" | "estime";
}): Promise<{ grille: Grille; emission: Emission }> {
  const chaines = await listerChaines();
  const chaine = chaines.find((item) => item.slug === "balafon-tv") ?? chaines[0];
  if (!chaine) throw new Error("Aucune chaîne active n’est disponible dans le backend.");

  const grilles = await listerGrilles({ chaine: chaine.slug });
  let grille = grilles.find(
    (item) => item.date_debut <= input.date && item.date_fin >= input.date
  );
  if (!grille) {
    grille = await creerGrille({
      chaine_id: chaine.id,
      date_debut: input.date,
      date_fin: input.date,
      statut: "brouillon",
    } as Partial<Grille> & { chaine_id: number });
  }

  const { data: emission } = await api.post<Emission>(`/grilles/${grille.id}/emissions/`, {
    titre: input.title,
    genre: GENRE_PAR_CATEGORIE[input.category] ?? "autre",
    description: input.description,
    heure_debut: isoEmission(input.date, input.startTime),
    heure_fin: isoEmission(input.date, input.endTime === "24:00" ? "23:59" : input.endTime),
    image_affiche: input.posterUrl || null,
    fiabilite: input.fiabilite ?? "estime",
  });
  return { grille, emission };
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

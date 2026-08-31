/* ============================================================
   Adaptateur API Django → Planby.

   Transforme les grilles renvoyées par DRF (GET /api/grilles/?statut=validee)
   en tableaux `{ channels, epg }` au format attendu par `useEpg`.
   Réutilise la fonction canonique `depuisApiBackend` de utils/planbyAdapter.
   ============================================================ */
import { depuisApiBackend, type ChainePlanby, type ProgrammePlanby } from "../utils/planbyAdapter";
import type { GrilleAPI } from "../utils/planbyAdapter";
import type { Grille } from "./types";

export type { ChainePlanby, ProgrammePlanby };

/** Convertit une Grille DRF en GrilleAPI (format de l'adaptateur canonique). */
function versGrilleAPI(grille: Grille): GrilleAPI {
  const chaineObjet = typeof grille.chaine === "object" ? grille.chaine : grille.chaine_detail;
  const chaineId = typeof grille.chaine === "number" ? grille.chaine : chaineObjet?.id ?? 0;
  return {
    id: grille.id,
    chaine: {
      id: chaineId,
      slug: chaineObjet?.slug ?? "balafon-tv",
      nom: chaineObjet?.nom ?? grille.chaine_nom ?? "Balafon TV",
      logo: undefined,
    },
    emissions: (grille.emissions ?? []).map((e) => ({
      id: e.id,
      titre: e.titre,
      genre: e.genre,
      description: e.description,
      heure_debut: e.heure_debut,
      heure_fin: e.heure_fin,
      image_affiche: e.image_affiche ?? undefined,
      fiabilite: e.fiabilite,
    })),
  };
}

/** Construit les données Planby depuis un lot de grilles DRF validées. */
export function adapterGrillesVersPlanby(grilles: Grille[]): {
  channels: ChainePlanby[];
  epg: ProgrammePlanby[];
} {
  return depuisApiBackend(grilles.map(versGrilleAPI));
}

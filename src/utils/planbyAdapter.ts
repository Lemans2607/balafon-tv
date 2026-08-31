/**
 * Adaptateur Planby.
 *
 * Planby attend deux tableaux au format précis (cf. doc officielle) :
 *   channels : { uuid, logo, name }[]
 *   epg      : { id, channelUuid, title, since (ISO), till (ISO), description, image }[]
 *
 * Ce fichier fournit deux façons d'obtenir ce format :
 *   1. depuisApiBackend(...)    → à partir des grilles/émissions renvoyées par l'API Django (usage réel)
 *   2. depuisCatalogueDemo(...) → à partir du catalogue JSON des vraies émissions Balafon TV
 *      (emissions_reelles_balafon_tv.json), pour peupler l'EPG de démonstration/soutenance
 *      avant que le backend ne soit branché. C'est cette voie qui alimente actuellement le
 *      seeding des grilles (src/data/schedules.ts).
 */

export interface ChainePlanby {
  uuid: string;
  logo: string;
  name: string;
}

export interface ProgrammePlanby {
  id: string;
  channelUuid: string;
  title: string;
  since: string; // ISO 8601
  till: string; // ISO 8601
  description?: string;
  image?: string;
}

// --------------------------------------------------------------------------
// 1. Depuis l'API backend réelle (Grille + Emission, cf. prompt_backend_django.md)
// --------------------------------------------------------------------------

export interface ChaineAPI {
  id: number;
  slug: string;
  nom: string;
  logo?: string;
}

export interface EmissionAPI {
  id: number;
  titre: string;
  genre: string;
  description?: string;
  heure_debut: string; // ISO 8601, renvoyé par DRF
  heure_fin: string; // ISO 8601
  /** Lien vers l'affiche — lu pour afficher les vignettes dans l'EPG. */
  image_affiche?: string;
  fiabilite?: "confirme" | "estime";
}

export interface GrilleAPI {
  id: number;
  chaine: ChaineAPI;
  emissions: EmissionAPI[];
}

export function depuisApiBackend(
  grilles: GrilleAPI[]
): { channels: ChainePlanby[]; epg: ProgrammePlanby[] } {
  const chainesVues = new Map<string, ChainePlanby>();
  const epg: ProgrammePlanby[] = [];

  for (const grille of grilles) {
    const { chaine } = grille;
    if (!chainesVues.has(chaine.slug)) {
      chainesVues.set(chaine.slug, {
        uuid: chaine.slug,
        logo: chaine.logo ?? "",
        name: chaine.nom,
      });
    }

    for (const emission of grille.emissions) {
      epg.push({
        id: String(emission.id),
        channelUuid: chaine.slug,
        title: emission.titre,
        since: emission.heure_debut,
        till: emission.heure_fin,
        description: emission.description,
        image: emission.image_affiche,
      });
    }
  }

  return { channels: Array.from(chainesVues.values()), epg };
}

// --------------------------------------------------------------------------
// 2. Depuis le catalogue de démo (émissions réelles de Balafon TV)
// --------------------------------------------------------------------------

export interface EmissionCatalogueDemo {
  titre: string;
  genre: string;
  jours: string[]; // "lundi" .. "dimanche"
  heure_debut: string; // "HH:MM"
  heure_fin?: string; // "HH:MM", optionnel (sinon durée par défaut selon le genre)
  fiabilite: "confirme" | "estime";
  description?: string;
  /** Lien direct vers l'affiche réelle (hotlink presse) — repli local sinon. */
  image_affiche?: string;
}

const JOURS_SEMAINE = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

// Durée par défaut (en minutes) quand heure_fin n'est pas fournie dans le catalogue,
// utilisée uniquement pour la démo — à ajuster une fois les vraies durées connues.
const DUREE_PAR_GENRE_MINUTES: Record<string, number> = {
  infotainment: 120,
  talkshow: 90,
  magazine: 60,
  talk: 90,
  musique: 60,
  actualite: 30,
  sport: 30,
  telerealite: 60,
  "mag-promo": 30,
  serie: 60,
};

export function dureeParGenre(genre: string): number {
  return DUREE_PAR_GENRE_MINUTES[genre] ?? 60;
}

export function prochaineOccurrence(lundiDeReference: Date, jourCible: string): Date {
  const indexCible = JOURS_SEMAINE.indexOf(jourCible);
  const indexLundi = 1; // "lundi" dans JOURS_SEMAINE
  const decalage = (indexCible - indexLundi + 7) % 7;
  const date = new Date(lundiDeReference);
  date.setDate(date.getDate() + decalage);
  return date;
}

/**
 * Construit une semaine d'EPG à partir du catalogue de démo, pour une chaîne donnée.
 *
 * @param catalogue         Le tableau `catalogue_emissions_balafon_tv` du fichier JSON.
 * @param chaineSlug        Le uuid/slug à utiliser côté Planby (ex. "balafon-tv").
 * @param chaineNom         Le nom affiché de la chaîne (ex. "Balafon TV").
 * @param lundiDeReference  Date du lundi de la semaine à générer.
 */
export function depuisCatalogueDemo(
  catalogue: EmissionCatalogueDemo[],
  chaineSlug: string,
  chaineNom: string,
  lundiDeReference: Date
): { channels: ChainePlanby[]; epg: ProgrammePlanby[] } {
  const epg: ProgrammePlanby[] = [];

  catalogue.forEach((emission, index) => {
    emission.jours.forEach((jour) => {
      const dateJour = prochaineOccurrence(lundiDeReference, jour);
      const [heureDebutH, heureDebutM] = emission.heure_debut.split(":").map(Number);

      const since = new Date(dateJour);
      since.setHours(heureDebutH, heureDebutM, 0, 0);

      let till: Date;
      if (emission.heure_fin) {
        const [heureFinH, heureFinM] = emission.heure_fin.split(":").map(Number);
        till = new Date(dateJour);
        till.setHours(heureFinH, heureFinM, 0, 0);
      } else {
        const dureeMinutes = DUREE_PAR_GENRE_MINUTES[emission.genre] ?? 60;
        till = new Date(since.getTime() + dureeMinutes * 60_000);
      }

      epg.push({
        id: `${chaineSlug}-${index}-${jour}`,
        channelUuid: chaineSlug,
        title: emission.titre,
        since: since.toISOString(),
        till: till.toISOString(),
        description: emission.description,
      });
    });
  });

  return {
    channels: [{ uuid: chaineSlug, logo: "", name: chaineNom }],
    epg,
  };
}

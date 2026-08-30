import type { Program, ProgramCategory } from "../types";
import { dureeParGenre, type EmissionCatalogueDemo } from "../utils/planbyAdapter";
import catalogueJson from "./emissions_reelles_balafon_tv.json";

/* ============================================================
   Bibliothèque des programmes — Balafon TV
   Source : catalogue réel des émissions (emissions_reelles_balafon_tv.json)
   - fiabilite "confirme" : horaire rapporté par balafon.media / presse
   - fiabilite "estime"   : émission réelle, horaire hypothétique (démo)
   ============================================================ */

export const HERO_BACKDROP = "/images/hero-studio.jpg";

const POSTER_JOURNAL = "/images/poster-journal.jpg";
const POSTER_DEBAT = "/images/poster-debat.jpg";
const POSTER_CINE = "/images/poster-cine.jpg";
const POSTER_CULTURE = "/images/poster-culture.jpg";
const POSTER_HITPARADE = "/images/poster-hitparade.jpg";
const POSTER_SPORT = "/images/poster-sport.jpg";
const POSTER_FEMME = "/images/poster-femme.jpg";

export const CATALOGUE_EMISSIONS =
  catalogueJson.catalogue_emissions_balafon_tv as EmissionCatalogueDemo[];

export const OFF_AIR_PROGRAM_ID = "p-offair";
export const RERUN_PROGRAM_ID = "p-rediff";
export const CLIPS_PROGRAM_ID = "p-clips";

const GENRE_TO_CATEGORY: Record<string, ProgramCategory> = {
  infotainment: "news",
  talkshow: "talk",
  magazine: "talk",
  talk: "talk",
  musique: "music",
  actualite: "news",
  sport: "sport",
  telerealite: "entertainment",
  "mag-promo": "commercial",
  serie: "series",
};

interface ProgrammeSpec {
  id: string;
  category: ProgramCategory;
  posterUrl: string;
  backdropUrl?: string;
  subtitle: string;
  tags: string[];
  isReplayAvailable: boolean;
}

/* Enrichissement éditorial par émission (l'ordre suit le catalogue JSON) */
const SPECS: Record<string, ProgrammeSpec> = {
  "C'le Matin": {
    id: "p-c-le-matin",
    category: "news",
    posterUrl: "",
    backdropUrl: HERO_BACKDROP,
    subtitle: "Lun–Ven · 07:00",
    tags: ["matin", "direct", "info", "douala"],
    isReplayAvailable: true,
  },
  "Faut Pas Zapper": {
    id: "p-faut-pas-zapper",
    category: "talk",
    posterUrl: POSTER_DEBAT,
    subtitle: "Lun–Ven · 18:00",
    tags: ["talk", "débat", "société", "prime"],
    isReplayAvailable: true,
  },
  "Femme au Contrôle": {
    id: "p-femme-au-controle",
    category: "talk",
    posterUrl: POSTER_FEMME,
    subtitle: "Lun–Jeu · 17:00 – 18:00",
    tags: ["femme", "débat", "société"],
    isReplayAvailable: true,
  },
  "Les Meufs": {
    id: "p-les-meufs",
    category: "talk",
    posterUrl: POSTER_FEMME,
    subtitle: "Vendredi · 17:00",
    tags: ["femme", "couple", "lifestyle"],
    isReplayAvailable: true,
  },
  "Top 25 Hit-Parade": {
    id: "p-top-25-hit-parade",
    category: "music",
    posterUrl: POSTER_HITPARADE,
    subtitle: "Samedi · 15:00",
    tags: ["musique", "classement", "237"],
    isReplayAvailable: true,
  },
  "C'le Weekend": {
    id: "p-c-le-weekend",
    category: "talk",
    posterUrl: "",
    backdropUrl: HERO_BACKDROP,
    subtitle: "Samedi · 20:30 — présenté par Cyrille Bojiko",
    tags: ["talk", "personnalités", "weekend"],
    isReplayAvailable: true,
  },
  "Grand Plateau": {
    id: "p-grand-plateau",
    category: "news",
    posterUrl: POSTER_JOURNAL,
    subtitle: "Tous les jours · 19:30",
    tags: ["journal", "actualité", "cameroun"],
    isReplayAvailable: true,
  },
  Entretien: {
    id: "p-entretien",
    category: "talk",
    posterUrl: "",
    subtitle: "Mardi & Jeudi · 20:00",
    tags: ["interview", "invité"],
    isReplayAvailable: true,
  },
  "Moment de Sports": {
    id: "p-moment-de-sports",
    category: "sport",
    posterUrl: POSTER_SPORT,
    subtitle: "Lun, Mer & Ven · 16:00",
    tags: ["sport", "football", "lions"],
    isReplayAvailable: true,
  },
  "Télé-Zoom": {
    id: "p-tele-zoom",
    category: "culture",
    posterUrl: POSTER_CULTURE,
    subtitle: "Lun–Ven · 15:00",
    tags: ["magazine", "culture", "après-midi"],
    isReplayAvailable: true,
  },
  "Grand Déballage": {
    id: "p-grand-deballage",
    category: "entertainment",
    posterUrl: "",
    subtitle: "Dimanche · 20:00",
    tags: ["téléréalité", "divertissement"],
    isReplayAvailable: true,
  },
  "Télémarché": {
    id: "p-telemarche",
    category: "commercial",
    posterUrl: "",
    subtitle: "Lun–Ven · 13:00",
    tags: ["startups", "commerce local"],
    isReplayAvailable: false,
  },
  "Séries Cultes": {
    id: "p-series-cultes",
    category: "series",
    posterUrl: POSTER_CINE,
    subtitle: "Tous les jours · 21:00",
    tags: ["série", "soirée", "fiction"],
    isReplayAvailable: true,
  },
};

function dureeEmission(e: EmissionCatalogueDemo): number {
  if (e.heure_fin) {
    const [dh, dm] = e.heure_debut.split(":").map(Number);
    const [fh, fm] = e.heure_fin.split(":").map(Number);
    return fh * 60 + fm - (dh * 60 + dm);
  }
  return dureeParGenre(e.genre);
}

function slugify(titre: string): string {
  return titre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const SEED_PROGRAMS: Program[] = [
  ...CATALOGUE_EMISSIONS.map((e) => {
    const spec = SPECS[e.titre];
    return {
      id: spec?.id ?? `p-${slugify(e.titre)}`,
      title: e.titre,
      subtitle: spec?.subtitle,
      description: e.description ?? "",
      category: spec?.category ?? GENRE_TO_CATEGORY[e.genre] ?? "entertainment",
      durationMinutes: dureeEmission(e),
      posterUrl: spec?.posterUrl ?? "",
      backdropUrl: spec?.backdropUrl,
      status: "validated" as const,
      isReplayAvailable: spec?.isReplayAvailable ?? true,
      tags: spec?.tags ?? [e.genre],
      fiabilite: e.fiabilite,
    };
  }),

  /* ----- Blocs auxiliaires de continuité d'antenne ----- */
  {
    id: RERUN_PROGRAM_ID,
    title: "Rediffusion",
    subtitle: "Reprise d’antenne",
    description:
      "Reprise d’une émission phare de Balafon TV pour assurer la continuité de l’antenne entre deux programmes.",
    category: "rerun",
    durationMinutes: 60,
    posterUrl: "",
    status: "validated",
    isReplayAvailable: false,
    tags: ["rediffusion"],
  },
  {
    id: CLIPS_PROGRAM_ID,
    title: "Balafon Clips",
    subtitle: "Sélection musicale",
    description:
      "Sélection de clips d’artistes camerounais et africains — le son du 237 en continu sur Balafon TV.",
    category: "music",
    durationMinutes: 30,
    posterUrl: "",
    status: "validated",
    isReplayAvailable: false,
    tags: ["clips", "musique", "237"],
  },
  {
    id: OFF_AIR_PROGRAM_ID,
    title: "Hors antenne",
    subtitle: "Aucune diffusion planifiée",
    description:
      "Période sans diffusion. L’antenne de Balafon TV reprend chaque jour à 06 h 00.",
    category: "off-air",
    durationMinutes: 360,
    posterUrl: "",
    status: "validated",
    isReplayAvailable: false,
    tags: ["nuit"],
  },
];

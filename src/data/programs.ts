import type { Program, ProgramCategory } from "../types";
import { CATEGORY_META } from "../types";
import { dureeParGenre, type EmissionCatalogueDemo } from "../utils/planbyAdapter";
import { CATALOGUE_EMISSIONS_BALAFON_TV } from "./emissions_reelles_balafon_tv";

/* ============================================================
   Bibliothèque des programmes — Balafon TV
   Source : catalogue réel des émissions (emissions_reelles_balafon_tv)

   Affiches :
     1. photos réelles (presse / balafon.media) quand un lien direct
        existe — champ image_affiche du catalogue ;
     2. sinon, affiche éditoriale générée (SVG embarqué) aux couleurs
        de la catégorie — aucun visuel générique ou cassé dans l'EPG.
   ============================================================ */

export const HERO_BACKDROP =
  "https://image.qwenlm.ai/generated-images/262b0e5c-1365-4816-93e2-4e2910d51604/_result.png";

const POSTER_JOURNAL =
  "https://image.qwenlm.ai/generated-images/17075206-3612-45f9-a9a3-0dfc2af9a0cf/_result.png";
const POSTER_SERIES =
  "https://image.qwenlm.ai/generated-images/bb725ced-db7a-4407-b6e2-85d3ffacf482/_result.png";

export const CATALOGUE_EMISSIONS: EmissionCatalogueDemo[] = CATALOGUE_EMISSIONS_BALAFON_TV;

export const OFF_AIR_PROGRAM_ID = "p-offair";
export const RERUN_PROGRAM_ID = "p-rediff";
export const CLIPS_PROGRAM_ID = "p-clips";

export const GENRE_TO_CATEGORY: Record<string, ProgramCategory> = {
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

/* ============================================================
   Générateur d'affiches éditoriales — SVG data-URI.
   Composition broadcast : fond encre + halo catégorie, bande
   diagonale, halftone, initiales monumentales, repères de cadre.
   ============================================================ */
export function afficheProgramme(titre: string, categorie: ProgramCategory): string {
  const meta = CATEGORY_META[categorie] ?? CATEGORY_META.entertainment;
  const couleur = meta.color;
  const initiales = titre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">`,
    `<defs>`,
    `<radialGradient id="halo" cx="78%" cy="12%" r="85%">`,
    `<stop offset="0%" stop-color="${couleur}" stop-opacity="0.5"/>`,
    `<stop offset="55%" stop-color="${couleur}" stop-opacity="0.12"/>`,
    `<stop offset="100%" stop-color="${couleur}" stop-opacity="0"/>`,
    `</radialGradient>`,
    `<pattern id="trame" width="14" height="14" patternUnits="userSpaceOnUse">`,
    `<circle cx="2" cy="2" r="1.3" fill="#F7F8FA" opacity="0.06"/>`,
    `</pattern>`,
    `</defs>`,
    `<rect width="400" height="600" fill="#0C1017"/>`,
    `<rect width="400" height="600" fill="url(#halo)"/>`,
    `<rect width="400" height="600" fill="url(#trame)"/>`,
    `<polygon points="0,600 400,330 400,600" fill="${couleur}" opacity="0.14"/>`,
    `<polygon points="0,600 400,420 400,600" fill="${couleur}" opacity="0.22"/>`,
    // Repères de cadre broadcast (coins)
    `<g stroke="${couleur}" stroke-width="3" fill="none" opacity="0.85">`,
    `<path d="M22 46 V22 H46"/><path d="M354 22 H378 V46"/>`,
    `<path d="M378 554 V578 H354"/><path d="M46 578 H22 V554"/>`,
    `</g>`,
    // Marque en creux
    `<text x="200" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="6" fill="#9CA3AF">BALAFON TV</text>`,
    // Initiales monumentales (ombre couleur + face claire)
    `<text x="206" y="352" text-anchor="middle" font-family="Arial, sans-serif" font-size="186" font-weight="900" fill="${couleur}" opacity="0.9">${initiales}</text>`,
    `<text x="200" y="346" text-anchor="middle" font-family="Arial, sans-serif" font-size="186" font-weight="900" fill="#F7F8FA">${initiales}</text>`,
    // Liseré bas + pastille catégorie
    `<rect x="0" y="588" width="400" height="12" fill="${couleur}"/>`,
    `<circle cx="200" cy="520" r="5" fill="${couleur}"/>`,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/* ============================================================
   Enrichissement éditorial (sous-titres, tags, affiches prioritaires).
   L'ordre suit le catalogue JSON — 12 émissions réelles.
   ============================================================ */
interface ProgrammeSpec {
  id: string;
  category: ProgramCategory;
  posterUrl?: string;
  backdropUrl?: string;
  subtitle: string;
  tags: string[];
  isReplayAvailable: boolean;
}

const SPECS: Record<string, ProgrammeSpec> = {
  "C'le Matin": {
    id: "p-c-le-matin",
    category: "news",
    backdropUrl: HERO_BACKDROP,
    subtitle: "Lun–Ven · 07:00",
    tags: ["matin", "direct", "info", "douala"],
    isReplayAvailable: true,
  },
  "Faut Pas Zapper": {
    id: "p-faut-pas-zapper",
    category: "talk",
    subtitle: "Lun–Ven · 18:00",
    tags: ["talk", "débat", "société", "prime"],
    isReplayAvailable: true,
  },
  "Femme au Contrôle": {
    id: "p-femme-au-controle",
    category: "talk",
    subtitle: "Lun–Jeu · 17:00 – 18:00",
    tags: ["femme", "débat", "société"],
    isReplayAvailable: true,
  },
  "Les Meufs": {
    id: "p-les-meufs",
    category: "talk",
    subtitle: "Vendredi · 17:00",
    tags: ["femme", "couple", "lifestyle"],
    isReplayAvailable: true,
  },
  "Top 25 Hit-Parade": {
    id: "p-top-25-hit-parade",
    category: "music",
    subtitle: "Samedi · 15:00",
    tags: ["musique", "classement", "237"],
    isReplayAvailable: true,
  },
  "C'le Weekend": {
    id: "p-c-le-weekend",
    category: "talk",
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
    subtitle: "Mardi & Jeudi · 20:00",
    tags: ["interview", "invité"],
    isReplayAvailable: true,
  },
  "Moment de Sports": {
    id: "p-moment-de-sports",
    category: "sport",
    subtitle: "Lun, Mer & Ven · 16:00",
    tags: ["sport", "football", "lions"],
    isReplayAvailable: true,
  },
  "Télé-Zoom": {
    id: "p-tele-zoom",
    category: "culture",
    subtitle: "Lun–Ven · 15:00",
    tags: ["magazine", "culture", "après-midi"],
    isReplayAvailable: true,
  },
  "Grand Déballage": {
    id: "p-grand-deballage",
    category: "entertainment",
    subtitle: "Dimanche · 20:00",
    tags: ["téléréalité", "divertissement"],
    isReplayAvailable: true,
  },
  "Télémarché": {
    id: "p-telemarche",
    category: "commercial",
    subtitle: "Lun–Ven · 13:00",
    tags: ["startups", "commerce local"],
    isReplayAvailable: false,
  },
  "Séries Cultes": {
    id: "p-series-cultes",
    category: "series",
    posterUrl: POSTER_SERIES,
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
    const category = spec?.category ?? GENRE_TO_CATEGORY[e.genre] ?? "entertainment";
    return {
      id: spec?.id ?? `p-${slugify(e.titre)}`,
      title: e.titre,
      subtitle: spec?.subtitle,
      description: e.description ?? "",
      category,
      durationMinutes: dureeEmission(e),
      /* Priorité : photo réelle du catalogue → affiche dédiée → affiche générée */
      posterUrl: e.image_affiche ?? spec?.posterUrl ?? afficheProgramme(e.titre, category),
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
    subtitle: "Reprise d'antenne",
    description:
      "Reprise d'une émission phare de Balafon TV pour assurer la continuité de l'antenne entre deux programmes.",
    category: "rerun",
    durationMinutes: 60,
    posterUrl: afficheProgramme("Rediffusion", "rerun"),
    status: "validated",
    isReplayAvailable: false,
    tags: ["rediffusion"],
  },
  {
    id: CLIPS_PROGRAM_ID,
    title: "Balafon Clips",
    subtitle: "Sélection musicale",
    description:
      "Sélection de clips d'artistes camerounais et africains — le son du 237 en continu sur Balafon TV.",
    category: "music",
    durationMinutes: 30,
    posterUrl: afficheProgramme("Balafon Clips", "music"),
    status: "validated",
    isReplayAvailable: false,
    tags: ["clips", "musique", "237"],
  },
  {
    id: OFF_AIR_PROGRAM_ID,
    title: "Hors antenne",
    subtitle: "Aucune diffusion planifiée",
    description:
      "Période sans diffusion. L'antenne de Balafon TV reprend chaque jour à 06 h 00.",
    category: "off-air",
    durationMinutes: 360,
    posterUrl: "",
    status: "validated",
    isReplayAvailable: false,
    tags: ["nuit"],
  },
];

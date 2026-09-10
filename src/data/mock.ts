import type { Alerte, BlocPlace, Db, Grille, LogEntry, Programme } from "../types";
import { uid } from "../utils/epg";

/* ——— Visuels générés ——— */

export const IMG = {
  billboard:
    "https://image.qwenlm.ai/generated-images/e49a45aa-5fb8-4de4-90d4-85fe40f86977/_result.png",
  concert:
    "https://image.qwenlm.ai/generated-images/cdc99cb2-31c3-440c-9851-0a6071d98d7a/_result.png",
  foot: "https://image.qwenlm.ai/generated-images/35ebf37b-7285-42f8-af6f-845662fc4e5e/_result.png",
  drama:
    "https://image.qwenlm.ai/generated-images/5e028aa0-b1bc-4c8e-b427-5a3cf29cc796/_result.png",
};

/* ——— Bibliothèque des programmes ——— */

const P = (
  id: string,
  titre: string,
  categorie: Programme["categorie"],
  duree: number,
  type: Programme["type"],
  description: string,
  image?: string
): Programme => ({ id, titre, categorie, duree, type, description, image });

export const PROGRAMMES: Programme[] = [
  P("p-matinale", "Matinale Balafon", "information", 180, "direct", "Le grand réveil de Douala et Yaoundé : info, météo, invités et bonne humeur."),
  P("p-teleboutique", "Télé Boutique", "divertissement", 30, "enregistre", "Les bonnes affaires du moment, présentées en plateau."),
  P("p-redif-debat", "Rediff : Grand Débat Citoyen", "information", 60, "rediffusion", "Le débat de la veille, pour ceux qui l'ont manqué."),
  P("p-cuisine", "Cuisine du Terroir", "divertissement", 60, "enregistre", "Les recettes camerounaises revisitées par nos chefs."),
  P("p-cuisine-long", "Cuisine du Terroir — Spécial", "divertissement", 90, "enregistre", "Format long : marché, produits et cuisine en famille."),
  P("p-doc-terres", "Documentaire : Terres du Cameroun", "culture", 30, "enregistre", "Un regard documentaire sur les paysages et les hommes."),
  P("p-journal-midi", "Journal de la Mi-Journée", "information", 60, "direct", "L'essentiel de l'actualité à la mi-journée."),
  P("p-meteo", "Météo & Vous", "information", 30, "enregistre", "Prévisions détaillées pour toutes les régions."),
  P("p-meteo-trafic", "Météo & Trafic", "information", 30, "enregistre", "Météo du soir et état des axes Douala / Yaoundé."),
  P("p-cine-aprem", "Ciné Après-midi", "film", 90, "enregistre", "Un film pour l'après-midi, en famille."),
  P("p-cine-long", "Ciné Après-midi — Grand Format", "film", 120, "enregistre", "Le grand film du week-end."),
  P("p-dessins", "Dessins Animés Mboa", "jeunesse", 60, "enregistre", "Les héros animés préférés des plus petits."),
  P("p-club-jeunesse", "Club Jeunesse", "jeunesse", 60, "enregistre", "Jeux, défis et découvertes pour les 8-15 ans."),
  P("p-matinale-jeunesse", "Matinale Spéciale Jeunesse", "jeunesse", 120, "direct", "Édition spéciale dédiée à la jeunesse camerounaise."),
  P("p-ngondo", "Ngondo, Racines & Traditions", "culture", 60, "enregistre", "Le magazine du patrimoine et des traditions du littoral."),
  P("p-talents", "Talents du Mboa", "divertissement", 60, "enregistre", "La scène locale à l'honneur : musique, danse, humour."),
  P("p-jt", "Journal Télévisé — 19h30", "information", 60, "direct", "Le rendez-vous d'information de référence de Balafon TV."),
  P("p-flash", "Flash Info Spécial", "information", 30, "direct", "Édition flash en cas d'actualité chaude."),
  P("p-debat", "Grand Débat Citoyen", "information", 60, "direct", "Contradictoire et citoyen : le grand débat du soir."),
  P("p-serie", "Série : Les Bâtisseurs", "film", 90, "enregistre", "Le quotidien d'un cabinet d'architectes à Douala.", IMG.drama),
  P("p-serie-inedit", "Les Bâtisseurs — Ép. inédit", "film", 90, "enregistre", "Épisode inédit de la saison 2.", IMG.drama),
  P("p-nuit", "La Nuit Balafon", "divertissement", 60, "rediffusion", "Best-of et rediffusions pour finir la journée."),
  P("p-weekend-matin", "Week-end Matin", "divertissement", 120, "enregistre", "Réveil en douceur : chroniques, musique et direct marché."),
  P("p-echappees", "Échappées du Littoral", "culture", 60, "enregistre", "Escapades le long de la côte camerounaise."),
  P("p-teleboutique-wk", "Télé Boutique — Format Week-end", "divertissement", 90, "enregistre", "Le grand rendez-vous shopping du week-end."),
  P("p-elite-one", "Ligue Elite One — Direct Stade", "sport", 120, "direct", "Le championnat Elite One en direct des stades.", IMG.foot),
  P("p-douala-night", "Magazine : Douala by Night", "divertissement", 90, "enregistre", "La vie nocturne de Douala, entre scènes et saveurs."),
  P("p-makossa-live", "Concert : Makossa Live Session", "divertissement", 60, "direct", "Une session live exclusive depuis le studio 2.", IMG.concert),
  P("p-cine-soir", "Ciné Dimanche", "film", 90, "enregistre", "La grande fiction du dimanche soir."),
  P("p-debrief-sport", "Débrief Sport", "sport", 60, "enregistre", "Analyses, réactions et images exclusives après les matchs."),
  P("p-lions", "Documentaire : Lions Indomptables", "sport", 60, "enregistre", "Dans les coulisses de la sélection nationale.", IMG.foot),
  P("p-bikutsi", "Nuit du Bikutsi", "culture", 90, "direct", "Le bikutsi en direct depuis la case des arts.", IMG.concert),
  P("p-journal-nuit", "Journal de la Nuit", "information", 30, "direct", "Le dernier point complet de l'actualité du jour."),
];

/* ——— Construction des grilles (slots 06:00 → 24:00) ——— */

type PlanJour = [string, number][]; // [programmeId, slot]

const JOUR_SEMAINE: PlanJour = [
  ["p-matinale", 0],
  ["p-teleboutique", 6],
  ["p-redif-debat", 7],
  ["p-cuisine", 9],
  ["p-doc-terres", 11],
  ["p-journal-midi", 12],
  ["p-meteo", 14],
  ["p-cine-aprem", 15],
  ["p-dessins", 18],
  ["p-club-jeunesse", 20],
  ["p-ngondo", 22],
  ["p-talents", 24],
  ["p-meteo-trafic", 26],
  ["p-jt", 27],
  ["p-debat", 29],
  ["p-serie", 31],
  ["p-nuit", 34],
];

const JOUR_WEEKEND: PlanJour = [
  ["p-weekend-matin", 0],
  ["p-echappees", 4],
  ["p-teleboutique-wk", 6],
  ["p-cuisine-long", 9],
  ["p-journal-midi", 12],
  ["p-cine-long", 14],
  ["p-elite-one", 18],
  ["p-douala-night", 22],
  ["p-makossa-live", 25],
  ["p-jt", 27],
  ["p-cine-soir", 29],
  ["p-debrief-sport", 32],
  ["p-nuit", 34],
];

const JOUR_SPECIALE_JEUNESSE: PlanJour = [
  ["p-matinale-jeunesse", 0],
  ["p-club-jeunesse", 4],
  ["p-dessins", 6],
  ["p-cuisine", 8],
  ["p-flash", 11],
  ["p-journal-midi", 12],
  ["p-cine-long", 14],
  ["p-elite-one", 18],
  ["p-talents", 22],
  ["p-makossa-live", 24],
  ["p-meteo-trafic", 26],
  ["p-jt", 27],
  ["p-cine-soir", 29],
  ["p-debrief-sport", 32],
  ["p-nuit", 34],
];

const blocs = (plan: PlanJour): BlocPlace[] =>
  plan.map(([programmeId, slot]) => ({ id: uid("b"), programmeId, slot }));

const semaineType = (): BlocPlace[][] => [
  ...Array.from({ length: 5 }, () => blocs(JOUR_SEMAINE)),
  blocs(JOUR_WEEKEND),
  blocs(JOUR_WEEKEND),
];

/* ——— Seed complet ——— */

export const seedDb = (): Db => {
  const now = Date.now();
  const h = 3_600_000;

  const officielle: Grille = {
    id: "g-officielle",
    nom: "Grille Officielle — Semaine en cours",
    semaine: "Semaine type · Balafon TV",
    statut: "validee",
    jours: semaineType(),
    antenne: true,
    creePar: "S. Ekotto",
    majLe: now - 26 * h,
  };

  const speciale: Grille = {
    id: "g-speciale",
    nom: "Spéciale Fête de la Jeunesse",
    semaine: "Édition événementielle · dimanche renforcé",
    statut: "en_attente",
    jours: [
      ...Array.from({ length: 5 }, () => blocs(JOUR_SEMAINE)),
      blocs(JOUR_WEEKEND),
      blocs(JOUR_SPECIALE_JEUNESSE),
    ],
    antenne: false,
    creePar: "S. Ekotto",
    majLe: now - 2 * h,
  };

  // Brouillon volontairement incomplet — démo du contrôle de complétude
  const lundiTroue = blocs(JOUR_SEMAINE).filter(
    (b) => b.programmeId !== "p-doc-terres" && b.programmeId !== "p-club-jeunesse"
  );
  const semaine09: Grille = {
    id: "g-semaine09",
    nom: "Grille Semaine 09",
    semaine: "Semaine du 23 février",
    statut: "brouillon",
    jours: [lundiTroue, [], [], [], [], [], []],
    antenne: false,
    creePar: "S. Ekotto",
    majLe: now - 40 * 60_000,
  };

  const bikutsi: Grille = {
    id: "g-bikutsi",
    nom: "Nuit du Bikutsi — Habillage",
    semaine: "Soirée spéciale · samedi",
    statut: "brouillon",
    jours: [blocs(JOUR_SEMAINE), [], [], [], [], blocs(JOUR_WEEKEND), []],
    antenne: false,
    creePar: "S. Ekotto",
    majLe: now - 5 * h,
  };

  const alertes: Alerte[] = [
    {
      id: uid("a"),
      ts: now - 12 * 60_000,
      heure: "18:45",
      texte:
        "Modification Directeur : Remplacement de « Journal Télévisé — 19h30 » par « Documentaire : Terres du Cameroun ». Action requise dans vMix.",
      acquittee: false,
    },
    {
      id: uid("a"),
      ts: now - 55 * 60_000,
      heure: "17:58",
      texte: "Grille validée : « Grille Officielle — Semaine en cours » — synchronisation vMix automatique effectuée.",
      acquittee: true,
    },
  ];

  const log: LogEntry[] = [
    { id: uid("l"), ts: now - 12 * 60_000, acteur: "directeur", action: "Modification à l'antenne : remplacement du « Journal Télévisé — 19h30 » (alerte Régie émise)" },
    { id: uid("l"), ts: now - 55 * 60_000, acteur: "directeur", action: "Validation de « Grille Officielle — Semaine en cours »" },
    { id: uid("l"), ts: now - 2 * h, acteur: "admin", action: "Soumission de « Spéciale Fête de la Jeunesse » pour validation" },
    { id: uid("l"), ts: now - 26 * h, acteur: "admin", action: "Publication de « Grille Officielle — Semaine en cours »" },
    { id: uid("l"), ts: now - 27 * h, acteur: "systeme", action: "Synchronisation vMix complète — 0 écart détecté" },
  ];

  return { version: 3, grilles: [speciale, semaine09, bikutsi, officielle], alertes, log };
};

export const DEMO_COMPTES = {
  admin: { email: "admin@balafon.cm", nom: "Sylvie Ekotto" },
  directeur: { email: "direction@balafon.cm", nom: "Martin Njoya" },
  regie: { email: "regie@balafon.cm", nom: "Josué Talla" },
} as const;

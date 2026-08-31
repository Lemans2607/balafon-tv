import type { EmissionCatalogueDemo } from "../utils/planbyAdapter";

/* ============================================================
   Catalogue des émissions RÉELLES de Balafon TV.

   Anciennement emissions_reelles_balafon_tv.json — converti en
   module TypeScript : certains serveurs d'aperçu livrent les
   fichiers .json avec le MIME "application/json", ce qui casse
   le chargement des modules ES (strict MIME type checking).
   Les données sont strictement identiques au fichier JSON.

   Fiabilité de chaque émission :
     - "confirme" : nom, genre et/ou horaire rapportés par
       balafon.media ou la presse (source citée).
     - "estime"   : émission bien réelle (listée sur balafon.media)
       mais dont l'horaire exact n'a pas été retrouvé en ligne ;
       l'heure proposée est une hypothèse plausible pour la démo,
       PAS une donnée vérifiée.

   La grille annoncée par la presse date du lancement du
   1er juillet 2024 : elle a pu évoluer depuis. La façon la plus
   fiable de fiabiliser ce catalogue est de demander la grille de
   diffusion à jour à la régie ou à Mlle Régine Cheukap, puis de
   remplacer les entrées "estime".

   Sources :
     - https://balafon.media/balafon-tv/ (catalogue des émissions)
     - https://lejour.cm/media-balafon-tv-lance-ses-programmes/
       (article du 10/07/2024 sur le lancement de la grille)
   ============================================================ */

export const LISEZ_MOI: string[] = [
  "Ce catalogue sert de jeu de données de démonstration pour peupler la grille EPG du frontend avec de vraies émissions de Balafon TV.",
  "'confirme' : nom, genre et/ou horaire directement rapportés par balafon.media ou par la presse (source citée).",
  "'estime' : émission réelle mais horaire hypothétique pour la démo — à remplacer par la grille officielle de la régie.",
  "Grille presse datée du lancement du 1er juillet 2024 ; elle a pu évoluer depuis.",
];

export interface ChaineCatalogue {
  slug: string;
  nom: string;
  type: "tv" | "radio";
  logo_reference?: string;
  note?: string;
}

/** Structure multi-chaînes — SEUL "balafon-tv" est piloté et affiché par l'application. */
export const CHAINES: ChaineCatalogue[] = [
  {
    slug: "balafon-tv",
    nom: "Balafon TV",
    type: "tv",
    logo_reference: "https://balafon.media/images/logo-balafon-plus-ok.png",
  },
  {
    slug: "radio-balafon",
    nom: "Radio Balafon",
    type: "radio",
    note: "Présente pour la structure multi-chaînes — le portail public n'affiche que Balafon TV, aucune grille radio.",
  },
];

export const CATALOGUE_EMISSIONS_BALAFON_TV: EmissionCatalogueDemo[] = [
  {
    titre: "C'le Matin",
    genre: "infotainment",
    jours: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"],
    heure_debut: "07:00",
    fiabilite: "confirme",
    description: "Réveil matinal de la chaîne, du lundi au vendredi dès 7h.",
    // Visuel réel : plateau de la matinale (Médiatude, mai 2022).
    image_affiche: "https://mediatudecmr.com/wp-content/uploads/2022/05/IMG-20220503-WA0004_copy_1920x1080.jpg",
  },
  {
    titre: "Faut Pas Zapper",
    genre: "talkshow",
    jours: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"],
    heure_debut: "18:00",
    fiabilite: "confirme",
    description:
      "Talk phare de la chaîne, animé par des animateurs et journalistes, du lundi au vendredi dès 18h.",
  },
  {
    titre: "Femme au Contrôle",
    genre: "magazine",
    jours: ["lundi", "mardi", "mercredi", "jeudi"],
    heure_debut: "17:00",
    heure_fin: "18:00",
    fiabilite: "confirme",
    description: "Débats de société, du lundi au jeudi de 17h à 18h.",
  },
  {
    titre: "Les Meufs",
    genre: "magazine",
    jours: ["vendredi"],
    heure_debut: "17:00",
    fiabilite: "confirme",
    description:
      "Argent, amour, sexualité, vie en couple — présenté par Claire Luce Angouandé, chaque vendredi à 17h (occupe le créneau de 'Femme au Contrôle' le vendredi).",
  },
  {
    titre: "Top 25 Hit-Parade",
    genre: "musique",
    jours: ["samedi"],
    heure_debut: "15:00",
    fiabilite: "estime",
    description:
      "Classement de chansons, le samedi (jour confirmé par la source ; heure de 15h proposée pour la démo).",
  },
  {
    titre: "C'le Weekend",
    genre: "talk",
    jours: ["samedi"],
    heure_debut: "20:30",
    fiabilite: "confirme",
    description:
      "Talk animé personnellement par Cyrille Bojiko (fondateur de Balafon Media), qui y reçoit des personnalités, chaque samedi à 20h30.",
  },
  {
    titre: "Grand Plateau",
    genre: "actualite",
    jours: ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"],
    heure_debut: "19:30",
    fiabilite: "estime",
    description: "Journal d'actualité de la chaîne (heure proposée pour la démo : édition du soir).",
  },
  {
    titre: "Entretien",
    genre: "magazine",
    jours: ["mardi", "jeudi"],
    heure_debut: "20:00",
    fiabilite: "estime",
    description: "Format entretien/interview (existence confirmée par le catalogue balafon.media, jours/heure estimés).",
  },
  {
    titre: "Moment de Sports",
    genre: "sport",
    jours: ["lundi", "mercredi", "vendredi"],
    heure_debut: "16:00",
    fiabilite: "estime",
    description: "Actualité sportive (existence confirmée, jours/heure estimés).",
    // Visuel réel : émission spéciale présentée sur Balafon TV (Médiatude).
    image_affiche: "https://mediatudecmr.com/wp-content/uploads/2026/06/Jean-Paul-Choun-Nyat-390x220.jpg",
  },
  {
    titre: "Télé-Zoom",
    genre: "magazine",
    jours: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"],
    heure_debut: "15:00",
    fiabilite: "estime",
    description: "Magazine d'après-midi (existence confirmée, jours/heure estimés).",
  },
  {
    titre: "Grand Déballage",
    genre: "telerealite",
    jours: ["dimanche"],
    heure_debut: "20:00",
    fiabilite: "estime",
    description: "Téléréalité (existence confirmée, jour/heure estimés).",
  },
  {
    titre: "Télémarché",
    genre: "mag-promo",
    jours: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"],
    heure_debut: "13:00",
    fiabilite: "estime",
    description:
      "Programme promotionnel conçu pour accompagner les startups et commerces locaux (existence confirmée, créneau estimé).",
  },
  {
    titre: "Séries Cultes",
    genre: "serie",
    jours: ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"],
    heure_debut: "21:00",
    fiabilite: "estime",
    description: "Case de séries en soirée (existence confirmée par le catalogue balafon.media, créneau estimé).",
  },
];

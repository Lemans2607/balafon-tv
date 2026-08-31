/* ============================================================
   Synopsis éditoriaux — fiches programme du portail public.
   Contenus rédigés pour la démonstration à partir du catalogue
   réel Balafon TV (balafon.media) ; à remplacer par les synopsis
   officiels fournis par la rédaction.
   ============================================================ */

export interface SynopsisEmission {
  /** Paragraphe d'ouverture de la fiche */
  intro: string;
  /** « Dans cet épisode » — trois temps forts */
  moments: string[];
  /** Ligne de présentation courte (animé par…, format…) */
  format?: string;
  /** Générique affiché sous le moniteur de régie (« À l'antenne : … », « Présentation : … ») */
  credits?: string;
}

export const SYNOPSES: Record<string, SynopsisEmission> = {
  "p-c-le-matin": {
    intro:
      "Le réveil de Douala commence ici. Chaque matin de la semaine, C'le Matin assemble en deux heures tout ce qu'il faut pour attaquer la journée : l'essentiel de l'actualité, la météo du littoral, les infos circulation et une dose généreuse de bonne humeur.",
    moments: [
      "Le tour de l'actu nationale et régionale à 07 h 10",
      "L'invité du matin : un acteur de la vie locale sans langue de bois",
      "La chronique conso et les bons plans du Grand Douala",
    ],
    format: "Infotainment quotidien · du lundi au vendredi · 07:00 – 09:00",
    credits: "À l'antenne : Équipe Matinale",
  },
  "p-faut-pas-zapper": {
    intro:
      "Le talk phare de Balafon TV. Autour de la table, animateurs et journalistes croisent le fer sur les sujets qui font parler le Cameroun : société, médias, buzz et polémiques du moment — avec des invités qui répondent vraiment aux questions.",
    moments: [
      "Le grand débat du jour, sans montage ni coupure",
      "Le fact-checking express des rumeurs de la semaine",
      "Le face-à-face final avec l'invité fil rouge",
    ],
    format: "Talk-show · du lundi au vendredi · 18:00",
    credits: "Présentation : Animateurs & Journalistes Balafon TV",
  },
  "p-femme-au-controle": {
    intro:
      "Une heure de débats de société portée par des femmes qui prennent la main. Éducation, entrepreneuriat, santé, égalité : chaque édition met un thème sur la table et laisse la parole au plateau comme au public.",
    moments: [
      "Le thème de la semaine décortiqué en trois actes",
      "Les témoignages de femmes entrepreneures du 237",
      "Le conseil pratique de l'experte invitée",
    ],
    format: "Magazine de société · du lundi au jeudi · 17:00 – 18:00",
    credits: "Présentation : Panel Société",
  },
  "p-les-meufs": {
    intro:
      "Argent, amour, sexualité, vie de couple : tout ce dont on parle entre amies, à l'antenne. Présenté par Claire Luce Angouandé, le rendez-vous du vendredi qui dit les choses comme elles sont.",
    moments: [
      "Le sujet sans tabou de la semaine",
      "Le courrier des téléspectatrices lu en plateau",
      "Le verdict du panel : pour ou contre ?",
    ],
    format: "Magazine · chaque vendredi · 17:00",
    credits: "Présentation : Claire Luce Angouandé",
  },
  "p-top-25-hit-parade": {
    intro:
      "Le classement musical de référence de la chaîne : 25 titres, un compte à rebours, et le public qui vote. Makossa, afropop, gospel, rap — tout le spectre sonore camerounais et africain passe au crible chaque samedi.",
    moments: [
      "Les 5 entrées de la semaine commentées en plateau",
      "Les clips exclusifs des artistes en montée",
      "Le numéro 1 révélé en fin d'émission",
    ],
    format: "Classement musical · samedi · 15:00",
    credits: "À l'antenne : Équipe Musicale Balafon TV",
  },
  "p-c-le-weekend": {
    intro:
      "L'émission personnelle de Cyrille Bojiko, fondateur de Balafon Media Group. Chaque samedi soir, il reçoit des personnalités qui font le Cameroun — artistes, entrepreneurs, sportifs — pour des conversations longues, rares à la télévision.",
    moments: [
      "L'entretien sans chrono avec l'invité d'honneur",
      "Les archives : le parcours en images",
      "La question du public posée en direct",
    ],
    format: "Grand entretien · samedi · 20:30",
    credits: "Présentation : Cyrille Bojiko",
  },
  "p-grand-plateau": {
    intro:
      "Le journal de Balafon TV. L'actualité du Cameroun et de l'Afrique, vérifiée et hiérarchisée, avec les correspondants de la rédaction et les décryptages du plateau. Le rendez-vous du soir pour comprendre la journée.",
    moments: [
      "Les titres et le développement des dossiers du jour",
      "L'analyse de la rédaction en plateau",
      "Le tour des régions et l'actualité internationale",
    ],
    format: "Journal télévisé · tous les jours · 19:30",
    credits: "À l'antenne : Rédaction Centrale Balafon TV",
  },
  "p-entretien": {
    intro:
      "Un format resserré, une caméra proche : un invité, une conversation. Entretien va chercher ceux qui font l'actualité loin des conférences de presse — le temps de quelques questions qui comptent vraiment.",
    moments: [
      "L'invité se raconte sans prompteur",
      "Les trois questions que personne n'ose poser",
      "Le mot de la fin, en une phrase",
    ],
    format: "Entretien · mardi et jeudi · 20:00",
    credits: "Interviews : Rédaction Balafon TV",
  },
  "p-moment-de-sports": {
    intro:
      "L'actualité sportive au rythme du calendrier : championnats locaux, Lions Indomptables, disciplines émergentes. Résultats, analyses et images des terrains, trois fois par semaine.",
    moments: [
      "Le débrief des matchs du week-end",
      "Le zoom tactique sur l'équipe du moment",
      "L'agenda sportif de la semaine",
    ],
    format: "Magazine sportif · lundi, mercredi, vendredi · 16:00",
    credits: "À l'antenne : Rédaction des Sports",
  },
  "p-tele-zoom": {
    intro:
      "Le magazine de l'après-midi qui zoome sur la culture et la vie urbaine : arts, mode, gastronomie, initiatives locales. Un regard curieux sur celles et ceux qui font bouger le Cameroun.",
    moments: [
      "Le reportage long format de la semaine",
      "L'agenda culturel du Grand Douala",
      "Le portrait d'un créateur ou d'une créatrice",
    ],
    format: "Magazine culturel · du lundi au vendredi · 15:00",
    credits: "Magazine : Équipe Culture",
  },
  "p-grand-deballage": {
    intro:
      "La téléréalité du dimanche soir : des candidats, des défis et un public qui départage. Un format divertissant pensé pour la famille, entre compétition et confessions.",
    moments: [
      "L'épreuve éliminatoire de la semaine",
      "Les confessions du confessionnal",
      "Le verdict des téléspectateurs en direct",
    ],
    format: "Téléréalité · dimanche · 20:00",
    credits: "Présentation : Médiatrice Rachel & Collège d'experts",
  },
  "p-telemarche": {
    intro:
      "La vitrine télé des startups et commerces locaux. Télémarché accompagne les entrepreneurs camerounais en leur offrant une exposition nationale — produits, services et innovations made in 237.",
    moments: [
      "La startup de la semaine présentée par son fondateur",
      "Les offres et promotions des partenaires",
      "Le contact direct avec les commerçants à l'écran",
    ],
    format: "Émission promotionnelle · du lundi au vendredi · 13:00",
  },
  "p-series-cultes": {
    intro:
      "La case fiction de la soirée : séries camerounaises et africaines, cultes ou inédites. Chaque soir, un épisode pour retrouver des personnages qu'on connaît par cœur — ou en découvrir de nouveaux.",
    moments: [
      "L'épisode du soir, en version intégrale",
      "Le rappel « précédemment » pour les retardataires",
      "La bande-annonce des épisodes de la semaine",
    ],
    format: "Case séries · tous les jours · 21:00",
    credits: "Case : Fiction Balafon TV",
  },
  "p-rediff": {
    intro:
      "Reprise d'une émission phare de Balafon TV pour assurer la continuité de l'antenne. L'occasion de (re)découvrir un moment fort passé à l'antenne cette semaine.",
    moments: ["Un format phare de la semaine en rediffusion"],
  },
  "p-clips": {
    intro:
      "Le son du 237 en continu : une sélection de clips d'artistes camerounais et africains, entre deux émissions. Makossa, afropop, gospel et urbains s'enchaînent à l'antenne.",
    moments: ["Les hits du moment", "Les nouveautés de la scène locale"],
  },
};

export function synopsisDe(programId: string): SynopsisEmission | null {
  return SYNOPSES[programId] ?? null;
}

import type { BlocPlace, Categorie, Grille, Programme, Role, StatutGrille } from "../types";

/* ——— Slots : 36 × 30 min, de 06:00 à 24:00 ——— */

export const SLOTS = 36;
export const SLOT_MIN = 30;
export const DEBUT_JOUR_MIN = 6 * 60; // 06:00

export const slotDebutMin = (slot: number): number => DEBUT_JOUR_MIN + slot * SLOT_MIN;

export const toHHMM = (min: number): string => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Fin de journée affichée « 24:00 » pour la lisibilité EPG. */
export const finHHMM = (min: number): string => (min >= 1440 ? "24:00" : toHHMM(min));

export const slotLabel = (slot: number): string => toHHMM(slotDebutMin(slot));
export const slotsPour = (duree: number): number => Math.max(1, Math.round(duree / SLOT_MIN));
export const finBlocLabel = (slot: number, duree: number): string =>
  finHHMM(slotDebutMin(slot) + duree);

/* ——— Jours ——— */

export const JOURS_COURT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const JOURS_LONG = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export const jourIdxAujourdhui = (d: Date = new Date()): number => (d.getDay() + 6) % 7;

/* ——— Occupation & trous ——— */

export const programmeDe = (programmes: Programme[], id: string): Programme | undefined =>
  programmes.find((p) => p.id === id);

export const occupation = (blocs: BlocPlace[], programmes: Programme[]): boolean[] => {
  const occ = new Array<boolean>(SLOTS).fill(false);
  for (const b of blocs) {
    const p = programmeDe(programmes, b.programmeId);
    if (!p) continue;
    const n = slotsPour(p.duree);
    for (let k = 0; k < n; k++) if (b.slot + k < SLOTS) occ[b.slot + k] = true;
  }
  return occ;
};

export const trousDe = (blocs: BlocPlace[], programmes: Programme[]): number[] =>
  occupation(blocs, programmes).map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);

export const trousGrille = (g: Grille, programmes: Programme[]): number =>
  g.jours.reduce((s, j) => s + trousDe(j, programmes).length, 0);

export const estComplete = (g: Grille, programmes: Programme[]): boolean =>
  trousGrille(g, programmes) === 0;

/** Le bloc qui couvre un slot donné (un bloc occupe plusieurs slots). */
export const blocCouvrant = (
  blocs: BlocPlace[],
  programmes: Programme[],
  slot: number
): BlocPlace | undefined =>
  blocs.find((b) => {
    const p = programmeDe(programmes, b.programmeId);
    if (!p) return false;
    return slot >= b.slot && slot < b.slot + slotsPour(p.duree);
  });

export const peutPlacer = (
  blocs: BlocPlace[],
  programmes: Programme[],
  slot: number,
  duree: number,
  ignorerBlocId?: string
): boolean => {
  const n = slotsPour(duree);
  if (slot < 0 || slot + n > SLOTS) return false;
  const autres = blocs.filter((b) => b.id !== ignorerBlocId);
  return !autres.some((b) => {
    const p = programmeDe(programmes, b.programmeId);
    if (!p) return false;
    const nB = slotsPour(p.duree);
    return slot < b.slot + nB && b.slot < slot + n;
  });
};

/* ——— Direct / à suivre ——— */

export const minutesJour = (d: Date): number => d.getHours() * 60 + d.getMinutes();

export interface LiveInfo {
  bloc: BlocPlace;
  prog: Programme;
  progres: number; // 0–100
}

export const enDirectMaintenant = (
  grille: Grille | undefined,
  programmes: Programme[],
  now: Date
): LiveInfo | null => {
  if (!grille) return null;
  const m = minutesJour(now);
  if (m < DEBUT_JOUR_MIN) return null; // nuit — antenne fermée
  const blocs = grille.jours[jourIdxAujourdhui(now)] ?? [];
  for (const b of blocs) {
    const p = programmeDe(programmes, b.programmeId);
    if (!p) continue;
    const debut = slotDebutMin(b.slot);
    const fin = debut + p.duree;
    if (m >= debut && m < fin) {
      return { bloc: b, prog: p, progres: ((m - debut) / p.duree) * 100 };
    }
  }
  return null;
};

export const aSuivreAujourdhui = (
  grille: Grille | undefined,
  programmes: Programme[],
  now: Date
): { bloc: BlocPlace; prog: Programme }[] => {
  if (!grille) return [];
  const m = minutesJour(now);
  const blocs = grille.jours[jourIdxAujourdhui(now)] ?? [];
  return blocs
    .map((bloc) => ({ bloc, prog: programmeDe(programmes, bloc.programmeId) }))
    .filter((x): x is { bloc: BlocPlace; prog: Programme } => Boolean(x.prog))
    .filter((x) => slotDebutMin(x.bloc.slot) >= m)
    .sort((a, b) => a.bloc.slot - b.bloc.slot);
};

/* ——— Divers ——— */

export const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const ilYa = (ts: number): string => {
  const min = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} j`;
};

/* ——— Référentiels d'affichage ——— */

export const CATS: Record<Categorie, { label: string; color: string }> = {
  information: { label: "Information", color: "#3D9BFF" },
  divertissement: { label: "Divertissement", color: "#FF5CA8" },
  sport: { label: "Sport", color: "#00D1FF" },
  culture: { label: "Culture", color: "#B18CFF" },
  film: { label: "Film & Série", color: "#FF8A3D" },
  jeunesse: { label: "Jeunesse", color: "#FFE06B" },
};

export const TYPES: Record<string, string> = {
  direct: "Direct",
  enregistre: "Enregistré",
  rediffusion: "Rediffusion",
};

export const STATUTS: Record<StatutGrille, { label: string; color: string }> = {
  brouillon: { label: "Brouillon", color: "#FFB800" },
  en_attente: { label: "En attente de validation", color: "#FFB800" },
  validee: { label: "Validée pour diffusion", color: "#00F5A0" },
};

export const ROLES: Record<Role, { label: string; court: string }> = {
  admin: { label: "Administrateur", court: "Admin" },
  directeur: { label: "Directeur d'Antenne", court: "Directeur" },
  regie: { label: "Régie de Diffusion", court: "Régie" },
};

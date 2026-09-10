import type { Theme } from "planby";

/* ============================================================
   BROADCAST CONTROL PREMIUM — Thème Planby Balafon Studio
   Inspiré des moniteurs de diffusion Canal+ / DSTV : fond quasi-noir
   (#0C0C0E → #141417), surfaces stratifiées, séparateurs quasi
   invisibles. Volontairement TOUJOURS sombre — comme un moniteur de
   régie — indépendamment du thème clair/sombre choisi pour le reste
   du site (voir commentaire dans BalafonEpg.tsx).
   ============================================================ */
export const planbyTheme: Theme = {
  primary: {
    600: "#1A1F2E",
    900: "#0C0C0E",
  },
  grey: {
    300: "#9CA3AF",
  },
  white: "#F7F8FA",
  green: {
    300: "#00F5A0",
  },
  loader: {
    teal: "#00F5A0",
    purple: "#0F6BD6",
    pink: "#E31E24",
    bg: "#0C0C0Edb",
  },
  scrollbar: {
    border: "#0C0C0E",
    thumb: {
      bg: "#2A3142",
    },
  },
  gradient: {
    blue: {
      300: "#2A3142",
      600: "#1A1F2E",
      900: "#141417",
    },
  },
  text: {
    grey: {
      300: "#9CA3AF",
      500: "#6B7280",
    },
  },
  timeline: {
    divider: {
      bg: "#232A3B",
    },
  },
};

/** ============================================================
 *  Géométrie EPG — proportions « broadcast » larges et aérées
 *  plutôt que la grille dense compressée d'un tableur.
 *  - itemHeight (rowHeight) : assez haut pour titre + horaires + badge
 *    + amorce de synopsis, sans jamais ressembler à une ligne Excel.
 *  - dayWidth : détermine hourWidth = dayWidth / 24. On vise ~200px/h
 *    (≈ 3,3px/min) pour que même un créneau de 30 min garde un vrai
 *    bloc horizontal lisible façon Canal+ (jamais un timbre-poste).
 *  - sidebarWidth : large, pour loger un logo de chaîne net + un nom
 *    en typo bold + un statut « à l'antenne » sans compression.
 *  ============================================================ */
export const EPG_GEOMETRY = {
  dayWidth: 4800, // 24h × 200px/h
  sidebarWidth: 240,
  itemHeight: 108,
};

export const PLANBY_GLOBAL_CSS = `
  .planby { font-family: 'Manrope', 'Segoe UI', sans-serif; }
  .planby [data-testid="timeline"] { border-bottom: 1px solid #1A1F2E; }
  .planby [data-testid="sidebar"] { border-right: 1px solid #1A1F2E; }
  .planby [data-testid="content"]::-webkit-scrollbar { height: 10px; width: 10px; }
  .planby [data-testid="content"]::-webkit-scrollbar-track { background: #0C0C0E; }
  .planby [data-testid="content"]::-webkit-scrollbar-thumb { background: #2A3142; border-radius: 999px; }
`;

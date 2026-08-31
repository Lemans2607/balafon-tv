import type { Theme } from "planby";

/* ============================================================
   BROADCAST CONTROL PREMIUM — Thème Planby Balafon Studio
   Fond #0B0E14 · surfaces sombres · séparateurs subtils
   ============================================================ */
export const planbyTheme: Theme = {
  primary: {
    600: "#1A1F2E",
    900: "#0B0E14",
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
    purple: "#2E77D0",
    pink: "#F2790F",
    bg: "#0B0E14db",
  },
  scrollbar: {
    border: "#0B0E14",
    thumb: {
      bg: "#2A3142",
    },
  },
  gradient: {
    blue: {
      300: "#2A3142",
      600: "#1A1F2E",
      900: "#111622",
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
      bg: "#2A3142",
    },
  },
};

/** Géométrie EPG partagée — 1 minute = 2,5 px */
export const EPG_GEOMETRY = {
  dayWidth: 3600, // px pour la fenêtre affichée
  sidebarWidth: 176,
  itemHeight: 96,
};

export const PLANBY_GLOBAL_CSS = `
  .planby { font-family: 'Manrope', 'Segoe UI', sans-serif; }
  .planby [data-testid="timeline"] { border-bottom: 1px solid #1A1F2E; }
  .planby [data-testid="sidebar"] { border-right: 1px solid #1A1F2E; }
`;

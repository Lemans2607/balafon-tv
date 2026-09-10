/**
 * Thème de l'EPG (« thème Planby ») — surfaces, grille et états de la timeline.
 *
 * Le moteur EPG interne consomme ces objets pour rester indépendant du rendu :
 * les règles métier (trous, validation, publication, rôles, alertes, vMix)
 * vivent dans les stores et services, jamais dans la timeline.
 */

export interface EpgTheme {
  appBg: string;
  trackBg: string;
  headerBg: string;
  divider: string;
  dividerMinor: string;
  textMuted: string;
  textFaint: string;
  offAirStripe: string;
  gapHatchA: string;
  gapHatchB: string;
  playhead: string;
}

/** Thème sombre — Broadcast Control. */
export const planbyTheme: EpgTheme = {
  appBg: "#0B0E14",
  trackBg: "#111622",
  headerBg: "#0B0E14",
  divider: "#232A3E",
  dividerMinor: "rgba(255,255,255,0.05)",
  textMuted: "#9CA3AF",
  textFaint: "rgba(255,255,255,0.42)",
  offAirStripe: "rgba(255,255,255,0.05)",
  gapHatchA: "rgba(255,61,0,0.22)",
  gapHatchB: "rgba(255,61,0,0.06)",
  playhead: "#FF3D00",
};

/** Thème clair — surfaces éditoriales (défaut). */
export const planbyThemeLight: EpgTheme = {
  appBg: "#EDF1F8",
  trackBg: "#FFFFFF",
  headerBg: "#EDF1F8",
  divider: "#D9E0EF",
  dividerMinor: "rgba(16,21,31,0.06)",
  textMuted: "#45516B",
  textFaint: "rgba(16,21,31,0.5)",
  offAirStripe: "rgba(16,21,31,0.05)",
  gapHatchA: "rgba(239,68,68,0.20)",
  gapHatchB: "rgba(239,68,68,0.05)",
  playhead: "#FF3D00",
};

export function epgThemePour(theme: "light" | "dark"): EpgTheme {
  return theme === "light" ? planbyThemeLight : planbyTheme;
}

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ============================================================
   Thème Balafon Plus — sombre (broadcast) / clair.
   Les couleurs de marque (rouge #E31E24, bleu #0F6BD6) sont
   conservées dans les deux thèmes ; seules les neutres basculent.
   La classe `theme-light` est appliquée sur <html> par App.
   ============================================================ */

export type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (t) => set({ theme: t }),
      toggle: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
    }),
    { name: "balafon-theme-v1" }
  )
);

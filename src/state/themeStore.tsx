import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Thème global Balafon Studio.
 *
 * - Le thème CLAIR est le thème par défaut (décision produit).
 * - Les anciennes préférences sombres enregistrées sont migrées automatiquement :
 *   une valeur « dark » existante est conservée, sinon on bascule en clair.
 * - Les surfaces Studio, l'EPG et les panneaux d'erreur suivent le thème via
 *   les jetons CSS définis dans index.css ([data-theme="light" | "dark"]).
 */

export type Theme = "light" | "dark";

const LS_KEY = "balafon-guide-theme";
const LEGACY_KEYS = ["balafon_studio_theme", "balafon-theme"];

interface ThemeCtx {
  theme: Theme;
  basculer: () => void;
  definir: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function lirePreference(): Theme {
  try {
    const actuel = localStorage.getItem(LS_KEY);
    if (actuel === "light" || actuel === "dark") return actuel;
    /* Migration automatique des anciennes préférences sombres */
    for (const k of LEGACY_KEYS) {
      const v = localStorage.getItem(k);
      if (v === "dark") return "dark";
    }
  } catch {
    /* stockage indisponible */
  }
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(lirePreference);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(LS_KEY, theme);
    } catch {
      /* stockage indisponible */
    }
  }, [theme]);

  const basculer = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);
  const definir = useCallback((t: Theme) => setTheme(t), []);

  const value = useMemo(() => ({ theme, basculer, definir }), [theme, basculer, definir]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme doit être utilisé sous <ThemeProvider>");
  return ctx;
}

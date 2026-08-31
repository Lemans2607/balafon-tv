import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../../store/themeStore";

/* Bascule sombre / clair — conserve les couleurs de marque Balafon. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const light = theme === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? "Passer en thème sombre" : "Passer en thème clair"}
      title={light ? "Thème sombre" : "Thème clair"}
      className="group relative flex h-8 items-center gap-1 rounded-full border border-ink-600 bg-ink-800 px-1 transition-colors hover:border-ink-500"
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 ${
          light ? "translate-x-7 bg-goldwarn/25 text-goldwarn" : "translate-x-0 bg-ocean/25 text-ocean-soft"
        }`}
      >
        {light ? <Sun size={13} aria-hidden /> : <Moon size={13} aria-hidden />}
      </span>
      {!compact && (
        <span className="pr-2 text-[10.5px] font-bold uppercase tracking-wide text-mist">
          {light ? "Clair" : "Sombre"}
        </span>
      )}
    </button>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================================
   useFullscreen — bascule plein écran (Fullscreen API) pour la
   zone de visualisation de la régie. Repli propre si l'API est
   indisponible (iframe sandboxé, ancien navigateur).
   ============================================================ */
export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(async () => {
    const el = ref.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* API indisponible : on ignore silencieusement */
    }
  }, []);

  return { ref, isFullscreen, toggle };
}

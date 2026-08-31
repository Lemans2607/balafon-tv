import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================================
   Plein écran (Fullscreen API) — maximise la zone de
   visualisation de la régie pour le mur d'écrans.
   ============================================================ */
export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const supported =
    typeof document !== "undefined" &&
    Boolean(document.documentElement.requestFullscreen);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(() => {
    if (!supported) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void ref.current?.requestFullscreen().catch(() => undefined);
    }
  }, [supported]);

  return { ref, isFullscreen, toggle, supported };
}

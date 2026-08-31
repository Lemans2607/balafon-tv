/* ============================================================
   Point d'entrée.
   Le panneau de diagnostic global est installé dans index.html
   (avant l'évaluation des modules) — ici on complète avec la
   capture des erreurs de montage React et un log structuré.
   ============================================================ */
import "./polyfills";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

declare global {
  interface Window {
    __balafonPanneau?: (titre: string, detail: string, accent?: string) => void;
  }
}

const rootEl = document.getElementById("root");

try {
  if (!rootEl) throw new Error("Élément #root introuvable dans index.html");
  ReactDOM.createRoot(rootEl).render(<App />);
} catch (err) {
  const message = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
  console.error("[BALAFON + GUIDE] Échec du montage React :", err);
  window.__balafonPanneau?.("Échec du montage de l’interface", message);
}

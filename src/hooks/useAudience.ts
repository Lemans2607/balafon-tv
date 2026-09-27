import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  envoyerBattement,
  fetchAudienceDirect,
  fetchClassementAudience,
  fetchCourbeAudience,
  isBackendConfigured,
} from "../services/backend";

/* ============================================================
   Mesure d'audience du portail public
   Nouveau fichier — alimente src/pages/staff/AudiencePage.tsx.

   Ce que la Direction d'Antenne a demandé : « voir le nombre de
   visiteurs qui suivent l'émission en cours, et pour chaque
   émission savoir laquelle est la plus écoutée ». Ces trois hooks
   couvrent exactement ça, contre la nouvelle app Django `audience`.

   Précision honnête à garder pour la soutenance : ceci compte des
   ONGLETS OUVERTS sur le portail (un battement toutes les 30 s tant
   que l'onglet est visible), pas des téléviseurs. À présenter comme
   « écrans connectés au guide », jamais comme une audience TV — une
   vraie mesure d'audience télévisuelle passerait par un panel ou les
   données d'un opérateur, hors de portée d'un stage.
   ============================================================ */

/** Identifiant de session anonyme, stable sur l'onglet (pas de cookie tiers). */
function idSession(): string {
  const cle = "balafon.audience.session";
  let v = sessionStorage.getItem(cle);
  if (!v) {
    v = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(cle, v);
  }
  return v;
}

/**
 * Déclare l'écran comme suivant l'émission en cours. Silencieuse à
 * dessein (voir services/backend.ts::envoyerBattement) : une mesure
 * d'audience ne doit jamais gêner un téléspectateur.
 */
export function useAudienceHeartbeat(emissionId?: number) {
  const ref = useRef(emissionId);
  ref.current = emissionId;

  useEffect(() => {
    if (!isBackendConfigured()) return;
    const session = idSession();

    const battre = () => {
      if (document.visibilityState === "visible") void envoyerBattement(session, ref.current);
    };

    battre();
    const t = window.setInterval(battre, 30_000);
    document.addEventListener("visibilitychange", battre);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", battre);
    };
  }, []);
}

export function useAudienceDirect() {
  return useQuery({
    queryKey: ["audience", "direct"],
    queryFn: fetchAudienceDirect,
    enabled: isBackendConfigured(),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
}

export function useAudienceClassement(jours: number) {
  return useQuery({
    queryKey: ["audience", "classement", jours],
    queryFn: () => fetchClassementAudience(jours),
    enabled: isBackendConfigured(),
    refetchInterval: 120_000,
  });
}

export function useAudienceCourbe(emissionId: number | null, heures = 24) {
  return useQuery({
    queryKey: ["audience", "courbe", emissionId, heures],
    queryFn: () => fetchCourbeAudience(emissionId as number, heures),
    enabled: isBackendConfigured() && emissionId !== null,
  });
}

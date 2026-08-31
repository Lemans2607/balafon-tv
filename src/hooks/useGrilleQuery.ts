import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { fetchGrillesValidees, isBackendConfigured } from "../services/backend";
import { useScheduleStore } from "../store/scheduleStore";
import type { GrilleAPI } from "../utils/planbyAdapter";

/* ============================================================
   Stratégie de mise en cache React Query pour les grilles.

   Objectif : un diffuseur (régie) consulte TOUJOURS la dernière
   grille chargée, même en cas de perte de connexion réseau.

   - staleTime  : 5 min — les données restent « fraîches », pas de
     refetch agressif à chaque montage de composant.
   - gcTime     : 30 min — le cache survit au démontage, la grille
     reste disponible hors-ligne dans la fenêtre de garde.
   - networkMode: 'offlineFirst' — sert le cache quand le réseau
     tombe, puis resynchronise au retour (`refetchOnReconnect`).
   - À chaque succès, la grille est hydratée dans le store Zustand
     (source de vérité de l'EPG), donc l'affichage persiste aussi.
   ============================================================ */

const STALE_TIME_MS = 5 * 60 * 1000;
const GC_TIME_MS = 30 * 60 * 1000;

export function useGrilleQuery() {
  const hydrate = useScheduleStore((s) => s.hydrateFromApi);
  const hydratedOnce = useRef(false);

  const query = useQuery<GrilleAPI[] | null>({
    queryKey: ["grilles-validees"],
    queryFn: () => (isBackendConfigured() ? fetchGrillesValidees() : Promise.resolve(null)),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    networkMode: "offlineFirst",
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  /* Hydrate le store dès qu'un lot de grilles arrive (API ou cache). */
  useEffect(() => {
    if (query.data && query.data.length > 0 && !hydratedOnce.current) {
      hydrate(query.data);
      hydratedOnce.current = true;
    }
  }, [query.data, hydrate]);

  const horsLigne = typeof navigator !== "undefined" && !navigator.onLine;
  return {
    ...query,
    /** Vrai si la grille affichée vient du cache (réseau perdu). */
    depuisCache: query.isFetched && (horsLigne || query.fetchStatus === "idle"),
  };
}

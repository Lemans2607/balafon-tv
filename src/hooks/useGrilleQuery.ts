import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { fetchGrillesValidees, isBackendConfigured, type Reponse } from "../services/backend";
import { useScheduleStore } from "../store/scheduleStore";
import type { GrilleAPI } from "../utils/planbyAdapter";

/* ============================================================
   Stratégie de synchronisation de la grille              [CORRIGÉ]

   Trois défauts corrigés par rapport à la version précédente :

   1. `fetchGrillesValidees()` renvoyait `null` aussi bien pour
      « backend injoignable » que pour « la base est vide » : une
      grille vidée dans Django n'était donc jamais effacée côté
      public. Le type `Reponse<T>` distingue maintenant les deux cas
      (voir services/backend.ts et MODIFICATIONS.md).

   2. `hydratedOnce.current` n'hydratait qu'une seule fois pour toute
      la durée de vie de l'onglet : toute modification faite dans
      Django après le chargement initial n'était JAMAIS reprise sans
      rechargement complet de la page. Remplacé par un rafraîchissement
      périodique + au retour de focus + à la reconnexion réseau.
      L'invalidation immédiate sur alerte WebSocket est déclenchée
      depuis App.tsx (voir Root()), qui possède déjà l'unique connexion
      WebSocket de l'app (services/realtime.ts) : ce hook n'en ouvre
      pas une seconde, pour éviter deux sockets concurrentes vers le
      même /ws/alertes/.

   3. Ce hook n'était appelé que par RegieControl.tsx — le reste de
      l'app (portail public, App.tsx) hydratait séparément via son
      propre effet ponctuel. App.tsx appelle désormais ce même hook :
      une seule source de vérité, un seul cache React Query partagé
      (clé CLE_GRILLES).
   ============================================================ */

export const CLE_GRILLES = ["grilles-validees"] as const;

export function useGrilleQuery() {
  const hydrateFromApi = useScheduleStore((s) => s.hydrateFromApi);
  const viderGrille = useScheduleStore((s) => s.viderGrille);
  const actif = isBackendConfigured();

  const query = useQuery<Reponse<GrilleAPI[]>>({
    queryKey: CLE_GRILLES,
    queryFn: fetchGrillesValidees,
    enabled: actif,
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 20_000,
    retry: 1,
    networkMode: "always",
  });

  /* Applique le résultat au store — trois issues possibles. */
  useEffect(() => {
    const r = query.data;
    if (!r) return;
    if (r.etat === "ok") {
      hydrateFromApi(r.donnees);
    } else if (r.etat === "vide") {
      // « Vide » est un succès (base réellement vide) : on efface
      // vraiment la grille, on ne retombe pas sur le cache local.
      viderGrille("Aucune grille validée côté Django.");
    } else {
      console.warn("[BALAFON + GUIDE] Backend injoignable :", r.raison);
    }
  }, [query.data, hydrateFromApi, viderGrille]);

  const horsLigne = typeof navigator !== "undefined" && !navigator.onLine;
  return {
    ...query,
    /** "demo" | "chargement" | "synchronise" | "vide" | "hors-ligne" — pour l'IU. */
    etatSynchro: !actif
      ? ("demo" as const)
      : query.isPending
        ? ("chargement" as const)
        : query.data?.etat === "ok"
          ? ("synchronise" as const)
          : query.data?.etat === "vide"
            ? ("vide" as const)
            : ("hors-ligne" as const),
    depuisCache: query.isFetched && horsLigne,
  };
}

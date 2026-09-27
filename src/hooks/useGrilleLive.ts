/* ============================================================
   useGrilleLive — synchronisation continue Django ⇄ interface
   Nouveau fichier : src/hooks/useGrilleLive.ts

   Remplace l'hydratation unique faite dans App.tsx
   (useEffect(..., []) exécuté une seule fois au démarrage).

   Trois déclencheurs de rafraîchissement :
     1. intervalle   — toutes les 45 s tant que l'onglet est visible ;
     2. focus        — au retour sur l'onglet (l'admin a pu modifier
                       la grille dans un autre onglet) ;
     3. WebSocket    — message « grille.modifiee » poussé par Django
                       (signaux post_save / post_delete), invalidation
                       immédiate : la suppression apparaît en < 1 s.

   Et le sens inverse : useMutationEmission() écrit dans Django puis
   invalide le cache, avec mise à jour optimiste et rollback.
   ============================================================ */
import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchGrillesValidees,
  getWsUrl,
  isBackendConfigured,
  type Reponse,
} from "../services/backend";
import { useScheduleStore } from "../store/scheduleStore";
import type { GrilleAPI } from "../utils/planbyAdapter";

export const CLE_GRILLE = ["grilles", "validees"] as const;

export type EtatSynchro = "demo" | "chargement" | "synchronise" | "vide" | "hors-ligne";

/* ------------------------------------------------------------------ */
/*  Lecture — la grille suit le backend en continu                     */
/* ------------------------------------------------------------------ */

export function useGrilleLive() {
  const qc = useQueryClient();
  const hydrateFromApi = useScheduleStore((s) => s.hydrateFromApi);
  const viderGrille = useScheduleStore((s) => s.viderGrille);
  const actif = isBackendConfigured();

  const requete = useQuery<Reponse<GrilleAPI[]>>({
    queryKey: CLE_GRILLE,
    queryFn: fetchGrillesValidees,
    enabled: actif,
    refetchInterval: 45_000,
    refetchIntervalInBackground: false, // on ne sollicite pas le serveur onglet caché
    refetchOnWindowFocus: true, // surcharge volontaire du défaut global
    refetchOnReconnect: true,
    staleTime: 20_000,
    retry: 1,
    networkMode: "always",
  });

  /* ---- Application du résultat au store -------------------------- */
  useEffect(() => {
    const r = requete.data;
    if (!r) return;

    if (r.etat === "ok") {
      hydrateFromApi(r.donnees);
      return;
    }

    if (r.etat === "vide") {
      // Différence essentielle avec la v1 : « vide » est un résultat,
      // pas une panne. On efface réellement la grille affichée.
      viderGrille("Aucune grille validée côté Django.");
      return;
    }

    // injoignable → on conserve le dernier état connu et on le signale.
    console.warn("[BALAFON + GUIDE] Backend injoignable :", r.raison);
  }, [requete.data, hydrateFromApi, viderGrille]);

  /* ---- WebSocket : invalidation immédiate ------------------------ */
  useEffect(() => {
    const url = getWsUrl();
    if (!url || !actif || typeof WebSocket === "undefined") return;

    let ws: WebSocket | null = null;
    let ferme = false;
    let tentatives = 0;
    let minuteur: number | undefined;

    const ouvrir = () => {
      try {
        ws = new WebSocket(url);
      } catch {
        return;
      }

      ws.onopen = () => {
        tentatives = 0;
      };

      ws.onmessage = (ev) => {
        let type = "";
        try {
          const brut = JSON.parse(String(ev.data)) as {
            type?: string;
            payload?: { type?: string };
          };
          type = brut.type ?? brut.payload?.type ?? "";
        } catch {
          return;
        }
        // Types poussés par programmation/signals.py
        if (
          type === "grille.modifiee" ||
          type === "emission.modifiee" ||
          type === "emission.supprimee"
        ) {
          void qc.invalidateQueries({ queryKey: CLE_GRILLE });
        }
      };

      ws.onclose = () => {
        if (ferme) return;
        tentatives = Math.min(tentatives + 1, 6);
        minuteur = window.setTimeout(ouvrir, 1200 * tentatives);
      };

      ws.onerror = () => ws?.close();
    };

    ouvrir();
    return () => {
      ferme = true;
      if (minuteur) window.clearTimeout(minuteur);
      ws?.close();
    };
  }, [qc, actif]);

  /* ---- État lisible par l'interface ------------------------------ */
  const etat: EtatSynchro = useMemo(() => {
    if (!actif) return "demo";
    if (requete.isPending) return "chargement";
    const r = requete.data;
    if (!r) return "chargement";
    if (r.etat === "ok") return "synchronise";
    if (r.etat === "vide") return "vide";
    return "hors-ligne";
  }, [actif, requete.isPending, requete.data]);

  return {
    etat,
    /** Horodatage du dernier aller-retour réussi. */
    majLe: requete.dataUpdatedAt ? new Date(requete.dataUpdatedAt) : null,
    raison: requete.data?.etat === "injoignable" ? requete.data.raison : null,
    rafraichir: () => qc.invalidateQueries({ queryKey: CLE_GRILLE }),
    enCours: requete.isFetching,
  };
}

/* ------------------------------------------------------------------ */
/*  Écriture — le Studio écrit dans Django, puis invalide              */
/* ------------------------------------------------------------------ */

import {
  ajouterEmission,
  majEmission,
  supprimerEmission,
} from "../api/emission";
import type { Emission } from "../api/types";

/**
 * Suppression d'une émission.
 *
 * Dans la v1, deleteProgram() du store ne touchait QUE l'état local :
 * la suppression réapparaissait au rechargement. Ici l'ordre est
 *     DELETE serveur → invalidation → réhydratation,
 * avec retrait optimiste immédiat et rollback si le serveur refuse.
 */
export function useSupprimerEmission() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => supprimerEmission(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: CLE_GRILLE });
      const precedent = qc.getQueryData<Reponse<GrilleAPI[]>>(CLE_GRILLE);

      if (precedent?.etat === "ok") {
        const apres = precedent.donnees.map((g) => ({
          ...g,
          emissions: (g.emissions ?? []).filter((e) => Number(e.id) !== id),
        }));
        const reste = apres.some((g) => (g.emissions ?? []).length > 0);
        qc.setQueryData<Reponse<GrilleAPI[]>>(
          CLE_GRILLE,
          reste ? { etat: "ok", donnees: apres } : { etat: "vide" }
        );
      }
      return { precedent };
    },

    onError: (_e, _id, ctx) => {
      if (ctx?.precedent) qc.setQueryData(CLE_GRILLE, ctx.precedent);
    },

    // Succès comme échec : on redemande la vérité au serveur.
    onSettled: () => qc.invalidateQueries({ queryKey: CLE_GRILLE }),
  });
}

export function useMajEmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Emission> }) =>
      majEmission(id, patch),
    onSettled: () => qc.invalidateQueries({ queryKey: CLE_GRILLE }),
  });
}

export function useAjouterEmission(grilleId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (e: Omit<Emission, "id" | "grille">) => ajouterEmission(grilleId, e),
    onSettled: () => qc.invalidateQueries({ queryKey: CLE_GRILLE }),
  });
}

/* ------------------------------------------------------------------ */
/*  Mesure d'audience — un battement toutes les 30 s                   */
/* ------------------------------------------------------------------ */

import { envoyerBattement } from "../services/backend";

/** Identifiant de session anonyme, stable sur l'onglet (pas de cookie tiers). */
function idSession(): string {
  const cle = "balafon.session";
  let v = sessionStorage.getItem(cle);
  if (!v) {
    v = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(cle, v);
  }
  return v;
}

/**
 * Déclare l'écran comme « en train de suivre » l'émission en cours.
 * C'est la source des compteurs du tableau de bord Direction.
 * Anonyme : aucun identifiant personnel n'est transmis.
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

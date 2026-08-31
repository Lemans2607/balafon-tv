/* ============================================================
   useWebSocket — abonnement au flux d'alertes Django Channels.

   ws://{host}/ws/alertes/?chaine=<slug>&token=<jwt>
   Reconnexion automatique à backoff exponentiel, nettoyage au
   démontage (pas de fuite de sockets).
   ============================================================ */
import { useEffect, useRef, useState } from "react";

import { WS_BASE_URL } from "../api/client";
import { stockageJetons } from "../api/client";
import type { Alerte } from "../api/types";

export interface MessageAlerteWs {
  type: string;
  payload: {
    id: number;
    type: string;
    type_display?: string;
    message: string;
    date_envoi: string;
    grille_id?: number;
    chaine_slug?: string;
  };
}

export type EtatSocket = "ferme" | "connexion" | "ouvert" | "erreur";

export function useWebSocket(
  chaine: string,
  onMessage: (alerte: MessageAlerteWs["payload"]) => void,
  actif = true
): EtatSocket {
  const [etat, setEtat] = useState<EtatSocket>("ferme");
  const socketRef = useRef<WebSocket | null>(null);
  const tentativesRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  useEffect(() => {
    if (!actif || !WS_BASE_URL || typeof WebSocket === "undefined") {
      setEtat("ferme");
      return;
    }

    let annule = false;

    const connecter = () => {
      if (annule) return;
      setEtat("connexion");

      const token = stockageJetons.lireAccess() ?? "";
      const params = new URLSearchParams({ chaine });
      if (token) params.set("token", token);
      const url = `${WS_BASE_URL}?${params.toString()}`;

      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        setEtat("erreur");
        planifierReconnexion();
        return;
      }
      socketRef.current = ws;

      ws.onopen = () => {
        if (annule) return;
        tentativesRef.current = 0;
        setEtat("ouvert");
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as MessageAlerteWs;
          if (msg.type === "alerte") cbRef.current(msg.payload);
        } catch {
          /* trame non-JSON ignorée */
        }
      };
      ws.onerror = () => setEtat("erreur");
      ws.onclose = () => {
        if (annule) return;
        setEtat("ferme");
        planifierReconnexion();
      };
    };

    const planifierReconnexion = () => {
      if (annule) return;
      const delai = Math.min(15000, 800 * 2 ** tentativesRef.current);
      tentativesRef.current += 1;
      timerRef.current = window.setTimeout(connecter, delai);
    };

    connecter();

    return () => {
      annule = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [chaine, actif]);

  return etat;
}

/** Convertit un payload WebSocket en Alerte métier (pour l'alertStore). */
export function payloadVersAlerte(p: MessageAlerteWs["payload"]): Alerte {
  return {
    id: p.id,
    type: (p.type as Alerte["type"]) ?? "autre",
    type_display: p.type_display,
    message: p.message,
    date_envoi: p.date_envoi,
    statut_lecture: false,
    grille_id: p.grille_id ?? null,
  };
}

import { getWsUrl } from "./backend";
import type { Alert } from "../types";

/* ============================================================
   Flux temps réel — Django Channels (WebSocket)
   Reçoit les alertes poussées par le backend quand une grille
   validée est modifiée (Phase 4.4 du guide) et les injecte dans
   l'alertStore. Reconnexion automatique à backoff.

   Si VITE_WS_URL n'est pas défini (démo locale), ne fait rien.
   ============================================================ */

export interface WsAlertPayload {
  severite?: Alert["severity"];
  titre?: string;
  title?: string;
  message?: string;
  source?: Alert["source"];
  grille_id?: number | string;
}

export function connectAlertStream(
  onAlert: (payload: WsAlertPayload) => void
): () => void {
  const url = getWsUrl();
  if (!url || typeof WebSocket === "undefined") return () => undefined;

  let ws: WebSocket | null = null;
  let closed = false;
  let attempts = 0;

  const open = () => {
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }
    ws.onopen = () => {
      attempts = 0;
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as
          | WsAlertPayload
          | { type?: string; payload?: WsAlertPayload };
        const payload = (data as { payload?: WsAlertPayload }).payload ?? (data as WsAlertPayload);
        onAlert(payload);
      } catch {
        /* message non-JSON ignoré */
      }
    };
    ws.onclose = () => {
      if (closed) return;
      attempts = Math.min(attempts + 1, 6);
      window.setTimeout(open, 1500 * attempts);
    };
    ws.onerror = () => ws?.close();
  };

  open();

  return () => {
    closed = true;
    ws?.close();
  };
}

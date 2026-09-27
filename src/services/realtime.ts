import { getWsUrl } from "./backend";
import type { Alert } from "../types";

/* ============================================================
   Flux temps réel — Django Channels (WebSocket)         [CORRIGÉ]

   Reçoit les alertes poussées par l'app `alertes` (déjà écrite dans
   le dépôt — voir backend/alertes/services.py) quand une émission ou
   une grille DÉJÀ VALIDÉE est modifiée, et les traduit en Alert pour
   alertStore.

   Correctif : la version précédente lisait des champs qui n'existent
   pas dans la charge réelle envoyée par le backend
   (payload.severite, payload.titre, payload.title, payload.source) :
   toute alerte réelle dégénérait donc en « Alerte temps réel »
   générique, sévérité "info", source "system" — le contenu utile
   (quelle émission, quelle grille, quel type d'alerte) était
   silencieusement perdu. Voir MODIFICATIONS.md, cause n°6.

   La charge réelle (backend/alertes/consumers.py → alerte_message) :
     { "type": "alerte",
       "payload": { id, type, type_display, message, date_envoi,
                    grille_id, chaine_id, chaine_slug } }
   ============================================================ */

export type TypeAlerteBackend =
  | "modification_derniere_minute"
  | "grille_incomplete"
  | "validation"
  | "synchro_vmix"
  | "autre";

export interface AlerteBackend {
  id: number;
  type: TypeAlerteBackend;
  type_display: string;
  message: string;
  date_envoi: string;
  grille_id: number | null;
  chaine_id: number;
  chaine_slug: string;
}

const SEVERITE_PAR_TYPE: Record<TypeAlerteBackend, Alert["severity"]> = {
  modification_derniere_minute: "warning",
  grille_incomplete: "warning",
  validation: "info",
  synchro_vmix: "info",
  autre: "info",
};

const SOURCE_PAR_TYPE: Record<TypeAlerteBackend, Alert["source"]> = {
  modification_derniere_minute: "director",
  grille_incomplete: "director",
  validation: "director",
  synchro_vmix: "vmix",
  autre: "system",
};

/** Traduit la charge réelle du backend en Alert prêt pour alertStore.addAlert(). */
export function versAlert(a: AlerteBackend): Omit<Alert, "id" | "createdAt" | "acknowledged"> {
  return {
    severity: SEVERITE_PAR_TYPE[a.type] ?? "info",
    title: a.type_display || "Alerte régie",
    message: a.message,
    source: SOURCE_PAR_TYPE[a.type] ?? "system",
    actionRequired: a.type === "modification_derniere_minute" || a.type === "grille_incomplete",
    relatedScheduleId: a.grille_id != null ? String(a.grille_id) : undefined,
  };
}

export function connectAlertStream(
  onAlert: (alert: Omit<Alert, "id" | "createdAt" | "acknowledged">) => void
): () => void {
  const url = getWsUrl();
  if (!url || typeof WebSocket === "undefined") return () => undefined;

  let ws: WebSocket | null = null;
  let closed = false;
  let attempts = 0;

  const open = () => {
    // Le token JWT est optionnel côté consumer (voir alertes/consumers.py)
    // mais, s'il est présent, il lie la connexion à l'utilisateur régie.
    const jeton = localStorage.getItem("balafon.access");
    const cible = jeton ? `${url}${url.includes("?") ? "&" : "?"}token=${jeton}` : url;

    try {
      ws = new WebSocket(cible);
    } catch {
      return;
    }
    ws.onopen = () => {
      attempts = 0;
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as { type?: string; payload?: AlerteBackend };
        if (data.type === "alerte" && data.payload) onAlert(versAlert(data.payload));
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

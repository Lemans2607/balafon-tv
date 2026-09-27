import type { GrilleAPI } from "../utils/planbyAdapter";

/* ============================================================
   Client REST — backend Django (DRF)                [CORRIGÉ]

   Changement de fond par rapport à la version précédente : une
   réponse vide du serveur n'est plus confondue avec un serveur
   injoignable.

     Avant :  Promise<GrilleAPI[] | null>
              → null signifiait à la fois « 404 », « timeout »,
                « erreur réseau » ET « la base ne contient rien ».
                Une grille vidée côté Django déclenchait donc le
                repli sur le cache local : l'ancienne grille
                restait affichée indéfiniment.

     Après :  Promise<Reponse<GrilleAPI[]>>
              → { etat: "ok",          donnees }
                { etat: "vide" }                     ← efface la grille
                { etat: "injoignable", raison }      ← seul cas de repli

   Voir MODIFICATIONS.md à la racine du projet, cause n°1 à 3.
   ============================================================ */

export type Reponse<T> =
  | { etat: "ok"; donnees: T }
  | { etat: "vide" }
  | { etat: "injoignable"; raison: string };

type ImportMetaEnv = { env?: Record<string, string | undefined> };

function env(): Record<string, string | undefined> {
  return ((import.meta as unknown as ImportMetaEnv).env ?? {}) as Record<
    string,
    string | undefined
  >;
}

/**
 * Base de l'API. Tolère les deux écritures dans .env.local :
 *   VITE_API_URL=http://127.0.0.1:8000        → /api ajouté automatiquement
 *   VITE_API_URL=http://127.0.0.1:8000/api    → conservé tel quel
 * (le vrai .env.local du projet contenait la première forme, sans /api :
 * c'est la cause principale de la désynchronisation — voir MODIFICATIONS.md).
 */
export function getApiBaseUrl(): string {
  const brut = (env().VITE_API_URL ?? env().VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  if (!brut) return "";
  if (/\/api$/.test(brut)) return brut;
  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
    console.warn(
      "[BALAFON + GUIDE] VITE_API_URL ne contient pas le préfixe « /api ». " +
        `Ajouté automatiquement → ${brut}/api . Corrigez .env.local pour lever l'ambiguïté.`
    );
  }
  return `${brut}/api`;
}

export function isBackendConfigured(): boolean {
  return getApiBaseUrl().length > 0;
}

export function getWsUrl(): string {
  return env().VITE_WS_URL ?? "";
}

/* ------------------------------------------------------------------ */

async function getJSON<T>(path: string, timeoutMs = 6000): Promise<Reponse<T>> {
  const base = getApiBaseUrl();
  if (!base) return { etat: "injoignable", raison: "VITE_API_URL non défini (mode démo)." };

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const jeton = localStorage.getItem("balafon.access");
    const res = await fetch(`${base}${path}`, {
      headers: {
        Accept: "application/json",
        ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      },
      signal: controller.signal,
    });

    if (res.status === 404) {
      return {
        etat: "injoignable",
        raison:
          `404 sur ${base}${path} — vérifiez que VITE_API_URL pointe bien sur /api ` +
          "et que le routeur DRF est monté (backend/balafon_guide/urls.py).",
      };
    }
    if (!res.ok) {
      return { etat: "injoignable", raison: `HTTP ${res.status} sur ${path}.` };
    }
    return { etat: "ok", donnees: (await res.json()) as T };
  } catch (e) {
    const raison =
      e instanceof DOMException && e.name === "AbortError"
        ? `Délai dépassé (${timeoutMs} ms) sur ${path}.`
        : `Réseau indisponible sur ${path} — ${String(e)}`;
    return { etat: "injoignable", raison };
  } finally {
    window.clearTimeout(timer);
  }
}

/** Déballe une réponse DRF paginée ou non. */
function liste<T>(donnees: unknown): T[] {
  if (Array.isArray(donnees)) return donnees as T[];
  const page = donnees as { results?: T[] } | null;
  return page?.results ?? [];
}

/* ------------------------------------------------------------------ */

/**
 * Grilles validées + émissions imbriquées.
 *
 * `{ etat: "vide" }` est un succès : la Direction d'Antenne n'a validé
 * aucune grille, ou toutes les émissions ont été supprimées. L'appelant
 * DOIT alors vider l'affichage, jamais retomber sur le cache local.
 */
export async function fetchGrillesValidees(): Promise<Reponse<GrilleAPI[]>> {
  const r = await getJSON<unknown>("/grilles/?statut=validee");
  if (r.etat !== "ok") return r;
  const l = liste<GrilleAPI>(r.donnees);
  return l.length > 0 ? { etat: "ok", donnees: l } : { etat: "vide" };
}

export async function fetchChaines(): Promise<Reponse<Array<{ slug: string; nom: string }>>> {
  const r = await getJSON<unknown>("/chaines/");
  if (r.etat !== "ok") return r;
  const l = liste<{ slug: string; nom: string }>(r.donnees);
  return l.length > 0 ? { etat: "ok", donnees: l } : { etat: "vide" };
}

/* -------------------------------------------------------- Audience */

export interface AudienceDirect {
  emission_id: number | null;
  titre: string;
  genre?: string;
  spectateurs: number;
  pic_du_jour: number;
  depuis: string;
  jusqua?: string;
}

export interface AudienceClassement {
  emission_id: number;
  titre: string;
  genre: string;
  spectateurs_moyens: number;
  pic: number;
  duree_moyenne_vue_s: number;
  taux_completion: number;
}

/** GET /api/audience/direct/ — compteur temps réel de l'émission en cours. Public. */
export async function fetchAudienceDirect(): Promise<Reponse<AudienceDirect>> {
  return getJSON<AudienceDirect>("/audience/direct/", 4000);
}

/** GET /api/audience/classement/?jours=7 — les émissions les plus suivies. Réservé aux comptes. */
export async function fetchClassementAudience(jours = 7): Promise<Reponse<AudienceClassement[]>> {
  const r = await getJSON<unknown>(`/audience/classement/?jours=${jours}`, 6000);
  if (r.etat !== "ok") return r;
  const l = liste<AudienceClassement>(r.donnees);
  return l.length > 0 ? { etat: "ok", donnees: l } : { etat: "vide" };
}

export interface PointAudience {
  instant: string;
  spectateurs: number;
}

/** GET /api/audience/courbe/{id}/?heures=24 — série temporelle d'une émission. */
export async function fetchCourbeAudience(
  emissionId: number,
  heures = 24
): Promise<Reponse<PointAudience[]>> {
  const r = await getJSON<unknown>(`/audience/courbe/${emissionId}/?heures=${heures}`, 6000);
  if (r.etat !== "ok") return r;
  const l = liste<PointAudience>(r.donnees);
  return l.length > 0 ? { etat: "ok", donnees: l } : { etat: "vide" };
}

/**
 * Signale au backend qu'un écran regarde la grille. Appelé toutes les
 * 30 s par useAudienceHeartbeat(). Silencieux à dessein : une mesure
 * d'audience ne doit jamais gêner un téléspectateur.
 */
export async function envoyerBattement(sessionId: string, emissionId?: number): Promise<void> {
  const base = getApiBaseUrl();
  if (!base) return;
  try {
    await fetch(`${base}/audience/battement/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: sessionId, emission: emissionId ?? null }),
      keepalive: true,
    });
  } catch {
    /* mesure d'audience : jamais bloquante */
  }
}

/* ---------------------------------------------------------------- Auth */

/**
 * Authentification JWT.
 * Route réelle du backend : POST /api/auth/connexion/ (voir comptes/api.py).
 * Non utilisé actuellement — l'app s'authentifie via context/AuthContext.tsx
 * + api/auth.ts, qui appellent cette même route directement. Conservé ici,
 * corrigé, pour tout script ou outil qui voudrait s'authentifier sans
 * passer par le contexte React. (src/services/auth.ts est un troisième
 * système d'authentification, local et non branché — voir MODIFICATIONS.md.)
 */
export async function requestToken(
  email: string,
  motDePasse: string
): Promise<{ access: string; refresh: string } | null> {
  const base = getApiBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/auth/connexion/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mot_de_passe: motDePasse }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access?: string; refresh?: string };
    return data.access ? { access: data.access, refresh: data.refresh ?? "" } : null;
  } catch {
    return null;
  }
}

import type { GrilleAPI } from "../utils/planbyAdapter";

/* ============================================================
   Client REST — backend Django (DRF)
   Contrat conforme au guide d'intégration (Phase 4) :
     GET  {VITE_API_URL}/chaines/
     GET  {VITE_API_URL}/grilles/?statut=validee   → hydratation EPG
     POST {VITE_API_URL}/auth/token/               → JWT

   Si VITE_API_URL n'est pas défini ou si le backend est
   injoignable, l'application bascule en mode démo local
   (catalogue embarqué + localStorage). Jamais d'écran vide.
   ============================================================ */

type ImportMetaEnv = { env?: Record<string, string | undefined> };

function env(): Record<string, string | undefined> {
  return ((import.meta as unknown as ImportMetaEnv).env ?? {}) as Record<string, string | undefined>;
}

export function getApiBaseUrl(): string {
  const base = env().VITE_API_URL ?? env().VITE_API_BASE_URL ?? "";
  return base.replace(/\/+$/, "");
}

export function isBackendConfigured(): boolean {
  return getApiBaseUrl().length > 0;
}

export function getWsUrl(): string {
  return env().VITE_WS_URL ?? "";
}

async function getJSON<T>(path: string, timeoutMs = 4000): Promise<T | null> {
  const base = getApiBaseUrl();
  if (!base) return null;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/** Grilles validées + leurs émissions (format DRF du guide) */
export async function fetchGrillesValidees(): Promise<GrilleAPI[] | null> {
  const data = await getJSON<GrilleAPI[] | { results?: GrilleAPI[] }>(
    "/grilles/?statut=validee"
  );
  if (!data) return null;
  const list = Array.isArray(data) ? data : (data.results ?? []);
  return list.length > 0 ? list : null;
}

export async function fetchChaines(): Promise<Array<{ slug: string; nom: string }> | null> {
  const data = await getJSON<Array<{ slug: string; nom: string }> | { results?: Array<{ slug: string; nom: string }> }>(
    "/chaines/"
  );
  if (!data) return null;
  return Array.isArray(data) ? data : (data.results ?? []);
}

/**
 * Authentification JWT (SimpleJWT / DJOSER).
 * Adapter le chemin si le backend expose `/auth/jwt/create/` (cf. guide Phase 4.2).
 */
export async function requestToken(email: string, password: string): Promise<string | null> {
  const base = getApiBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/auth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access?: string; token?: string };
    return data.access ?? data.token ?? null;
  } catch {
    return null;
  }
}

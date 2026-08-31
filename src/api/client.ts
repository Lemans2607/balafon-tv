/* ============================================================
   Client axios — instance unique + intercepteurs JWT.

   - Chaque requête porte `Authorization: Bearer {access}`.
   - Sur 401 → refresh automatique via /auth/rafraichir/ puis retry.
   - Si le refresh échoue → déconnexion + redirection vers /login.
   ============================================================ */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

type ImportMetaEnv = { env?: Record<string, string | undefined> };

function env(): Record<string, string | undefined> {
  return ((import.meta as unknown as ImportMetaEnv).env ?? {}) as Record<
    string,
    string | undefined
  >;
}

export const API_BASE_URL: string = (env().VITE_API_URL ?? env().VITE_API_BASE_URL ?? "").replace(
  /\/+$/,
  ""
);

export const WS_BASE_URL: string = env().VITE_WS_URL ?? "";

const TOKEN_KEY = "balafon.access";
const REFRESH_KEY = "balafon.refresh";

export const stockageJetons = {
  lireAccess: (): string | null => localStorage.getItem(TOKEN_KEY),
  lireRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  enregistrer: (access: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  effacer: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL.replace(/\/$/, "")}` : undefined,
  headers: { "Content-Type": "application/json" },
  timeout: 8000,
});

let rafraichissementEnCours: Promise<string> | null = null;

/** Rafraîchit le jeton d'accès (une seule fois à la fois). */
async function rafraichir(): Promise<string> {
  const refresh = stockageJetons.lireRefresh();
  if (!refresh) throw new Error("Aucun refresh token");
  const { data } = await axios.post(`${API_BASE_URL}/auth/rafraichir/`, { refresh });
  const access: string = data.access;
  const ancienRefresh: string = stockageJetons.lireRefresh() ?? refresh;
  stockageJetons.enregistrer(access, data.refresh ?? ancienRefresh);
  return access;
}

/* ------------------------- Intercepteur requête : injecte le Bearer token */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const access = stockageJetons.lireAccess();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

/* ------------------- Intercepteur réponse : 401 → refresh + retry unique */
api.interceptors.response.use(
  (reponse) => reponse,
  async (erreur: AxiosError) => {
    const configOrigine = erreur.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = configOrigine?.url ?? "";

    const est401 = erreur.response?.status === 401;
    const estAuth = url.includes("/auth/connexion") || url.includes("/auth/rafraichir");

    if (!est401 || estAuth || !configOrigine || configOrigine._retry) {
      return Promise.reject(erreur);
    }

    configOrigine._retry = true;
    try {
      if (!rafraichissementEnCours) {
        rafraichissementEnCours = rafraichir().finally(() => {
          rafraichissementEnCours = null;
        });
      }
      const nouvelAccess = await rafraichissementEnCours;
      configOrigine.headers.Authorization = `Bearer ${nouvelAccess}`;
      return api(configOrigine);
    } catch {
      // Refresh impossible → déconnexion forcée.
      stockageJetons.effacer();
      if (window.location.hash !== "#/login") window.location.hash = "#/login";
      return Promise.reject(erreur);
    }
  }
);

/** Vrai si un backend Django est configuré (mode API), sinon démo locale. */
export const backendConfigure = (): boolean => API_BASE_URL.length > 0;

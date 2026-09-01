/* ============================================================
   AuthContext — authentification JWT réelle contre le backend Django.

   C'est l'UNIQUE source du rôle dans l'interface : `role` provient du
   jeton JWT (ou du profil restauré), jamais d'un sélecteur local.
   Le mode démo a été supprimé — l'app exige un compte authentifié.
   ============================================================ */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { jwtDecode } from "jwt-decode";

import * as authApi from "../api/auth";
import { backendConfigure, stockageJetons } from "../api/client";
import type { RoleBackend, Utilisateur } from "../api/types";

interface JetonDecodes {
  role?: RoleBackend;
  exp?: number;
}

interface AuthContexte {
  utilisateur: Utilisateur | null;
  role: RoleBackend | null;
  estAuthentifie: boolean;
  modeApi: boolean;
  connexionEnCours: boolean;
  erreur: string | null;
  login: (email: string, motDePasse: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Contexte = createContext<AuthContexte | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [connexionEnCours, setConnexionEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const modeApi = backendConfigure();

  /* Restauration de session au montage (jeton encore présent + valide). */
  useEffect(() => {
    const access = stockageJetons.lireAccess();
    if (!access) return;
    try {
      const decode = jwtDecode<JetonDecodes>(access);
      const expire = (decode.exp ?? 0) * 1000 < Date.now();
      if (expire) {
        stockageJetons.effacer();
        return;
      }
      setUtilisateur((u) => u ?? ({ role: decode.role ?? "diffuseur" } as Utilisateur));
    } catch {
      stockageJetons.effacer();
    }
  }, []);

  const login = useCallback(async (email: string, motDePasse: string) => {
    setConnexionEnCours(true);
    setErreur(null);
    try {
      const u = await authApi.connexion(email, motDePasse);
      setUtilisateur(u);
    } catch {
      setErreur("Identifiants invalides ou backend injoignable.");
      throw new Error("login");
    } finally {
      setConnexionEnCours(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.deconnexion();
    } catch {
      /* la suppression locale prime */
    }
    stockageJetons.effacer();
    setUtilisateur(null);
  }, []);

  /* Le rôle vient exclusivement de l'utilisateur authentifié (JWT). */
  const role = useMemo<RoleBackend | null>(() => utilisateur?.role ?? null, [utilisateur]);

  const estAuthentifie = utilisateur !== null;

  const valeur = useMemo(
    () => ({ utilisateur, role, estAuthentifie, modeApi, connexionEnCours, erreur, login, logout }),
    [utilisateur, role, estAuthentifie, modeApi, connexionEnCours, erreur, login, logout]
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useAuth(): AuthContexte {
  const ctx = useContext(Contexte);
  if (!ctx) throw new Error("useAuth doit être utilisé sous <AuthProvider>.");
  return ctx;
}

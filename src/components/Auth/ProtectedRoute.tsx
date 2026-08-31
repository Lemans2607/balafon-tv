/* ============================================================
   ProtectedRoute — garde d'accès RBAC côté front.

   - En mode API : exige un utilisateur authentifié, sinon → /login.
   - En mode démo : laisse passer (le rôle vient du sélecteur /demo).
   - `rolesAutorises` restreint l'accès à certains rôles backend.
   ============================================================ */
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import type { RoleBackend } from "../../api/types";

interface Props {
  rolesAutorises?: RoleBackend[];
  children: React.ReactNode;
}

export function ProtectedRoute({ rolesAutorises, children }: Props) {
  const { estAuthentifie, role, modeApi } = useAuth();
  const location = useLocation();

  if (!estAuthentifie) {
    if (modeApi) {
      return <Navigate to="/login" replace state={{ depuis: location.pathname }} />;
    }
    // Mode démo sans rôle staff choisi → orienter vers le sélecteur.
    return <Navigate to="/demo" replace />;
  }

  if (rolesAutorises && role && !rolesAutorises.includes(role)) {
    return <Navigate to="/studio" replace />;
  }

  return <>{children}</>;
}

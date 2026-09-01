/* ============================================================
   ProtectedRoute — garde d'accès RBAC côté front.

   - Exige un accès staff (utilisateur JWT ou rôle local) ; sinon → /login.
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
  const { estAuthentifie, role } = useAuth();
  const location = useLocation();

  if (!estAuthentifie) {
    return <Navigate to="/login" replace state={{ depuis: location.pathname }} />;
  }

  if (rolesAutorises && role && !rolesAutorises.includes(role)) {
    return <Navigate to="/studio" replace />;
  }

  return <>{children}</>;
}

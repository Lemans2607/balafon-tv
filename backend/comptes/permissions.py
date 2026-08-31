"""
Permissions DRF personnalisées (RBAC) — cf. cahier des charges §9.

Chaque permission lit le `role` de l'utilisateur authentifié.
"""
from rest_framework.permissions import BasePermission


class EstAdministrateur(BasePermission):
    """Réservé aux administrateurs."""

    message = "Réservé aux administrateurs."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.est_administrateur
        )


class EstDirecteurAntenne(BasePermission):
    """Réservé aux directeurs d'antenne (seuls habilités à valider)."""

    message = "Seul un Directeur d'Antenne peut effectuer cette action."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.est_directeur_antenne
        )


class EstDiffuseur(BasePermission):
    """Réservé aux diffuseurs (régie)."""

    message = "Réservé aux diffuseurs."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.est_diffuseur
        )


class EstAdminOuDirecteur(BasePermission):
    """Admin ou Directeur d'Antenne (gestion des grilles/émissions)."""

    message = "Réservé aux administrateurs et directeurs d'antenne."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.peut_gerer_grille
        )


class LecturePubliqueEcritureAuthentifiee(BasePermission):
    """
    Lecture ouverte au public (ex. grilles validées, chaînes),
    écriture réservée aux utilisateurs authentifiés.
    """

    def has_permission(self, request, view) -> bool:
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return bool(request.user and request.user.is_authenticated)

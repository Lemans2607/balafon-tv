"""
Permissions DRF personnalisées (RBAC).

Deux rôles métier : Directeur d'Antenne (admin de la plateforme + validation
exclusive) et Diffuseur (régie). Le rôle « administrateur » n'existe plus.
"""
from rest_framework.permissions import BasePermission


class EstDirecteurAntenne(BasePermission):
    """Réservé aux directeurs d'antenne (gestion des grilles, comptes, validation)."""

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


class LecturePubliqueEcritureAuthentifiee(BasePermission):
    """
    Lecture ouverte au public (ex. grilles validées, chaînes),
    écriture réservée aux utilisateurs authentifiés.
    """

    def has_permission(self, request, view) -> bool:
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return bool(request.user and request.user.is_authenticated)

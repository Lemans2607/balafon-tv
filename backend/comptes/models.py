"""
Modèle Utilisateur — authentification par email + drapeaux de rôle.

Les rôles sont portés par deux booléens (cf. spécification) :
    est_admin              → administrateur de la plateforme (comptes, grilles)
    est_directeur_antenne  → droit exclusif de validation éditoriale
Un compte sans aucun drapeau est un diffuseur (régie).
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class Utilisateur(AbstractUser):
    """Compte utilisateur de la plateforme, identifié par son email."""

    est_admin = models.BooleanField(
        default=False,
        help_text="Administrateur de la plateforme (gestion des comptes et des grilles).",
    )
    est_directeur_antenne = models.BooleanField(
        default=False,
        help_text="Droit exclusif de valider une grille pour diffusion.",
    )

    username = None  # l'email est l'identifiant unique
    email = models.EmailField("adresse email", unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        db_table = "comptes_utilisateur"
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.get_full_name() or self.email} ({self.role})"

    # ------------------------------------------------------------------ Rôles
    @property
    def est_diffuseur(self) -> bool:
        """Un compte sans drapeau admin/directeur est un diffuseur (régie)."""
        return not self.est_admin and not self.est_directeur_antenne

    @property
    def peut_gerer_grille(self) -> bool:
        """Admin et Directeur peuvent créer/modifier grilles et émissions."""
        return self.est_admin or self.est_directeur_antenne

    @property
    def role(self) -> str:
        """Libellé de rôle unique, consommé par le frontend (JWT + profil)."""
        if self.est_directeur_antenne:
            return "directeur_antenne"
        if self.est_admin:
            return "administrateur"
        return "diffuseur"

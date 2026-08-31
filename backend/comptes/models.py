"""
Modèle Utilisateur — authentification et RBAC.

Un seul modèle avec un champ `role` à DEUX valeurs métier :
    - directeur_antenne : construit les grilles, gère les comptes,
      et détient le droit EXCLUSIF de validation éditoriale ;
    - diffuseur         : régie de diffusion (lecture, alertes, synchro vMix).

Le rôle « administrateur » a été supprimé : le Directeur d'Antenne EST
l'administrateur de la plateforme (cf. rapport de stage).
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class Utilisateur(AbstractUser):
    """Compte utilisateur de la plateforme, identifié par son email."""

    class Role(models.TextChoices):
        DIRECTEUR_ANTENNE = "directeur_antenne", "Directeur d'Antenne"
        DIFFUSEUR = "diffuseur", "Diffuseur (régie)"

    username = None  # l'email est l'identifiant unique
    email = models.EmailField("adresse email", unique=True)

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.DIFFUSEUR,
        help_text="Détermine les permissions (RBAC).",
    )
    fonction = models.CharField(
        max_length=120,
        blank=True,
        help_text="Fonction occupée (pertinent pour le Directeur d'Antenne).",
    )
    poste_regie = models.CharField(
        max_length=120,
        blank=True,
        help_text="Poste en régie de diffusion (pertinent pour un diffuseur).",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.get_full_name() or self.email} ({self.get_role_display()})"

    # ------------------------------------------------------------------ RBAC
    @property
    def est_directeur_antenne(self) -> bool:
        return self.role == self.Role.DIRECTEUR_ANTENNE

    @property
    def est_diffuseur(self) -> bool:
        return self.role == self.Role.DIFFUSEUR

    @property
    def peut_gerer_grille(self) -> bool:
        """Seul le Directeur d'Antenne crée/modifie grilles, émissions et comptes."""
        return self.est_directeur_antenne

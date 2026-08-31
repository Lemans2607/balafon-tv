"""
Modèle Utilisateur — authentification et RBAC.

Un seul modèle avec un champ `role` à trois valeurs (administrateur,
directeur_antenne, diffuseur) plutôt qu'un héritage multi-tables :
plus simple à maintenir et strictement équivalent au diagramme de classes
(Utilisateur abstraite → Administrateur / Diffuseur, Directeur = spécialisation).
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class Utilisateur(AbstractUser):
    """Compte utilisateur de la plateforme, identifié par son email."""

    class Role(models.TextChoices):
        ADMINISTRATEUR = "administrateur", "Administrateur"
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
        help_text="Fonction occupée (pertinent pour admin / directeur).",
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
    def est_administrateur(self) -> bool:
        return self.role == self.Role.ADMINISTRATEUR

    @property
    def est_directeur_antenne(self) -> bool:
        return self.role == self.Role.DIRECTEUR_ANTENNE

    @property
    def est_diffuseur(self) -> bool:
        return self.role == self.Role.DIFFUSEUR

    @property
    def peut_gerer_grille(self) -> bool:
        """Admin et Directeur peuvent créer/modifier grilles et émissions."""
        return self.role in (self.Role.ADMINISTRATEUR, self.Role.DIRECTEUR_ANTENNE)

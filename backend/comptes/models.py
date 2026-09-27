"""
Modèle Utilisateur — authentification par email + drapeaux de rôle.

Les rôles sont portés par deux booléens (cf. spécification) :
    est_admin              → administrateur de la plateforme (comptes, grilles)
    est_directeur_antenne  → droit exclusif de validation éditoriale
Un compte sans aucun drapeau est un diffuseur (régie).
"""
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models


class UtilisateurManager(BaseUserManager):
    """Gestionnaire personnalisé : l'email remplace le nom d'utilisateur.

    CORRECTIF : AbstractUser fournit par défaut le UserManager de Django,
    dont create_user()/create_superuser() exigent un `username` en premier
    argument positionnel. Ce modèle retire le champ username
    (USERNAME_FIELD = "email") mais n'avait jamais reçu son propre
    gestionnaire : créer un compte — y compris via `createsuperuser` en
    ligne de commande — échouait avec
    `TypeError: UserManager.create_user() missing 1 required positional
    argument: 'username'`. Resté invisible tant qu'aucune base de données
    réelle n'était connectée pour le déclencher. Voir MODIFICATIONS.md.
    """

    use_in_migrations = True

    def _creer_utilisateur(self, email: str, password: str | None, **extra_fields):
        if not email:
            raise ValueError("L'adresse email est obligatoire.")
        email = self.normalize_email(email)
        utilisateur = self.model(email=email, **extra_fields)
        utilisateur.set_password(password)
        utilisateur.save(using=self._db)
        return utilisateur

    def create_user(self, email: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._creer_utilisateur(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("est_admin", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Un superutilisateur doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Un superutilisateur doit avoir is_superuser=True.")
        return self._creer_utilisateur(email, password, **extra_fields)


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

    objects = UtilisateurManager()

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

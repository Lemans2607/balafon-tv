from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UtilisateurManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("L'email est obligatoire.")
        email = self.normalize_email(email)
        extra.setdefault("username", email)
        user = self.model(email=email, **extra)
        user.password = make_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("role", Utilisateur.Role.ADMIN)
        return self._create_user(email, password, **extra)


class Utilisateur(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrateur"
        DIRECTEUR = "directeur", "Directeur d'Antenne"
        REGIE = "regie", "Régie de diffusion"
        TECHNICIEN = "technicien", "Technicien"

    email = models.EmailField("email", unique=True)
    nom = models.CharField("nom complet", max_length=120, blank=True)
    role = models.CharField("rôle", max_length=20, choices=Role.choices, default=Role.TECHNICIEN)

    objects = UtilisateurManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"

    def __str__(self):
        return self.nom or self.email


class DemandeAcces(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE = "en_attente", "En attente"
        APPROUVEE = "approuvee", "Approuvée"
        REFUSEE = "refusee", "Refusée"

    nom = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)  # haché via make_password
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "demande d'accès"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.password.startswith(("pbkdf2_", "argon2", "bcrypt", "!")):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nom} <{self.email}>"

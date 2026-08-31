"""
Modèles de la programmation — Chaîne, Grille, Émission.

Règles métier intégrées :
    * une grille naît toujours à l'état `brouillon` ;
    * `heure_fin > heure_debut` ;
    * aucun chevauchement d'émissions au sein d'une même grille ;
    * seule une grille complète peut être validée (vérifié dans clean()).
"""
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Chaine(models.Model):
    """Chaîne de diffusion (Balafon TV / Radio Balafon)."""

    class Type(models.TextChoices):
        TV = "tv", "Télévision"
        RADIO = "radio", "Radio"

    nom = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    type = models.CharField(max_length=10, choices=Type.choices, default=Type.TV)
    actif = models.BooleanField(default=True)

    class Meta:
        verbose_name = "chaîne"

    def __str__(self) -> str:  # pragma: no cover
        return self.nom


class Grille(models.Model):
    """
    Grille de programmes d'une chaîne pour une période.

    Suit le diagramme d'états-transitions :
        brouillon → en_validation → validee
    """

    class Statut(models.TextChoices):
        BROUILLON = "brouillon", "Brouillon"
        EN_VALIDATION = "en_validation", "En validation"
        VALIDEE = "validee", "Validée"

    chaine = models.ForeignKey(Chaine, on_delete=models.CASCADE, related_name="grilles")
    date_debut = models.DateField()
    date_fin = models.DateField()
    statut = models.CharField(
        max_length=20, choices=Statut.choices, default=Statut.BROUILLON
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    date_validation = models.DateTimeField(null=True, blank=True)

    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="grilles_creees",
    )
    valide_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="grilles_validees",
    )

    class Meta:
        verbose_name = "grille"
        constraints = [
            models.CheckConstraint(
                check=models.Q(date_fin__gte=models.F("date_debut")),
                name="grille_periode_valide",
            ),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.chaine} · {self.date_debut} → {self.date_fin} ({self.statut})"

    # ------------------------------------------------------------- métier
    def est_complete(self) -> bool:
        """Aucune plage vide entre les émissions de la journée type."""
        return len(self.plages_vides()) == 0

    def plages_vides(self) -> list[tuple[str, str]]:
        """Retourne les créneaux non couverts (HH:MM, HH:MM) sur la fenêtre 06:00→24:00."""
        emissions = self.emissions.order_by("heure_debut")
        vides: list[tuple[str, str]] = []
        debut_fenetre = 6 * 60  # 06:00
        fin_fenetre = 24 * 60   # 24:00
        curseur = debut_fenetre
        for e in emissions:
            s = e.heure_debut.hour * 60 + e.heure_debut.minute
            f = e.heure_fin.hour * 60 + e.heure_fin.minute
            if s > curseur:
                vides.append((f"{curseur // 60:02d}:{curseur % 60:02d}",
                              f"{s // 60:02d}:{s % 60:02d}"))
            curseur = max(curseur, f)
        if curseur < fin_fenetre:
            vides.append((f"{curseur // 60:02d}:{curseur % 60:02d}", "24:00"))
        return vides

    def clean(self) -> None:
        if self.date_fin < self.date_debut:
            raise ValidationError("La date de fin précède la date de début.")
        if self.valide_par and not self.valide_par.est_directeur_antenne:
            raise ValidationError("Seul un Directeur d'Antenne peut valider une grille.")


class Emission(models.Model):
    """Émission planifiée dans une grille, avec créneau horaire."""

    GENRES = [
        ("info", "Information"),
        ("divertissement", "Divertissement"),
        ("sport", "Sport"),
        ("culture", "Culture"),
        ("musique", "Musique"),
        ("religion", "Religion"),
        ("jeunesse", "Jeunesse"),
        ("talk", "Talk / Débat"),
        ("serie", "Série"),
        ("magazine", "Magazine"),
        ("autre", "Autre"),
    ]

    grille = models.ForeignKey(Grille, on_delete=models.CASCADE, related_name="emissions")
    titre = models.CharField(max_length=200)
    genre = models.CharField(max_length=30, choices=GENRES, default="autre")
    description = models.TextField(blank=True)
    heure_debut = models.DateTimeField()
    heure_fin = models.DateTimeField()

    class Meta:
        verbose_name = "émission"
        ordering = ["heure_debut"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.titre} [{self.heure_debut:%H:%M}–{self.heure_fin:%H:%M}]"

    # ------------------------------------------------------------- métier
    def clean(self) -> None:
        if self.heure_fin <= self.heure_debut:
            raise ValidationError("L'heure de fin doit être strictement après l'heure de début.")
        # Anti-chevauchement avec les autres émissions de la même grille.
        conflit = (
            Emission.objects.filter(grille=self.grille)
            .exclude(pk=self.pk)
            .filter(heure_debut__lt=self.heure_fin, heure_fin__gt=self.heure_debut)
            .first()
        )
        if conflit:
            raise ValidationError(
                f"Chevauchement avec « {conflit.titre} » "
                f"({conflit.heure_debut:%H:%M}–{conflit.heure_fin:%H:%M})."
            )

    def save(self, *args, **kwargs) -> None:
        self.clean()
        super().save(*args, **kwargs)

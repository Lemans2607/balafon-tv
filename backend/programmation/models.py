"""
Modèles métier — chaînes, grilles de programmes, émissions.

Règles d'intégrité portées par la base ET par la validation applicative :
    - une grille respecte date_fin >= date_debut (contrainte SQL) ;
    - une émission respecte heure_fin > heure_debut (contrainte SQL + clean) ;
    - deux émissions d'une même grille ne se chevauchent jamais (clean) ;
    - la complétude d'antenne 06:00 → 24:00 est calculable (est_complete).

MODÉLISATION MATHÉMATIQUE DES CONTRAINTES (pour rapport IAI Cameroun) :

1. Coordonnées de dépôt (Drag & Drop) :
   M = ((X_drop - L_sidebar + X_scroll) / W_hour) × 60
   
   où :
   - L_sidebar : Largeur barre latérale (px)
   - X_scroll : Défilement horizontal (px)
   - W_hour : Largeur d'une heure à l'écran (px, constante Planby)

2. Magnétisme (Snap 30 minutes) :
   M_snap = Round(M / 30) × 30

3. Exclusion d'antenne (Anti-chevauchement) :
   ∀(s_i, s_j) sur même canal : [Start_i, End_i[ ∩ [Start_j, End_j[ = ∅
   
   Cette contrainte est vérifiée :
   - Au niveau applicatif via clean() dans save()
   - Au niveau SQL via CheckConstraint (heure_fin > heure_debut)
   - La non-intersection est garantie par la requête filter() dans clean()
"""
from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

# Fenêtre d'antenne quotidienne retenue pour le contrôle de complétude.
DEBUT_ANTENNE = time(6, 0)   # 06:00
FIN_ANTENNE = time(0, 0)     # 24:00 (minuit du jour suivant)


class Chaine(models.Model):
    """Chaîne de diffusion (TV ou radio)."""

    class Type(models.TextChoices):
        TV = "tv", "Télévision"
        RADIO = "radio", "Radio"

    nom = models.CharField(max_length=120)
    slug = models.SlugField(max_length=120, unique=True)
    type = models.CharField(max_length=10, choices=Type.choices, default=Type.TV)
    logo = models.URLField(blank=True, help_text="Lien vers le logo (pas d'ImageField).")
    actif = models.BooleanField(default=True)

    class Meta:
        db_table = "programmation_chaine"
        verbose_name = "chaîne"

    def __str__(self) -> str:  # pragma: no cover
        return self.nom


class Grille(models.Model):
    """Grille de programmes d'une chaîne sur une période donnée."""

    class Statut(models.TextChoices):
        BROUILLON = "brouillon", "Brouillon"
        EN_VALIDATION = "en_validation", "En validation"
        VALIDEE = "validee", "Validée"

    chaine = models.ForeignKey(
        Chaine, on_delete=models.CASCADE, related_name="grilles"
    )
    date_debut = models.DateField()
    date_fin = models.DateField()
    statut = models.CharField(
        max_length=20, choices=Statut.choices, default=Statut.BROUILLON
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    date_validation = models.DateTimeField(null=True, blank=True)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="grilles_creees",
    )
    valide_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="grilles_validees",
    )

    class Meta:
        db_table = "programmation_grille"
        verbose_name = "grille"
        constraints = [
            models.CheckConstraint(
                check=models.Q(date_fin__gte=models.F("date_debut")),
                name="grille_date_fin_apres_debut",
            )
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.chaine.nom} — {self.date_debut} → {self.date_fin} ({self.statut})"

    # ---------------------------------------------------------- Complétude
    def plages_vides(self) -> list:
        """
        Retourne les trous horaires [(heure_debut, heure_fin), ...] sur la
        fenêtre 06:00 → 24:00 de chaque jour couvert par la grille.
        """
        from django.utils import timezone
        
        vides = []
        jour = self.date_debut
        while jour <= self.date_fin:
            # Utilisation de timezone pour gérer les datetime aware/naive
            debut_jour = timezone.make_aware(datetime.combine(jour, DEBUT_ANTENNE))
            fin_jour = timezone.make_aware(datetime.combine(jour + timedelta(days=1), FIN_ANTENNE))

            emissions = sorted(
                (
                    e
                    for e in self.emissions.all()
                    if e.heure_debut.date() == jour
                ),
                key=lambda e: e.heure_debut,
            )

            curseur = debut_jour
            for emission in emissions:
                # S'assurer que les datetime sont comparables (toutes aware)
                emission_debut = timezone.make_aware(emission.heure_debut) if timezone.is_naive(emission.heure_debut) else emission.heure_debut
                emission_fin = timezone.make_aware(emission.heure_fin) if timezone.is_naive(emission.heure_fin) else emission.heure_fin
                
                if emission_debut > curseur:
                    vides.append((curseur, emission_debut))
                curseur = max(curseur, emission_fin)
            if curseur < fin_jour:
                vides.append((curseur, fin_jour))

            jour += timedelta(days=1)
        return vides

    def est_complete(self) -> bool:
        """Vrai si la couverture 06:00 → 24:00 ne contient aucun trou."""
        return len(self.plages_vides()) == 0


class Emission(models.Model):
    """Émission programmée dans une grille."""

    class Genre(models.TextChoices):
        INFO = "info", "Information"
        DIVERTISSEMENT = "divertissement", "Divertissement"
        SPORT = "sport", "Sport"
        CULTURE = "culture", "Culture"
        MUSIQUE = "musique", "Musique"
        RELIGION = "religion", "Religion"
        JEUNESSE = "jeunesse", "Jeunesse"
        TALK = "talk", "Talk-show"
        SERIE = "serie", "Série"
        MAGAZINE = "magazine", "Magazine"
        AUTRE = "autre", "Autre"

    class Fiabilite(models.TextChoices):
        CONFIRME = "confirme", "Confirmé"
        ESTIME = "estime", "Estimé"

    grille = models.ForeignKey(Grille, on_delete=models.CASCADE, related_name="emissions")
    titre = models.CharField(max_length=200)
    genre = models.CharField(max_length=30, choices=Genre.choices, default=Genre.AUTRE)
    description = models.TextField(blank=True)
    heure_debut = models.DateTimeField()
    heure_fin = models.DateTimeField()
    image_affiche = models.URLField(
        blank=True,
        null=True,
        help_text="Lien vers l'affiche affichée sur le frontend (ex. https://balafon.media/images/c-le-matin.jpg).",
    )
    fiabilite = models.CharField(
        max_length=20, choices=Fiabilite.choices, default=Fiabilite.ESTIME
    )

    class Meta:
        db_table = "programmation_emission"
        verbose_name = "émission"
        ordering = ["heure_debut"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(heure_fin__gt=models.F("heure_debut")),
                name="emission_heure_fin_apres_debut",
            )
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.titre} ({self.heure_debut:%H:%M} – {self.heure_fin:%H:%M})"

    # ------------------------------------------------------------ Validation
    def clean(self):
        """heure_fin > heure_debut + anti-chevauchement dans la même grille."""
        if self.heure_debut and self.heure_fin and self.heure_fin <= self.heure_debut:
            raise ValidationError(
                {"heure_fin": "L'heure de fin doit être strictement après l'heure de début."}
            )

        if self.grille_id and self.heure_debut and self.heure_fin:
            conflit = (
                Emission.objects.filter(grille=self.grille)
                .exclude(pk=self.pk)
                .filter(
                    heure_debut__lt=self.heure_fin,
                    heure_fin__gt=self.heure_debut,
                )
                .first()
            )
            if conflit:
                raise ValidationError(
                    f"Chevauchement avec « {conflit.titre} » "
                    f"({conflit.heure_debut:%H:%M} – {conflit.heure_fin:%H:%M}) dans la même grille."
                )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

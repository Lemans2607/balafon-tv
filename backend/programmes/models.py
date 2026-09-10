from django.db import models


class Chaine(models.Model):
    nom = models.CharField(max_length=80)
    accent = models.CharField(max_length=9, default="#a43700")  # couleur de marque
    ordre = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["ordre"]
        verbose_name = "chaîne"

    def __str__(self):
        return self.nom


class Emission(models.Model):
    class Statut(models.TextChoices):
        BROUILLON = "brouillon", "Brouillon"
        EN_ATTENTE = "en_attente_validation", "En attente de validation"
        VALIDE = "valide", "Validée"
        DIFFUSION = "diffusion", "En diffusion"

    class TypeDiffusion(models.TextChoices):
        DIRECT = "direct", "Direct"
        ENREGISTRE = "enregistre", "Enregistré"
        REDIFFUSION = "rediffusion", "Rediffusion"

    class Categorie(models.TextChoices):
        INFORMATION = "information", "Information"
        DIVERTISSEMENT = "divertissement", "Divertissement"
        SPORT = "sport", "Sport"
        CULTURE = "culture", "Culture"
        FILM = "film", "Film & série"

    titre = models.CharField(max_length=160)
    chaine = models.ForeignKey(Chaine, on_delete=models.CASCADE, related_name="emissions")
    jour = models.DateField()  # jour de diffusion (grille hebdomadaire datée)
    debut = models.TimeField()
    fin = models.TimeField()
    description = models.TextField(blank=True)
    statut = models.CharField(max_length=24, choices=Statut.choices, default=Statut.BROUILLON)
    type_diffusion = models.CharField(max_length=16, choices=TypeDiffusion.choices, default=TypeDiffusion.ENREGISTRE)
    categorie = models.CharField(max_length=20, choices=Categorie.choices, default=Categorie.INFORMATION)
    commentaire_rejet = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["jour", "debut"]
        verbose_name = "émission"

    def __str__(self):
        return f"{self.titre} ({self.jour} {self.debut:%H:%M})"

    def chevauche(self, autre: "Emission") -> bool:
        """Même chaîne, même jour, créneaux qui se chevauchent (fin 00:00 = minuit)."""
        from datetime import time

        def minutes(t: time) -> int:
            return t.hour * 60 + t.minute

        def fin_minutes(e: "Emission") -> int:
            m = minutes(e.fin)
            return 1440 if m == 0 else m

        return (
            self.chaine_id == autre.chaine_id
            and self.jour == autre.jour
            and minutes(self.debut) < fin_minutes(autre)
            and minutes(autre.debut) < fin_minutes(self)
        )


class JournalVmix(models.Model):
    heure = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=80)
    element = models.CharField(max_length=160)
    succes = models.BooleanField(default=True)

    class Meta:
        ordering = ["-heure"]
        verbose_name = "entrée de journal vMix"

    def __str__(self):
        return f"{self.heure:%H:%M:%S} {self.action}"

"""
Modèle Alerte — notification de la régie (diffuseur).

Les alertes sont créées par la couche métier (programmation) puis poussées
en temps réel via Channels (`alertes.services.notifier_alerte`).
"""
from django.conf import settings
from django.db import models


class Alerte(models.Model):
    """Alerte destinée à la régie de diffusion."""

    class Type(models.TextChoices):
        MODIFICATION = "modification_derniere_minute", "Modification dernière minute"
        INCOMPLETE = "grille_incomplete", "Grille incomplète"
        VALIDATION = "validation", "Validation de grille"
        SYNCHRO = "synchro_vmix", "Synchronisation vMix"
        AUTRE = "autre", "Autre"

    grille = models.ForeignKey(
        "programmation.Grille", on_delete=models.CASCADE, related_name="alertes",
        null=True, blank=True,
    )
    emission = models.ForeignKey(
        "programmation.Emission", on_delete=models.SET_NULL, null=True, blank=True,
    )
    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        limit_choices_to={"role": "diffuseur"},
        help_text="Diffuseur destinataire (null = tous les diffuseurs de la chaîne).",
    )
    type = models.CharField(max_length=40, choices=Type.choices, default=Type.AUTRE)
    message = models.TextField()
    date_envoi = models.DateTimeField(auto_now_add=True)
    statut_lecture = models.BooleanField(default=False)

    class Meta:
        verbose_name = "alerte"
        ordering = ["-date_envoi"]

    def __str__(self) -> str:  # pragma: no cover
        return f"[{self.get_type_display()}] {self.message[:60]}"

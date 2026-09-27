"""
Modèle SynchroVmix — traçabilité de chaque tentative de synchronisation.

Répond à l'exigence non-fonctionnelle « Fiabilité : garantir une
synchronisation sans faille » en journalisant chaque appel (JSONB PostgreSQL).
"""
from django.db import models


class SynchroVmix(models.Model):
    """Journal d'une synchronisation de grille vers vMix."""

    class Statut(models.TextChoices):
        EN_ATTENTE = "en_attente", "En attente"
        SUCCES = "succes", "Succès"
        ECHEC = "echec", "Échec"

    grille = models.ForeignKey(
        "programmation.Grille", on_delete=models.CASCADE, related_name="synchros_vmix"
    )
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    reponse_vmix = models.JSONField(
        default=dict, blank=True,
        help_text="Réponse brute de vMix (exploite le JSONB PostgreSQL).",
    )
    date_synchro = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "synchronisation vMix"
        ordering = ["-date_synchro"]

    def __str__(self) -> str:  # pragma: no cover
        return f"Synchro {self.grille_id} → {self.statut} ({self.date_synchro:%d/%m %H:%M})"

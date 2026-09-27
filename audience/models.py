"""
Mesure d'audience — BALAFON + GUIDE.

Répond à deux questions de la Direction d'Antenne :
    1. combien d'écrans suivent l'émission en cours, maintenant ?
    2. quelles émissions sont les plus suivies sur la période ?

Principe : chaque onglet ouvert envoie un « battement » toutes les
30 secondes. Une session est active si son dernier battement date
de moins de 90 secondes (tolérance de 3 battements manqués).

Aucune donnée personnelle n'est conservée : la clé de session est
générée par le navigateur (sessionStorage) et l'adresse IP n'existe
que sous forme de hachage tronqué, pour écarter le double comptage.
"""
import hashlib
from datetime import timedelta

from django.db import models
from django.utils import timezone

from programmation.models import Emission

FENETRE_ACTIVE = timedelta(seconds=90)


class SessionAudience(models.Model):
    """Un écran connecté au portail public."""

    cle_session = models.CharField(max_length=64, db_index=True)
    emission = models.ForeignKey(
        Emission,
        on_delete=models.CASCADE,
        related_name="sessions_audience",
        null=True,
        blank=True,
        help_text="Émission suivie au moment du battement (null hors antenne).",
    )
    empreinte = models.CharField(
        max_length=32,
        blank=True,
        help_text="Hachage tronqué IP+user-agent, non réversible.",
    )
    premier_battement = models.DateTimeField(default=timezone.now)
    dernier_battement = models.DateTimeField(default=timezone.now, db_index=True)
    battements = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "audience_session"
        verbose_name = "session d'audience"
        verbose_name_plural = "sessions d'audience"
        indexes = [models.Index(fields=["emission", "dernier_battement"])]
        constraints = [
            models.UniqueConstraint(
                fields=["cle_session", "emission"],
                name="audience_une_session_par_emission",
            )
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.cle_session[:10]}… → {self.emission_id or 'hors antenne'}"

    @property
    def duree_vue_s(self) -> int:
        """Durée de visionnage estimée, en secondes."""
        return int((self.dernier_battement - self.premier_battement).total_seconds())

    @staticmethod
    def empreinte_de(ip: str, user_agent: str) -> str:
        return hashlib.sha256(f"{ip}|{user_agent}".encode("utf-8")).hexdigest()[:32]

    @classmethod
    def actives(cls, emission_id: int | None = None):
        """Sessions ayant émis un battement dans la fenêtre glissante."""
        qs = cls.objects.filter(dernier_battement__gte=timezone.now() - FENETRE_ACTIVE)
        if emission_id is not None:
            qs = qs.filter(emission_id=emission_id)
        return qs


class ReleveAudience(models.Model):
    """
    Photographie horodatée de l'audience d'une émission.

    Écrite toutes les 5 minutes par `manage.py releve_audience`.
    C'est cette table qui alimente les courbes du tableau de bord :
    elle survit à la purge des sessions.
    """

    emission = models.ForeignKey(
        Emission, on_delete=models.CASCADE, related_name="releves_audience"
    )
    instant = models.DateTimeField(default=timezone.now, db_index=True)
    spectateurs = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "audience_releve"
        verbose_name = "relevé d'audience"
        verbose_name_plural = "relevés d'audience"
        ordering = ["-instant"]
        indexes = [models.Index(fields=["emission", "-instant"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.emission_id} — {self.spectateurs} à {self.instant:%d/%m %H:%M}"

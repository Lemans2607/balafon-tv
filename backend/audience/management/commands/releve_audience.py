"""
Photographie l'audience de l'émission en cours et purge les sessions mortes.

À faire tourner toutes les 5 minutes :

    */5 * * * *  cd /srv/balafon && .venv/bin/python manage.py releve_audience

(ou en tâche périodique Celery si RabbitMQ est déjà en place pour vMix.)
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from audience.api import emission_en_cours
from audience.models import ReleveAudience, SessionAudience


class Command(BaseCommand):
    help = "Enregistre un relevé d'audience et purge les sessions expirées."

    def add_arguments(self, parser):
        parser.add_argument(
            "--purge-jours",
            type=int,
            default=30,
            help="Supprime les sessions plus anciennes que N jours (défaut : 30).",
        )

    def handle(self, *args, **options):
        em = emission_en_cours()
        if em:
            n = SessionAudience.actives(em.id).count()
            ReleveAudience.objects.create(emission=em, spectateurs=n)
            self.stdout.write(self.style.SUCCESS(f"Relevé : « {em.titre} » — {n} spectateur(s)."))
        else:
            self.stdout.write("Hors antenne : aucun relevé.")

        limite = timezone.now() - timedelta(days=options["purge_jours"])
        supprimees, _ = SessionAudience.objects.filter(dernier_battement__lt=limite).delete()
        if supprimees:
            self.stdout.write(f"{supprimees} session(s) expirée(s) purgée(s).")

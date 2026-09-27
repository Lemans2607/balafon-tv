"""
Patch — backend/programmation/apps.py

Ajoutez la méthode ready() pour que les signaux soient enregistrés
au démarrage. Sans cela, signals.py n'est jamais importé et rien
n'est diffusé.
"""

from django.apps import AppConfig


class ProgrammationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "programmation"
    verbose_name = "Programmation d'antenne"

    def ready(self):  # ← À AJOUTER
        from . import signals  # noqa: F401

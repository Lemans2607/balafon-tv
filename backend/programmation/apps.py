"""Configuration de l'app programmation."""
from django.apps import AppConfig


class ProgrammationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "programmation"
    verbose_name = "Programmation (grilles & émissions)"

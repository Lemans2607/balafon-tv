"""Routes /api/vmix/ — synchronisation et état du connecteur."""
from django.urls import path

from . import api

urlpatterns = [
    path("synchroniser/<int:grille_id>/", api.synchroniser, name="vmix-synchroniser"),
    path("etat/", api.etat, name="vmix-etat"),
]

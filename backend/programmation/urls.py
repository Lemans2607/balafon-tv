"""Routes /api/ — chaînes, grilles, émissions."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import api

router = DefaultRouter()
router.register("chaines", api.ChaineViewSet, basename="chaines")
router.register("grilles", api.GrilleViewSet, basename="grilles")
router.register("emissions", api.EmissionViewSet, basename="emissions")

# Émissions imbriquées sous une grille : /grilles/{grille_id}/emissions/
emissions_imbriquees = DefaultRouter()
emissions_imbriquees.register(
    "emissions", api.GrilleEmissionsViewSet, basename="grille-emissions"
)

urlpatterns = [
    path("grilles/<int:grille_id>/", include(emissions_imbriquees.urls)),
    path("", include(router.urls)),
]

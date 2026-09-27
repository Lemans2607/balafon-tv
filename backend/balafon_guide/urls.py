"""
Routes racine — BALAFON + GUIDE.

    admin/         → administration Django
    api/auth/      → authentification JWT + comptes (app comptes)
    api/           → chaînes, grilles, émissions (app programmation)
    api/           → alertes régie, REST en complément du WebSocket (app alertes)
    api/audience/  → mesure d'audience du portail public (app audience)
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("comptes.urls")),
    path("api/", include("programmation.urls")),
    path("api/", include("alertes.urls")),
    path("api/audience/", include("audience.urls")),
]

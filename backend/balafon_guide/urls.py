"""
Routes racine — BALAFON + GUIDE.

    admin/    → administration Django
    api/auth/ → authentification JWT + comptes (app comptes)
    api/      → chaînes, grilles, émissions (app programmation)
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("comptes.urls")),
    path("api/", include("programmation.urls")),
]

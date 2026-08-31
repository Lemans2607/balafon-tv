"""Routes /api/auth/ — authentification JWT + profil + comptes."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from . import api

router = DefaultRouter()
router.register("comptes", api.CompteViewSet, basename="comptes")

urlpatterns = [
    path("connexion/", api.connexion, name="auth-connexion"),
    path("rafraichir/", TokenRefreshView.as_view(), name="auth-rafraichir"),
    path("deconnexion/", api.deconnexion, name="auth-deconnexion"),
    path("profil/", api.profil, name="auth-profil"),
    path("", include(router.urls)),
]

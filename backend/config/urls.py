"""URLconf — contrat REST attendu par le frontend Balafon Plus."""
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts import views as accounts_views
from programmes import views as programmes_views

router = DefaultRouter()
router.register(r"chaines", programmes_views.ChaineViewSet, basename="chaine")
router.register(r"emissions", programmes_views.EmissionViewSet, basename="emission")

urlpatterns = [
    path("admin/", admin.site.urls),
    # ——— Authentification ———
    path("api/auth/login/", accounts_views.LoginView.as_view(), name="auth-login"),
    path("api/auth/me/", accounts_views.MeView.as_view(), name="auth-me"),
    path("api/auth/demande-acces/", accounts_views.DemandeAccesView.as_view(), name="auth-demande"),
    path("api/auth/demandes/", accounts_views.ListeDemandesView.as_view(), name="auth-demandes"),
    # ——— Programmes & chaînes ———
    path("api/", include(router.urls)),
    # ——— Régie / vMix ———
    path("api/regie/vmix/statut/", programmes_views.vmix_statut, name="vmix-statut"),
    path("api/regie/vmix/synchroniser/", programmes_views.vmix_synchroniser, name="vmix-sync"),
    path("api/regie/vmix/journal/", programmes_views.vmix_journal, name="vmix-journal"),
]

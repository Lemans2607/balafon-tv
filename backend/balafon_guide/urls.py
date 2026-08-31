"""
Routes racine — BALAFON + GUIDE.

Toutes les routes métier sont préfixées /api/ (contrat consommé par le frontend React).
Documentation interactive : /api/schema/swagger/
"""
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("comptes.urls")),
    path("api/", include("programmation.urls")),
    path("api/", include("alertes.urls")),
    path("api/vmix/", include("integration_vmix.urls")),
    # Documentation OpenAPI / Swagger UI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/schema/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger"),
]

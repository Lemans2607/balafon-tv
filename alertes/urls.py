"""Routes /api/ — alertes."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import api

router = DefaultRouter()
router.register("alertes", api.AlerteViewSet, basename="alertes")

urlpatterns = [path("", include(router.urls))]

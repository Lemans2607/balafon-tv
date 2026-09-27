"""Routes /api/audience/."""
from django.urls import path

from . import api

urlpatterns = [
    path("battement/", api.battement, name="audience-battement"),
    path("direct/", api.direct, name="audience-direct"),
    path("classement/", api.classement, name="audience-classement"),
    path("resume/", api.resume, name="audience-resume"),
    path("courbe/<int:emission_id>/", api.courbe, name="audience-courbe"),
]

"""
API alertes — lecture + acquittement (REST, en complément du WebSocket).

Endpoints (préfixés /api/ dans urls.py) :
    GET  /alertes/                    [diffuseur : les siennes ; admin/dir. : toutes]
    POST /alertes/{id}/marquer-lue/   [diffuseur]
"""
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Alerte


class AlerteSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)
    grille_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Alerte
        fields = [
            "id", "type", "type_display", "message", "date_envoi",
            "statut_lecture", "grille_id",
        ]
        read_only_fields = fields


class AlerteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Liste des alertes.

    - diffuseur → alertes qui le visent (ou sans destinataire précis) ;
    - admin / directeur → toutes les alertes.
    """

    serializer_class = AlerteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Alerte.objects.select_related("grille")
        if user.est_diffuseur:
            qs = qs.filter(models_q(user))
        return qs

    @action(detail=True, methods=["post"], url_path="marquer-lue")
    def marquer_lue(self, request, pk=None):
        """Acquitte une alerte (la conserve dans l'historique)."""
        alerte = self.get_object()
        alerte.statut_lecture = True
        alerte.save(update_fields=["statut_lecture"])
        return Response(AlerteSerializer(alerte).data)


def models_q(user):
    from django.db.models import Q

    return Q(destinataire=user) | Q(destinataire__isnull=True)

"""
API vMix — synchronisation et health-check.

Endpoints (préfixés /api/vmix/ dans urls.py) :
    POST /vmix/synchroniser/{grille_id}/   [directeur_antenne, diffuseur]
    GET  /vmix/etat/                       health-check du connecteur
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from programmation.models import Grille

from .models import SynchroVmix
from .services import get_client


class EstEquipeAntenne(BasePermission):
    """Directeur d'Antenne ou Diffuseur peuvent déclencher une synchro."""

    message = "Réservé à l'équipe d'antenne (Directeur ou Diffuseur)."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.est_directeur_antenne or user.est_diffuseur)
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated, EstEquipeAntenne()])
def synchroniser(request, grille_id: int) -> Response:
    """
    Synchronise une grille validée avec vMix et trace le résultat.

    Chaque tentative crée un enregistrement `SynchroVmix` (JSONB).
    """
    try:
        grille = Grille.objects.get(pk=grille_id)
    except Grille.DoesNotExist:
        return Response({"detail": "Grille introuvable."}, status=status.HTTP_404_NOT_FOUND)

    if grille.statut != Grille.Statut.VALIDEE:
        return Response(
            {"detail": "Seule une grille validée peut être synchronisée."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    client = get_client()
    synchro = SynchroVmix.objects.create(grille=grille, statut=SynchroVmix.Statut.EN_ATTENTE)

    resultat = client.pousser_grille(grille)
    synchro.reponse_vmix = resultat
    synchro.statut = (
        SynchroVmix.Statut.SUCCES if resultat.get("succes") else SynchroVmix.Statut.ECHEC
    )
    synchro.save()

    return Response(
        {
            "grille_id": grille.id,
            "statut": synchro.statut,
            "reponse_vmix": resultat,
            "date_synchro": synchro.date_synchro,
        },
        status=status.HTTP_200_OK if resultat.get("succes") else status.HTTP_502_BAD_GATEWAY,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def etat(request) -> Response:
    """Health-check du connecteur vMix."""
    from django.conf import settings

    client = get_client()
    return Response({"mode": settings.VMIX_MODE, **client.verifier_etat()})

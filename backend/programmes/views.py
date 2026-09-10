from datetime import datetime, timezone

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone as dj_timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response

from .models import Chaine, Emission, JournalVmix
from .serializers import ChaineSerializer, EmissionSerializer, JournalVmixSerializer

GROUPE_WS = "grille"


def diffuser(type_evenement: str, emission: Emission) -> None:
    """Pousse l'événement aux abonnés WebSocket (groupe « grille »)."""
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(
        GROUPE_WS,
        {
            "type": type_evenement,  # "grille.mise_a_jour" | "grille.validee"
            "emission": EmissionSerializer(emission).data,
        },
    )


class EstAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


class EstDirecteur(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "directeur")


class ChaineViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Chaine.objects.all()
    serializer_class = ChaineSerializer
    permission_classes = [AllowAny]


class EmissionViewSet(viewsets.ModelViewSet):
    """
    CRUD + workflow :
      POST /api/emissions/:id/soumettre/  (admin → en_attente_validation)
      POST /api/emissions/:id/valider/    (directeur → valide, notifie la régie)
      POST /api/emissions/:id/rejeter/    (directeur → brouillon + commentaire)

    Lecture publique : seules les émissions validées sont visibles sans rôle éditeur.
    """

    serializer_class = EmissionSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "soumettre"):
            return [EstAdmin()]
        if self.action in ("valider", "rejeter"):
            return [EstDirecteur()]
        return [AllowAny()]

    def get_queryset(self):
        qs = Emission.objects.select_related("chaine")
        user = self.request.user
        if user.is_authenticated and user.role in ("admin", "directeur"):
            return qs
        # Public & régie : grille validée uniquement
        return qs.filter(statut__in=[Emission.Statut.VALIDE, Emission.Statut.DIFFUSION])

    def perform_create(self, serializer):
        emission = serializer.save(statut=Emission.Statut.BROUILLON)
        diffuser("grille.mise_a_jour", emission)

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.statut != Emission.Statut.BROUILLON:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Seule une émission en brouillon est modifiable.")
        emission = serializer.save()
        diffuser("grille.mise_a_jour", emission)

    def perform_destroy(self, instance):
        if instance.statut != Emission.Statut.BROUILLON:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Seule une émission en brouillon est supprimable.")
        data = EmissionSerializer(instance).data
        instance.delete()
        diffuser("grille.mise_a_jour", Emission(**{**data, "chaine_id": data["chaine"]}))

    @action(detail=True, methods=["post"])
    def soumettre(self, request, pk=None):
        emission = self.get_object()
        if emission.statut != Emission.Statut.BROUILLON:
            return Response(
                {"detail": "Seul un brouillon peut être soumis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        emission.statut = Emission.Statut.EN_ATTENTE
        emission.commentaire_rejet = ""
        emission.save(update_fields=["statut", "commentaire_rejet", "updated_at"])
        diffuser("grille.mise_a_jour", emission)
        return Response(EmissionSerializer(emission).data)

    @action(detail=True, methods=["post"])
    def valider(self, request, pk=None):
        emission = self.get_object()
        if emission.statut != Emission.Statut.EN_ATTENTE:
            return Response(
                {"detail": "Seule une émission en attente peut être validée."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        emission.statut = Emission.Statut.VALIDE
        emission.commentaire_rejet = ""
        emission.save(update_fields=["statut", "commentaire_rejet", "updated_at"])
        diffuser("grille.validee", emission)  # notifie la régie en temps réel
        return Response(EmissionSerializer(emission).data)

    @action(detail=True, methods=["post"])
    def rejeter(self, request, pk=None):
        emission = self.get_object()
        if emission.statut != Emission.Statut.EN_ATTENTE:
            return Response(
                {"detail": "Seule une émission en attente peut être rejetée."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        commentaire = (request.data.get("commentaire") or "").strip()
        if len(commentaire) < 5:
            return Response(
                {"detail": "Le motif de rejet est obligatoire (5 caractères min)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        emission.statut = Emission.Statut.BROUILLON
        emission.commentaire_rejet = commentaire
        emission.save(update_fields=["statut", "commentaire_rejet", "updated_at"])
        diffuser("grille.mise_a_jour", emission)
        return Response(EmissionSerializer(emission).data)


# ————————————————— Régie / vMix —————————————————
# Intégration indicative : à brancher sur votre vMix réel (API HTTP localhost:8088).
# En attendant, l'état est simulé en mémoire et le frontend bascule proprement
# sur « vMix indisponible » si ces endpoints ne répondent pas.

_VMIX = {
    "en_ligne": True,
    "version": "vMix 27.0.0.52",
    "latence_ms": 34,
    "derniere_sync": None,
}


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vmix_statut(request):
    return Response(_VMIX)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def vmix_synchroniser(request):
    if not _VMIX["en_ligne"]:
        return Response(
            {"detail": "vMix hors ligne — synchronisation impossible."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    maintenant = dj_timezone.now()
    valides = Emission.objects.filter(statut__in=[Emission.Statut.VALIDE, Emission.Statut.DIFFUSION])
    JournalVmix.objects.create(
        action="Synchronisation grille",
        element=f"{valides.count()} émissions validées",
        succes=True,
    )
    for chaine in Chaine.objects.all():
        nb = valides.filter(chaine=chaine).count()
        JournalVmix.objects.create(
            action="Envoi playlist",
            element=f"{chaine.nom} — {nb} éléments",
            succes=True,
        )
    _VMIX["derniere_sync"] = datetime.now(timezone.utc).isoformat()
    return Response({"message": "Grille synchronisée avec vMix.", "envoyes": valides.count()})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vmix_journal(request):
    entrees = JournalVmix.objects.all()[:60]
    return Response(JournalVmixSerializer(entrees, many=True).data)

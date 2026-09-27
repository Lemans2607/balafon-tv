"""
ViewSets DRF — chaînes, grilles, émissions.

Règles :
    - écriture grilles/émissions  → admin ou directeur d'antenne ;
    - validation d'une grille     → directeur d'antenne UNIQUEMENT ;
    - lecture publique            → tout le monde (les grilles non validées
      restent visibles aux équipes authentifiées).
"""
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from comptes.api import est_admin_ou_directeur

from .models import Chaine, Emission, Grille
from .serializers import ChaineSerializer, EmissionSerializer, GrilleSerializer


class ChaineViewSet(viewsets.ModelViewSet):
    """CRUD des chaînes — lecture publique, écriture admin/directeur."""

    queryset = Chaine.objects.all().order_by("id")
    serializer_class = ChaineSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated()]
        return [AllowAny()]

    def perform_create(self, serializer):
        if not est_admin_ou_directeur(self.request.user):
            self.permission_denied(self.request, message="Réservé aux administrateurs et directeurs.")
        serializer.save()


class GrilleViewSet(viewsets.ModelViewSet):
    """
    CRUD des grilles.

    Filtres : ?statut=validee&chaine=<slug>
    Actions : POST /grilles/{id}/valider/ (directeur d'antenne uniquement),
              GET  /grilles/{id}/completude/
    """

    serializer_class = GrilleSerializer

    def get_queryset(self):
        qs = Grille.objects.select_related("chaine").prefetch_related("emissions")

        statut = self.request.query_params.get("statut")
        if statut:
            qs = qs.filter(statut=statut)
        chaine = self.request.query_params.get("chaine")
        if chaine:
            qs = qs.filter(chaine__slug=chaine)
        return qs.order_by("date_debut")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated()]
        return [AllowAny()]

    def _exiger_gestion(self):
        if not est_admin_ou_directeur(self.request.user):
            self.permission_denied(
                self.request, message="Réservé aux administrateurs et directeurs d'antenne."
            )

    def perform_create(self, serializer):
        self._exiger_gestion()
        serializer.save(cree_par=self.request.user)

    def perform_update(self, serializer):
        self._exiger_gestion()
        serializer.save()

    def perform_destroy(self, instance):
        self._exiger_gestion()
        instance.delete()

    @action(detail=True, methods=["post"], url_path="valider")
    def valider(self, request, pk=None):
        """Passe la grille à « validée » — directeur d'antenne UNIQUEMENT."""
        grille = self.get_object()

        if not (request.user and request.user.is_authenticated and request.user.est_directeur_antenne):
            return Response(
                {"detail": "Seul un Directeur d'Antenne peut valider une grille."},
                status=status.HTTP_403_FORBIDDEN,
            )

        grille.statut = Grille.Statut.VALIDEE
        grille.valide_par = request.user
        grille.date_validation = timezone.now()
        grille.save()
        return Response(GrilleSerializer(grille).data)

    @action(detail=True, methods=["get"], url_path="completude")
    def completude(self, request, pk=None):
        """Expose le contrôle de complétude 06:00 → 24:00."""
        grille = self.get_object()
        vides = [
            {"heure_debut": d.isoformat(), "heure_fin": f.isoformat()}
            for d, f in grille.plages_vides()
        ]
        return Response({"complete": grille.est_complete(), "plages_vides": vides})


class EmissionViewSet(viewsets.ModelViewSet):
    """CRUD des émissions (écriture admin/directeur)."""

    queryset = Emission.objects.select_related("grille").order_by("heure_debut")
    serializer_class = EmissionSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated()]
        return [AllowAny()]

    def _exiger_gestion(self):
        if not est_admin_ou_directeur(self.request.user):
            self.permission_denied(
                self.request, message="Réservé aux administrateurs et directeurs d'antenne."
            )

    def perform_create(self, serializer):
        self._exiger_gestion()
        serializer.save()

    def perform_update(self, serializer):
        self._exiger_gestion()
        serializer.save()

    def perform_destroy(self, instance):
        self._exiger_gestion()
        instance.delete()


class GrilleEmissionsViewSet(viewsets.ModelViewSet):
    """Émissions imbriquées sous une grille : /grilles/{grille_id}/emissions/."""

    serializer_class = EmissionSerializer

    def get_queryset(self):
        return (
            Emission.objects.filter(grille_id=self.kwargs["grille_id"])
            .order_by("heure_debut")
        )

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated()]
        return [AllowAny()]

    def _exiger_gestion(self):
        if not est_admin_ou_directeur(self.request.user):
            self.permission_denied(
                self.request, message="Réservé aux administrateurs et directeurs d'antenne."
            )

    def perform_create(self, serializer):
        self._exiger_gestion()
        serializer.save(grille_id=self.kwargs["grille_id"])

    def perform_update(self, serializer):
        self._exiger_gestion()
        serializer.save()

    def perform_destroy(self, instance):
        self._exiger_gestion()
        instance.delete()

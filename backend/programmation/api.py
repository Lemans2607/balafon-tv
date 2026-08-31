"""
API programmation — Chaînes, Grilles, Émissions.

Endpoints (préfixés /api/ dans urls.py) :
    GET    /chaines/                                  [public]
    GET    /grilles/?chaine=&date=&statut=            [public si validee]
    POST   /grilles/                                  [admin, directeur]
    PATCH  /grilles/{id}/                             [admin, directeur]
    DELETE /grilles/{id}/                             [admin, directeur]
    POST   /grilles/{id}/valider/                     [directeur UNIQUEMENT]
    GET    /grilles/{id}/completude/
    GET    /grilles/en-cours/?chaine=                 [public]
    GET/POST /grilles/{id}/emissions/
    GET/PATCH/DELETE /emissions/{id}/
"""
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from comptes.permissions import (
    EstDirecteurAntenne,
    LecturePubliqueEcritureAuthentifiee,
)

from .models import Chaine, Emission, Grille


# ---------------------------------------------------------------- Serializers
class ChaineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chaine
        fields = ["id", "nom", "slug", "type", "actif"]


class EmissionSerializer(serializers.ModelSerializer):
    """Sérialise une émission ; la validation métier est dans Emission.clean()."""

    class Meta:
        model = Emission
        fields = ["id", "grille", "titre", "genre", "description", "heure_debut", "heure_fin"]
        read_only_fields = ["grille"]

    def validate(self, attrs):
        debut = attrs.get("heure_debut") or getattr(self.instance, "heure_debut", None)
        fin = attrs.get("heure_fin") or getattr(self.instance, "heure_fin", None)
        if debut and fin and fin <= debut:
            raise serializers.ValidationError(
                {"heure_fin": "L'heure de fin doit être après l'heure de début."}
            )
        return attrs


class GrilleSerializer(serializers.ModelSerializer):
    """Grille avec ses émissions imbriquées en lecture."""

    emissions = EmissionSerializer(many=True, read_only=True)
    chaine_detail = ChaineSerializer(source="chaine", read_only=True)
    cree_par_nom = serializers.CharField(source="cree_par.get_full_name", read_only=True, default="")
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)

    class Meta:
        model = Grille
        fields = [
            "id", "chaine", "chaine_detail", "date_debut", "date_fin",
            "statut", "statut_display", "date_creation", "date_validation",
            "cree_par", "cree_par_nom", "valide_par", "emissions",
        ]
        read_only_fields = ["statut", "date_validation", "cree_par", "valide_par"]

    def create(self, validated_data):
        # Une grille naît toujours brouillon, créée par l'utilisateur courant.
        validated_data["statut"] = Grille.Statut.BROUILLON
        validated_data["cree_par"] = self.context["request"].user
        return super().create(validated_data)


class GrilleListSerializer(GrilleSerializer):
    """Version allégée pour les listes (sans émissions imbriquées)."""

    class Meta(GrilleSerializer.Meta):
        fields = [f for f in GrilleSerializer.Meta.fields if f != "emissions"]


def _notifier_modification(grille: Grille, message: str) -> None:
    """
    Crée une Alerte + la pousse en WebSocket au groupe de la chaîne.
    Import local pour éviter un import circulaire alertes ↔ programmation.
    """
    try:
        from alertes.models import Alerte
        from alertes.services import notifier_alerte

        alerte = Alerte.objects.create(
            grille=grille,
            type=Alerte.Type.MODIFICATION,
            message=message,
        )
        notifier_alerte(alerte)
    except Exception:  # noqa: BLE001 — la notification ne doit pas casser l'écriture
        pass


# ------------------------------------------------------------------ ViewSets
class ChaineViewSet(viewsets.ReadOnlyModelViewSet):
    """Liste publique des chaînes (le portail ne diffuse que Balafon TV)."""

    queryset = Chaine.objects.filter(actif=True)
    serializer_class = ChaineSerializer
    permission_classes = [AllowAny]


class GrilleViewSet(viewsets.ModelViewSet):
    """
    CRUD des grilles.

    - Lecture publique limitée aux grilles `validee` (règle métier §6).
    - Écriture réservée à admin / directeur.
    """

    serializer_class = GrilleSerializer
    permission_classes = [LecturePubliqueEcritureAuthentifiee]
    filterset_fields = ["chaine", "statut", "date_debut"]

    def get_queryset(self):
        qs = Grille.objects.select_related("chaine").prefetch_related("emissions")
        user = self.request.user
        # Public non authentifié (ou non habilité) → uniquement les validées.
        if not (user.is_authenticated and user.peut_gerer_grille):
            qs = qs.filter(statut=Grille.Statut.VALIDEE)
        if chaine := self.request.query_params.get("chaine"):
            qs = qs.filter(chaine__slug=chaine)
        if date := self.request.query_params.get("date"):
            qs = qs.filter(date_debut__lte=date, date_fin__gte=date)
        if statut := self.request.query_params.get("statut"):
            qs = qs.filter(statut=statut)
        return qs.order_by("date_debut")

    def get_serializer_class(self):
        if self.action == "list":
            return GrilleListSerializer
        return GrilleSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [EstDirecteurAntenne()]
        if self.action == "valider":
            return [EstDirecteurAntenne()]
        return super().get_permissions()

    def perform_update(self, serializer):
        etait_validee = serializer.instance.statut == Grille.Statut.VALIDEE
        grille = serializer.save()
        # Règle §4 : toute modification d'une grille validée alerte la régie.
        if etait_validee:
            _notifier_modification(
                grille,
                f"La grille validée {grille} a été modifiée par "
                f"{self.request.user.get_full_name()}. Action requise en régie.",
            )

    # ------------------------------------------------------ actions métier
    @action(detail=True, methods=["post"], url_path="valider")
    def valider(self, request, pk=None):
        """Passe la grille en `validee` — Directeur d'Antenne uniquement."""
        grille = self.get_object()
        if not grille.est_complete():
            vides = ", ".join(f"{d}–{f}" for d, f in grille.plages_vides())
            return Response(
                {"detail": f"Grille incomplète — créneaux vides : {vides}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        grille.statut = Grille.Statut.VALIDEE
        grille.valide_par = request.user
        grille.date_validation = timezone.now()
        grille.save()

        from alertes.models import Alerte
        from alertes.services import notifier_alerte

        alerte = Alerte.objects.create(
            grille=grille,
            type=Alerte.Type.VALIDATION,
            message=f"La grille {grille} a été validée par {request.user.get_full_name()}.",
        )
        notifier_alerte(alerte)
        return Response(GrilleSerializer(grille, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="completude")
    def completude(self, request, pk=None):
        """Retourne l'état de complétude horaire de la grille."""
        grille = self.get_object()
        vides = grille.plages_vides()
        return Response(
            {
                "complete": len(vides) == 0,
                "creneaux_vides": [{"debut": d, "fin": f} for d, f in vides],
            }
        )

    @action(detail=False, methods=["get"], url_path="en-cours")
    def en_cours(self, request):
        """
        Indicateur « en direct maintenant » — public.

        Retourne l'émission dont l'intervalle contient l'instant présent,
        sur la grille validée du jour, par chaîne.
        """
        now = timezone.now()
        chaine_slug = request.query_params.get("chaine")
        qs = Grille.objects.filter(statut=Grille.Statut.VALIDEE).select_related("chaine")
        if chaine_slug:
            qs = qs.filter(chaine__slug=chaine_slug)

        resultats = []
        for grille in qs:
            emission = (
                grille.emissions.filter(heure_debut__lte=now, heure_fin__gt=now).first()
            )
            resultats.append(
                {
                    "chaine": ChaineSerializer(grille.chaine).data,
                    "grille_id": grille.id,
                    "en_direct": EmissionSerializer(emission).data if emission else None,
                }
            )
        return Response(resultats)


class EmissionViewSet(viewsets.ModelViewSet):
    """
    CRUD des émissions.

    POST se fait via /grilles/{id}/emissions/ (voir GrilleEmissionsMixin),
    mais GET/PATCH/DELETE directs sont aussi exposés sur /emissions/{id}/.
    """

    queryset = Emission.objects.select_related("grille")
    serializer_class = EmissionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [EstDirecteurAntenne()]
        return super().get_permissions()

    def perform_update(self, serializer):
        grille = serializer.instance.grille
        etait_validee = grille.statut == Grille.Statut.VALIDEE
        emission = serializer.save()
        if etait_validee:
            _notifier_modification(
                grille,
                f"Émission « {emission.titre} » modifiée sur la grille validée {grille}. "
                "Action requise en régie.",
            )

    def perform_destroy(self, instance):
        grille = instance.grille
        etait_validee = grille.statut == Grille.Statut.VALIDEE
        titre = instance.titre
        instance.delete()
        if etait_validee:
            _notifier_modification(
                grille,
                f"Émission « {titre} » supprimée de la grille validée {grille}. "
                "Action requise en régie.",
            )


class GrilleEmissionsViewSet(viewsets.ModelViewSet):
    """Émissions imbriquées sous une grille : /grilles/{grille_id}/emissions/."""

    serializer_class = EmissionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [EstDirecteurAntenne()]
        return super().get_permissions()

    def get_queryset(self):
        return Emission.objects.filter(grille_id=self.kwargs["grille_id"])

    def perform_create(self, serializer):
        grille = Grille.objects.get(pk=self.kwargs["grille_id"])
        emission = serializer.save(grille=grille)
        if grille.statut == Grille.Statut.VALIDEE:
            _notifier_modification(
                grille,
                f"Émission « {emission.titre} » ajoutée à la grille validée {grille}.",
            )

"""Serializers DRF — chaînes, grilles (émissions imbriquées), émissions."""
from rest_framework import serializers

from .models import Chaine, Emission, Grille


class ChaineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chaine
        fields = ["id", "nom", "slug", "type", "logo", "actif"]


class EmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Emission
        fields = [
            "id",
            "grille",
            "titre",
            "genre",
            "description",
            "heure_debut",
            "heure_fin",
            "image_affiche",
            "fiabilite",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        """Remonte la validation applicative du modèle (anti-chevauchement)."""
        instance = Emission(
            **{**attrs, "grille_id": attrs.get("grille_id") or getattr(self.instance, "grille_id", None)}
        )
        if self.instance:
            instance.pk = self.instance.pk
        instance.clean()
        return attrs


class GrilleSerializer(serializers.ModelSerializer):
    """Grille détaillée : chaîne imbriquée + émissions + complétude."""

    chaine = ChaineSerializer(read_only=True)
    chaine_nom = serializers.CharField(source="chaine.nom", read_only=True)
    emissions = EmissionSerializer(many=True, read_only=True)
    est_complete = serializers.BooleanField(read_only=True)

    class Meta:
        model = Grille
        fields = [
            "id",
            "chaine",
            "chaine_nom",
            "date_debut",
            "date_fin",
            "statut",
            "date_creation",
            "date_validation",
            "cree_par",
            "valide_par",
            "emissions",
            "est_complete",
        ]
        read_only_fields = ["date_creation", "date_validation", "valide_par"]

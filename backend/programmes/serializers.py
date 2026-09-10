from rest_framework import serializers

from .models import Chaine, Emission, JournalVmix


class ChaineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chaine
        fields = ["id", "nom", "accent", "ordre"]


class EmissionSerializer(serializers.ModelSerializer):
    # Contrat frontend : heures au format "HH:MM", jour "YYYY-MM-DD"
    debut = serializers.TimeField(format="%H:%M", input_formats=["%H:%M", "%H:%M:%S"])
    fin = serializers.TimeField(format="%H:%M", input_formats=["%H:%M", "%H:%M:%S"])

    class Meta:
        model = Emission
        fields = [
            "id",
            "titre",
            "chaine",
            "jour",
            "debut",
            "fin",
            "description",
            "statut",
            "type_diffusion",
            "categorie",
            "commentaire_rejet",
            "updated_at",
        ]
        read_only_fields = ["statut", "commentaire_rejet", "updated_at"]

    def validate(self, attrs):
        from datetime import time

        debut = attrs.get("debut") or (self.instance.debut if self.instance else None)
        fin = attrs.get("fin") or (self.instance.fin if self.instance else None)
        if debut and fin:
            fin_m = fin.hour * 60 + fin.minute
            if fin_m != 0 and fin_m <= debut.hour * 60 + debut.minute:
                raise serializers.ValidationError({"fin": "La fin doit être après le début."})

        # Détection de conflit horaire (même chaîne, même jour, chevauchement)
        chaine = attrs.get("chaine") or (self.instance.chaine if self.instance else None)
        jour = attrs.get("jour") or (self.instance.jour if self.instance else None)
        if chaine and jour and debut and fin:
            candidate = Emission(chaine=chaine, jour=jour, debut=debut, fin=fin)
            qs = Emission.objects.filter(chaine=chaine, jour=jour).exclude(
                id=self.instance.pk if self.instance else None
            )
            for autre in qs:
                if candidate.chevauche(autre):
                    raise serializers.ValidationError(
                        {
                            "debut": (
                                f"Conflit horaire avec « {autre.titre} » "
                                f"({autre.debut:%H:%M} – {autre.fin:%H:%M})."
                            )
                        }
                    )
        return attrs


class JournalVmixSerializer(serializers.ModelSerializer):
    heure = serializers.DateTimeField(format="%H:%M:%S")

    class Meta:
        model = JournalVmix
        fields = ["id", "heure", "action", "element", "succes"]

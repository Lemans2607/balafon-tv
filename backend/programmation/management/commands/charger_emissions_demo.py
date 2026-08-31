"""
Charge les vraies émissions de Balafon TV dans une grille hebdomadaire.

    python manage.py charger_emissions_demo
    python manage.py charger_emissions_demo --fichier data/autre.json

Deux formats de fichier sont acceptés :
  1. Liste plate (format du contrat) :
     [{"titre", "genre", "description", "image_affiche",
       "heure_debut" (ISO), "heure_fin" (ISO), "fiabilite"?}, ...]
  2. Catalogue hebdomadaire (emissions_reelles_balafon_tv.json) :
     {"catalogue_emissions_balafon_tv": [{"titre", "genre", "jours",
       "heure_debut" "HH:MM", "heure_fin"?, "fiabilite"}], ...}
     → développé en occurrences ISO sur la semaine en cours.

Idempotent (update_or_create) : relançable sans doublons.
"""
import json
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

DOUALA = ZoneInfo("Africa/Douala")

DECALAGE_DEPUIS_LUNDI = {
    "lundi": 0, "mardi": 1, "mercredi": 2, "jeudi": 3,
    "vendredi": 4, "samedi": 5, "dimanche": 6,
}

# Correspondance genres du catalogue → choix du modèle Emission.Genre.
GENRE_MAPPING = {
    "infotainment": "info",
    "actualite": "info",
    "talkshow": "talk",
    "talk": "talk",
    "magazine": "magazine",
    "musique": "musique",
    "sport": "sport",
    "telerealite": "divertissement",
    "mag-promo": "magazine",
    "serie": "serie",
    "info": "info",
    "divertissement": "divertissement",
    "culture": "culture",
    "religion": "religion",
    "jeunesse": "jeunesse",
    "autre": "autre",
}

DUREE_PAR_GENRE_MINUTES = {
    "infotainment": 120, "talkshow": 90, "magazine": 60, "talk": 90,
    "musique": 60, "actualite": 30, "sport": 30, "telerealite": 60,
    "mag-promo": 30, "serie": 60,
}


class Command(BaseCommand):
    help = "Charge les vraies émissions de Balafon TV dans une grille hebdomadaire validée."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fichier",
            default="data/emissions_reelles_balafon_tv.json",
            help="Chemin du fichier JSON (relatif au dossier backend/).",
        )

    def handle(self, *args, **options):
        from programmation.models import Chaine, Emission, Grille

        chemin = Path(settings.BASE_DIR) / options["fichier"]
        if not chemin.exists():
            raise CommandError(
                f"Fichier introuvable : {chemin}. "
                "Vérifiez le chemin ou passez --fichier <chemin>."
            )
        data = json.loads(chemin.read_text(encoding="utf-8"))

        # ------------------------------------------------------ Normalisation
        if isinstance(data, dict) and "catalogue_emissions_balafon_tv" in data:
            emissions = self._depuis_catalogue(data["catalogue_emissions_balafon_tv"])
        elif isinstance(data, list):
            emissions = self._depuis_liste(data)
        else:
            raise CommandError(
                "Format JSON non reconnu : attendu une liste d'émissions "
                "ou un objet {\"catalogue_emissions_balafon_tv\": [...]}."
            )

        # ------------------------------------------------------------ Chaîne
        chaine, _ = Chaine.objects.get_or_create(
            slug="balafon-tv",
            defaults={"nom": "Balafon TV", "type": Chaine.Type.TV},
        )

        # ------------------------------------------------------------- Grille
        aujourdhui = timezone.localdate()
        lundi = aujourdhui - timedelta(days=aujourdhui.weekday())
        dimanche = lundi + timedelta(days=6)

        createur = self._premier_utilisateur()
        grille, creee = Grille.objects.get_or_create(
            chaine=chaine,
            date_debut=lundi,
            date_fin=dimanche,
            defaults={
                "statut": Grille.Statut.VALIDEE,
                **({"cree_par": createur} if createur else {}),
            },
        )
        self.stdout.write(
            f"Grille {'créée' if creee else 'existante'} : {lundi} → {dimanche}"
        )

        # ---------------------------------------------------------- Émissions
        nb = 0
        for e in emissions:
            _, cree = Emission.objects.update_or_create(
                grille=grille,
                titre=e["titre"],
                heure_debut=e["heure_debut"],
                defaults={
                    "heure_fin": e["heure_fin"],
                    "genre": e["genre"],
                    "description": e.get("description", ""),
                    "image_affiche": e.get("image_affiche") or "",
                    "fiabilite": e.get("fiabilite", "estime"),
                },
            )
            nb += int(cree)

        self.stdout.write(
            self.style.SUCCESS(
                f"Terminé : {nb} émission(s) chargée(s) "
                f"({len(emissions) - nb} déjà présente(s))."
            )
        )

    # ---------------------------------------------------------------- Helpers
    @staticmethod
    def _depuis_liste(items: list) -> list:
        """Format contrat : liste plate avec horaires ISO."""
        emissions = []
        for item in items:
            emissions.append(
                {
                    "titre": item["titre"],
                    "genre": GENRE_MAPPING.get(item.get("genre", "autre"), "autre"),
                    "description": item.get("description", ""),
                    "image_affiche": item.get("image_affiche"),
                    "heure_debut": item["heure_debut"],
                    "heure_fin": item["heure_fin"],
                    "fiabilite": item.get("fiabilite", "estime"),
                }
            )
        return emissions

    @staticmethod
    def _depuis_catalogue(catalogue: list) -> list:
        """Catalogue hebdomadaire (jours + HH:MM) → occurrences ISO de la semaine en cours."""
        aujourdhui = timezone.localdate()
        lundi = aujourdhui - timedelta(days=aujourdhui.weekday())
        emissions = []

        for item in catalogue:
            for jour in item.get("jours", []):
                if jour not in DECALAGE_DEPUIS_LUNDI:
                    continue
                date_jour = lundi + timedelta(days=DECALAGE_DEPUIS_LUNDI[jour])

                h, m = map(int, item["heure_debut"].split(":"))
                debut = datetime.combine(date_jour, datetime.min.time().replace(hour=h, minute=m), tzinfo=DOUALA)

                if item.get("heure_fin"):
                    hf, mf = map(int, item["heure_fin"].split(":"))
                    fin = datetime.combine(date_jour, datetime.min.time().replace(hour=hf, minute=mf), tzinfo=DOUALA)
                else:
                    duree = DUREE_PAR_GENRE_MINUTES.get(item.get("genre", ""), 60)
                    fin = debut + timedelta(minutes=duree)

                emissions.append(
                    {
                        "titre": item["titre"],
                        "genre": GENRE_MAPPING.get(item.get("genre", "autre"), "autre"),
                        "description": item.get("description", ""),
                        "image_affiche": item.get("image_affiche"),
                        "heure_debut": debut.isoformat(),
                        "heure_fin": fin.isoformat(),
                        "fiabilite": item.get("fiabilite", "estime"),
                    }
                )
        return emissions

    @staticmethod
    def _premier_utilisateur():
        try:
            from comptes.models import Utilisateur

            return Utilisateur.objects.order_by("id").first()
        except Exception:  # noqa: BLE001
            return None

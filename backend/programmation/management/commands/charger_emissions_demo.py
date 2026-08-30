"""
Charge les VRAIES émissions de Balafon TV (catalogue balafon.media / Le Jour)
depuis backend/data/emissions_reelles_balafon_tv.json (Phase 2bis du guide).

    python manage.py charger_emissions_demo

Crée : la chaîne balafon-tv, une grille « semaine en cours » validée,
et une émission par occurrence hebdomadaire (jours × horaires du catalogue),
fuseau Africa/Douala.
"""
import json
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

DOUALA = ZoneInfo("Africa/Douala")

DECALAGE_DEPUIS_LUNDI = {
    "lundi": 0,
    "mardi": 1,
    "mercredi": 2,
    "jeudi": 3,
    "vendredi": 4,
    "samedi": 5,
    "dimanche": 6,
}

DUREE_PAR_GENRE_MINUTES = {
    "infotainment": 120,
    "talkshow": 90,
    "magazine": 60,
    "talk": 90,
    "musique": 60,
    "actualite": 30,
    "sport": 30,
    "telerealite": 60,
    "mag-promo": 30,
    "serie": 60,
}


class Command(BaseCommand):
    help = "Charge les vraies émissions de Balafon TV depuis le catalogue JSON."

    def handle(self, *args, **options):
        from programmation.models import Chaine, Emission, Grille

        chemin = Path(settings.BASE_DIR) / "data" / "emissions_reelles_balafon_tv.json"
        if not chemin.exists():
            raise CommandError(
                f"Fichier introuvable : {chemin}. "
                "Copiez backend/data/ à la racine du projet Django."
            )
        data = json.loads(chemin.read_text(encoding="utf-8"))

        # 1. Chaînes (seul balafon-tv porte une grille — pas de radio)
        for ch in data.get("chaines", []):
            Chaine.objects.get_or_create(
                slug=ch["slug"], defaults={"nom": ch["nom"], "type": ch.get("type", "tv")}
            )
        chaine_tv = Chaine.objects.get(slug="balafon-tv")

        # 2. Lundi de la semaine en cours (fuseau Douala)
        aujourd_hui = datetime.now(DOUALA)
        lundi = (aujourd_hui - timedelta(days=aujourd_hui.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        createur = self._premier_utilisateur()
        grille, creee = Grille.objects.get_or_create(
            chaine=chaine_tv,
            date_debut=lundi.date(),
            defaults={
                "date_fin": (lundi + timedelta(days=6)).date(),
                "statut": "validee",
                **({"cree_par": createur} if createur else {}),
            },
        )
        self.stdout.write(
            f"Grille {'créée' if creee else 'existante'} : {grille.date_debut} → {grille.date_fin}"
        )

        # 3. Émissions — une occurrence par jour déclaré dans le catalogue
        nb_creees = 0
        for emission in data.get("catalogue_emissions_balafon_tv", []):
            for jour in emission.get("jours", []):
                if jour not in DECALAGE_DEPUIS_LUNDI:
                    self.stdout.write(self.style.WARNING(f"Jour inconnu ignoré : {jour}"))
                    continue
                date_jour = lundi + timedelta(days=DECALAGE_DEPUIS_LUNDI[jour])

                h, m = map(int, emission["heure_debut"].split(":"))
                heure_debut = date_jour.replace(hour=h, minute=m)

                if emission.get("heure_fin"):
                    hf, mf = map(int, emission["heure_fin"].split(":"))
                    heure_fin = date_jour.replace(hour=hf, minute=mf)
                else:
                    duree = DUREE_PAR_GENRE_MINUTES.get(emission.get("genre", ""), 60)
                    heure_fin = heure_debut + timedelta(minutes=duree)

                _, cree = Emission.objects.get_or_create(
                    grille=grille,
                    titre=emission["titre"],
                    heure_debut=heure_debut,
                    defaults={
                        "heure_fin": heure_fin,
                        "genre": emission.get("genre", "magazine"),
                        "description": emission.get("description", ""),
                    },
                )
                nb_creees += int(cree)

        self.stdout.write(
            self.style.SUCCESS(
                f"Terminé : {nb_creees} émission(s) créée(s) pour la semaine du {lundi.date()}."
            )
        )

    @staticmethod
    def _premier_utilisateur():
        try:
            from comptes.models import Utilisateur

            return Utilisateur.objects.order_by("id").first()
        except Exception:  # noqa: BLE001
            return None

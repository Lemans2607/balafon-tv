"""
Seed PostgreSQL — à exécuter après `python manage.py migrate` :

    python seed.py

Crée les comptes de démonstration (mot de passe : balafon237), les chaînes et
une semaine type de programmes, alignée sur le contrat du frontend.
"""
import os
from datetime import date, time, timedelta

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import Utilisateur  # noqa: E402
from programmes.models import Chaine, Emission, JournalVmix  # noqa: E402

MOT_DE_PASSE = "balafon237"

COMPTES = [
    ("admin@balafon.cm", "Sylvie Ekotto", Utilisateur.Role.ADMIN, True),
    ("direction@balafon.cm", "Martin Njoya", Utilisateur.Role.DIRECTEUR, False),
    ("regie@balafon.cm", "Josué Talla", Utilisateur.Role.REGIE, False),
]


def lundi_courant() -> date:
    today = date.today()
    return today - timedelta(days=today.weekday())


def main():
    for email, nom, role, staff in COMPTES:
        user, created = Utilisateur.objects.get_or_create(
            email=email, defaults={"nom": nom, "role": role, "username": email, "is_staff": staff}
        )
        if created:
            user.set_password(MOT_DE_PASSE)
            user.save()
        print(f"{'+' if created else '='} {email} ({role})")

    chaines = {}
    for nom, accent, ordre in [
        ("Balafon TV", "#a43700", 1),
        ("Balafon Info", "#005faf", 2),
        ("Balafon Sport", "#2e7d32", 3),
    ]:
        c, _ = Chaine.objects.get_or_create(nom=nom, defaults={"accent": accent, "ordre": ordre})
        chaines[nom] = c
        print(f"• chaîne {nom}")

    lundi = lundi_courant()
    jours = [lundi + timedelta(days=i) for i in range(7)]
    SEM, WKD, TOUS = range(5), (5, 6), range(7)

    def h(s: str) -> time:
        hh, mm = s.split(":")
        return time(int(hh), int(mm))

    def ajouter(nom_chaine, idx_jours, debut, fin, titre, categorie, type_diff, statut=Emission.Statut.VALIDE, rejet=""):
        for i in idx_jours:
            Emission.objects.get_or_create(
                chaine=chaines[nom_chaine],
                jour=jours[i],
                debut=h(debut),
                defaults=dict(
                    titre=titre,
                    fin=h(fin),
                    categorie=categorie,
                    type_diffusion=type_diff,
                    statut=statut,
                    commentaire_rejet=rejet,
                    description=f"{titre} — programme de {chaines[nom_chaine].nom}.",
                ),
            )

    C, D, R = Emission.Categorie, Emission.TypeDiffusion, Emission.Statut

    # ——— Semaine type (version compacte — complétez selon votre grille réelle) ———
    for i in TOUS:
        ajouter("Balafon TV", [i], "00:00", "06:00", "La Nuit Balafon — Rediffusions", C.DIVERTISSEMENT, R.REDIFFUSION)
        ajouter("Balafon TV", [i], "12:00", "12:45", "Journal de la Mi-Journée", C.INFORMATION, D.DIRECT)
        ajouter("Balafon TV", [i], "19:30", "20:15", "Journal Télévisé — 19h30", C.INFORMATION, D.DIRECT)
        ajouter("Balafon TV", [i], "22:30", "23:00", "Journal de la Nuit", C.INFORMATION, D.DIRECT)
        ajouter("Balafon Info", [i], "00:00", "06:00", "Boucle Info Nuit", C.INFORMATION, R.REDIFFUSION)
        ajouter("Balafon Info", [i], "06:00", "10:00", "La Grande Matinale Info", C.INFORMATION, D.DIRECT)
        ajouter("Balafon Info", [i], "20:00", "21:00", "Le Journal — Édition 20h", C.INFORMATION, D.DIRECT)
        ajouter("Balafon Sport", [i], "00:00", "06:00", "La Nuit du Sport — Rediffusions", C.SPORT, R.REDIFFUSION)
        ajouter("Balafon Sport", [i], "12:00", "13:00", "Sport Midi", C.SPORT, D.DIRECT)
        ajouter("Balafon Sport", [i], "17:00", "18:30", "Plateau Foot", C.SPORT, D.DIRECT)

    ajouter("Balafon TV", SEM, "06:00", "09:00", "Matinale Balafon", C.INFORMATION, D.DIRECT)
    ajouter("Balafon TV", SEM, "17:00", "18:00", "Ngondo, Racines & Traditions", C.CULTURE, D.ENREGISTRE)
    ajouter("Balafon TV", SEM, "20:30", "21:30", "Grand Débat Citoyen", C.INFORMATION, D.DIRECT)
    ajouter("Balafon TV", WKD, "15:00", "17:00", "Ligue Elite One — Direct Stade", C.SPORT, D.DIRECT)
    ajouter("Balafon TV", [6], "20:30", "22:30", "Ciné Dimanche : « La Plantation »", C.FILM, D.ENREGISTRE)
    ajouter("Balafon Sport", WKD, "15:00", "17:00", "Ligue Elite One — Multistade", C.SPORT, D.DIRECT)
    ajouter("Balafon Sport", [2, 5], "20:00", "22:00", "Soirée Coupes d'Europe", C.SPORT, D.DIRECT)

    # ——— Workflow de démonstration ———
    dimanche, samedi = jours[6], jours[5]
    Emission.objects.get_or_create(
        chaine=chaines["Balafon TV"], jour=dimanche, debut=h("17:00"),
        defaults=dict(titre="Nuit du Bikutsi — Session Live", fin=h("18:00"), categorie=C.CULTURE,
                      type_diffusion=D.DIRECT, statut=R.BROUILLON,
                      description="Une heure de bikutsi en direct depuis la case des arts."),
    )
    Emission.objects.get_or_create(
        chaine=chaines["Balafon TV"], jour=dimanche, debut=h("19:00"),
        defaults=dict(titre="Flash Spécial — Tirage au sort CAN", fin=h("19:30"), categorie=C.SPORT,
                      type_diffusion=D.ENREGISTRE, statut=R.EN_ATTENTE,
                      description="Édition spéciale consacrée au tirage de la CAN."),
    )
    Emission.objects.get_or_create(
        chaine=chaines["Balafon Info"], jour=samedi, debut=h("21:00"),
        defaults=dict(titre="Nuit Électorale — Édition Spéciale", fin=h("23:00"), categorie=C.INFORMATION,
                      type_diffusion=D.DIRECT, statut=R.EN_ATTENTE,
                      description="Soirée électorale en direct depuis le plateau central."),
    )
    Emission.objects.get_or_create(
        chaine=chaines["Balafon Sport"], jour=jours[4], debut=h("22:00"),
        defaults=dict(titre="La Nuit du Sport — Le Grand Débrief", fin=h("23:30"), categorie=C.SPORT,
                      type_diffusion=D.ENREGISTRE, statut=R.BROUILLON,
                      commentaire_rejet="Format trop long pour la case ; proposer 45 min maximum. — Direction d'Antenne",
                      description="Le débrief complet de la journée sportive."),
    )

    if not JournalVmix.objects.exists():
        JournalVmix.objects.create(action="Connexion API", element="vMix 27.0.0.52 — localhost:8088", succes=True)

    print(f"\n✔ Seed terminé — {Emission.objects.count()} émissions en base.")


if __name__ == "__main__":
    main()

"""
Crée un compte utilisateur avec son VRAI rôle métier.

`createsuperuser` ne fixe que les droits Django admin, pas le rôle RBAC de la
plateforme — utilisez cette commande pour les comptes opérationnels :

    python manage.py creer_compte \
        --email direction@balafon.media \
        --motdepasse 'MotDePasseSolide!' \
        --prenom Martin --nom Essomba \
        --role directeur_antenne

    python manage.py creer_compte \
        --email regie@balafon.media \
        --motdepasse 'MotDePasseSolide!' \
        --prenom Rodrigue --nom Talla \
        --role diffuseur --poste 'Poste vMix 1'
"""
from django.core.management.base import BaseCommand, CommandError

from comptes.models import Utilisateur


class Command(BaseCommand):
    help = "Crée un compte (Directeur d'Antenne ou Diffuseur) avec son rôle métier."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Email professionnel (identifiant).")
        parser.add_argument("--motdepasse", required=True, help="Mot de passe initial.")
        parser.add_argument(
            "--role",
            required=True,
            choices=[c.value for c in Utilisateur.Role],
            help="Rôle métier : directeur_antenne ou diffuseur.",
        )
        parser.add_argument("--prenom", default="", help="Prénom.")
        parser.add_argument("--nom", default="", help="Nom.")
        parser.add_argument("--fonction", default="", help="Fonction (directeur).")
        parser.add_argument("--poste", default="", help="Poste en régie (diffuseur).")
        parser.add_argument(
            "--superuser",
            action="store_true",
            help="Donne aussi les droits Django admin (optionnel).",
        )

    def handle(self, *args, **options):
        email = options["email"].strip().lower()

        if Utilisateur.objects.filter(email=email).exists():
            raise CommandError(f"Un compte existe déjà pour {email}.")

        utilisateur = Utilisateur.objects.create_user(
            email=email,
            password=options["motdepasse"],
            first_name=options["prenom"],
            last_name=options["nom"],
            role=options["role"],
            fonction=options["fonction"],
            poste_regie=options["poste"],
        )
        if options["superuser"]:
            utilisateur.is_staff = True
            utilisateur.is_superuser = True
            utilisateur.save(update_fields=["is_staff", "is_superuser"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Compte créé : {email} — rôle {utilisateur.get_role_display()} "
                f"(id={utilisateur.id})."
            )
        )

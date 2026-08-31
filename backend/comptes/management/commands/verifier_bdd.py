"""
Commande de vérification de la connexion PostgreSQL (Phase 1.7 du guide).

    python manage.py verifier_bdd

Résultat attendu :
    Connexion à PostgreSQL réussie.
    Version du serveur : PostgreSQL 16.x …
    Tables présentes (N) : alerte, chaine, emission, grille, …
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    help = "Vérifie la connexion à PostgreSQL et liste les tables présentes."

    def handle(self, *args, **options):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()[0]

                cursor.execute(
                    """
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    ORDER BY table_name;
                    """
                )
                tables = [row[0] for row in cursor.fetchall()]
        except Exception as exc:  # noqa: BLE001
            raise CommandError(
                "Connexion à PostgreSQL impossible. "
                "Vérifiez `docker compose up -d` et le fichier .env. "
                f"Détail : {exc}"
            )

        self.stdout.write(self.style.SUCCESS("Connexion à PostgreSQL réussie."))
        self.stdout.write(f"Version du serveur : {version}")
        self.stdout.write(f"Tables présentes ({len(tables)}) : {', '.join(tables) or 'aucune — lancez `python manage.py migrate`'}")

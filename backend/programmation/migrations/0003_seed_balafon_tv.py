from django.db import migrations


def creer_chaine_balafon(apps, schema_editor):
    Chaine = apps.get_model("programmation", "Chaine")
    Chaine.objects.get_or_create(
        slug="balafon-tv",
        defaults={"nom": "Balafon TV", "type": "tv", "actif": True},
    )


class Migration(migrations.Migration):
    dependencies = [("programmation", "0002_remove_grille_grille_periode_valide_chaine_logo_and_more")]

    operations = [migrations.RunPython(creer_chaine_balafon, migrations.RunPython.noop)]

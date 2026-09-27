from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("programmation", "0004_emission_no_overlap_same_grille")]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveConstraint(
                    model_name="emission",
                    name="emission_no_overlap_same_grille",
                )
            ],
        )
    ]
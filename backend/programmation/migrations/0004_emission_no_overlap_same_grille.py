from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields.ranges import RangeOperators
from django.db import migrations
from django.db.models import Func, Value


def create_postgres_constraint(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    schema_editor.execute(
        "ALTER TABLE programmation_emission "
        "ADD CONSTRAINT emission_no_overlap_same_grille "
        "EXCLUDE USING gist (grille_id WITH =, "
        "tstzrange(heure_debut, heure_fin, '[)') WITH &&)"
    )


def remove_postgres_constraint(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute(
            "ALTER TABLE programmation_emission "
            "DROP CONSTRAINT IF EXISTS emission_no_overlap_same_grille"
        )


class Migration(migrations.Migration):
    dependencies = [("programmation", "0003_seed_balafon_tv")]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    create_postgres_constraint,
                    remove_postgres_constraint,
                )
            ],
            state_operations=[
                migrations.AddConstraint(
                    model_name="emission",
                    constraint=ExclusionConstraint(
                        name="emission_no_overlap_same_grille",
                        expressions=[
                            ("grille", "="),
                            (
                                Func(
                                    "heure_debut",
                                    "heure_fin",
                                    Value("[)"),
                                    function="TSTZRANGE",
                                ),
                                "&&",
                            ),
                        ],
                    ),
                )
            ],
        )
    ]
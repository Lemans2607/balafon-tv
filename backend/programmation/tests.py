from datetime import date, datetime

import pytest
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from django.db import IntegrityError, connection, models

from comptes.models import Utilisateur
from programmation.models import Chaine, Emission, Grille


pytestmark = pytest.mark.django_db


def test_authentification_par_email_sans_username():
    utilisateur = Utilisateur.objects.create_user(
        email="directeur@balafon.test",
        password="Passw0rd!2026",
        first_name="Directeur",
        last_name="Test",
        est_directeur_antenne=True,
    )

    connecte = authenticate(
        email="directeur@balafon.test",
        password="Passw0rd!2026",
    )

    assert connecte == utilisateur
    assert connecte.USERNAME_FIELD == "email"
    assert "username" not in {field.name for field in connecte._meta.fields}
    assert connecte.username is None
    assert connecte.role == "directeur_antenne"


def test_exclusion_gist_bloque_un_chevauchement_sur_la_meme_grille():
    chaine, _ = Chaine.objects.get_or_create(
        slug="balafon-tv",
        defaults={"nom": "Balafon TV", "type": Chaine.Type.TV},
    )
    grille = Grille.objects.create(
        chaine=chaine,
        date_debut=date(2026, 9, 7),
        date_fin=date(2026, 9, 7),
    )
    Emission.objects.create(
        grille=grille,
        titre="Faut Pas Zapper",
        heure_debut=datetime(2026, 9, 7, 18, 0),
        heure_fin=datetime(2026, 9, 7, 19, 30),
    )
    conflit = Emission(
        grille=grille,
        titre="Rediffusion",
        heure_debut=datetime(2026, 9, 7, 19, 0),
        heure_fin=datetime(2026, 9, 7, 20, 0),
    )

    with pytest.raises(ValidationError):
        conflit.clean()

    if connection.vendor == "postgresql":
        with pytest.raises(IntegrityError):
            models.Model.save(conflit, force_insert=True)
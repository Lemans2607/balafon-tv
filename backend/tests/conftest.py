"""
Fixtures partagées pour les tests pytest-django.

Trois profils (drapeaux du modèle Utilisateur) + chaîne et grille de démo.
"""
from datetime import date

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from comptes.models import Utilisateur
from programmation.models import Chaine, Emission, Grille


def _utilisateur(
    email: str,
    est_admin: bool = False,
    est_directeur_antenne: bool = False,
    mot_de_passe: str = "Passw0rd!2026",
) -> Utilisateur:
    return Utilisateur.objects.create_user(
        email=email,
        password=mot_de_passe,
        first_name="Test",
        last_name=email.split("@")[0].capitalize(),
        est_admin=est_admin,
        est_directeur_antenne=est_directeur_antenne,
    )


@pytest.fixture
def admin() -> Utilisateur:
    return _utilisateur("admin@balafon.test", est_admin=True)


@pytest.fixture
def directeur() -> Utilisateur:
    return _utilisateur("directeur@balafon.test", est_directeur_antenne=True)


@pytest.fixture
def diffuseur() -> Utilisateur:
    return _utilisateur("regie@balafon.test")  # aucun drapeau → diffuseur


@pytest.fixture
def chaine_tv() -> Chaine:
    return Chaine.objects.create(nom="Balafon TV", slug="balafon-tv", type=Chaine.Type.TV)


@pytest.fixture
def grille_brouillon(chaine_tv, directeur) -> Grille:
    grille = Grille.objects.create(
        chaine=chaine_tv,
        date_debut=date.today(),
        date_fin=date.today(),
        cree_par=directeur,
    )
    base = timezone.now().replace(hour=6, minute=0, second=0, microsecond=0)
    Emission.objects.create(
        grille=grille, titre="C'le Matin", genre="info",
        heure_debut=base, heure_fin=base.replace(hour=8),
    )
    Emission.objects.create(
        grille=grille, titre="Grand Plateau", genre="info",
        heure_debut=base.replace(hour=19, minute=30), heure_fin=base.replace(hour=20),
    )
    return grille


@pytest.fixture
def client_admin(admin) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=admin)
    return client


@pytest.fixture
def client_directeur(directeur) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=directeur)
    return client


@pytest.fixture
def client_diffuseur(diffuseur) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=diffuseur)
    return client


@pytest.fixture
def client_public() -> APIClient:
    return APIClient()

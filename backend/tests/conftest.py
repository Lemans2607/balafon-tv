"""
Fixtures partagées pour les tests pytest-django.

Crée les trois profils RBAC et une chaîne + grille de démonstration.
"""
from datetime import date

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from comptes.models import Utilisateur
from programmation.models import Chaine, Emission, Grille


def _utilisateur(email: str, role: str, mot_de_passe: str = "Passw0rd!2026") -> Utilisateur:
    return Utilisateur.objects.create_user(
        email=email,
        password=mot_de_passe,
        first_name="Test",
        last_name=role.capitalize(),
        role=role,
    )


@pytest.fixture
def admin() -> Utilisateur:
    return _utilisateur("admin@balafon.test", Utilisateur.Role.ADMINISTRATEUR)


@pytest.fixture
def directeur() -> Utilisateur:
    return _utilisateur("directeur@balafon.test", Utilisateur.Role.DIRECTEUR_ANTENNE)


@pytest.fixture
def diffuseur() -> Utilisateur:
    return _utilisateur("regie@balafon.test", Utilisateur.Role.DIFFUSEUR)


@pytest.fixture
def chaine_tv() -> Chaine:
    return Chaine.objects.create(nom="Balafon TV", slug="balafon-tv", type=Chaine.Type.TV)


@pytest.fixture
def grille_brouillon(chaine_tv, admin) -> Grille:
    grille = Grille.objects.create(
        chaine=chaine_tv,
        date_debut=date.today(),
        date_fin=date.today(),
        cree_par=admin,
    )
    # Deux émissions sans chevauchement.
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

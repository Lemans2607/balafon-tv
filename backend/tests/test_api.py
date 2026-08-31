"""
Tests d'intégration de l'API — BALAFON + GUIDE.

Couvre les quatre cas exigés par le cahier des charges :
    1. transition de statut de grille (brouillon → validée) ;
    2. restriction de rôle sur POST /grilles/{id}/valider/ ;
    3. déclenchement d'une alerte sur modification post-validation ;
    4. filtrage public des grilles (seules les validées sont visibles).
"""
import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from alertes.models import Alerte
from programmation.models import Emission, Grille

pytestmark = pytest.mark.django_db


# ------------------------------------------------- 1. transition de statut
def test_valider_passe_la_grille_en_validee(client_directeur, grille_brouillon):
    """Une grille complète validée passe à l'état `validee` avec trace."""
    url = reverse("grilles-valider", args=[grille_brouillon.id])
    reponse = client_directeur.post(url)

    assert reponse.status_code == status.HTTP_200_OK
    grille_brouillon.refresh_from_db()
    assert grille_brouillon.statut == Grille.Statut.VALIDEE
    assert grille_brouillon.valide_par is not None
    assert grille_brouillon.date_validation is not None


def test_valider_refuse_une_grille_incomplete(client_directeur, grille_brouillon):
    """Une grille avec des créneaux vides ne peut pas être validée."""
    # On vide la grille pour créer des trous.
    Emission.objects.filter(grille=grille_brouillon).delete()

    url = reverse("grilles-valider", args=[grille_brouillon.id])
    reponse = client_directeur.post(url)

    assert reponse.status_code == status.HTTP_400_BAD_REQUEST
    grille_brouillon.refresh_from_db()
    assert grille_brouillon.statut == Grille.Statut.BROUILLON


# ------------------------------------- 2. restriction de rôle sur valider/
def test_seul_le_directeur_peut_valider(client_diffuseur, client_public, grille_brouillon):
    """Ni le diffuseur ni le public ne peuvent valider une grille."""
    url = reverse("grilles-valider", args=[grille_brouillon.id])

    assert client_diffuseur.post(url).status_code == status.HTTP_403_FORBIDDEN
    assert client_public.post(url).status_code in (
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
    )

    grille_brouillon.refresh_from_db()
    assert grille_brouillon.statut == Grille.Statut.BROUILLON


# ------------------------- 3. alerte sur modification post-validation
def test_modifier_une_grille_validee_cree_une_alerte(client_directeur, grille_brouillon):
    """Modifier une grille déjà validée déclenche une alerte de dernière minute."""
    # Validation préalable par le directeur.
    client_directeur.post(reverse("grilles-valider", args=[grille_brouillon.id]))
    grille_brouillon.refresh_from_db()
    assert grille_brouillon.statut == Grille.Statut.VALIDEE
    assert Alerte.objects.count() == 1  # alerte de validation

    # Le directeur modifie la grille validée (PATCH) → alerte régie.
    url = reverse("grilles-detail", args=[grille_brouillon.id])
    reponse = client_directeur.patch(url, {"date_fin": grille_brouillon.date_fin}, format="json")
    assert reponse.status_code == status.HTTP_200_OK

    # Une alerte de modification dernière minute a été créée.
    alertes = Alerte.objects.filter(type=Alerte.Type.MODIFICATION)
    assert alertes.count() == 1
    assert "modifiée" in alertes.first().message


# --------------------------------------- 4. filtrage public des grilles
def test_le_public_ne_voit_que_les_grilles_validees(
    client_public, client_directeur, grille_brouillon
):
    """Sans authentification, seules les grilles validées sont retournées."""
    url = reverse("grilles-list")

    # En brouillon → invisible du public.
    assert client_public.get(url).json()["count"] == 0

    # Validation → visible.
    client_directeur.post(reverse("grilles-valider", args=[grille_brouillon.id]))
    resultat = client_public.get(url).json()
    assert resultat["count"] == 1
    assert resultat["results"][0]["statut"] == Grille.Statut.VALIDEE


# ------------------------------------------------------------- bonus métier
def test_chevauchement_demissions_est_refuse(grille_brouillon):
    """La validation applicative refuse deux émissions qui se chevauchent."""
    base = timezone.now().replace(hour=7, minute=0, second=0, microsecond=0)
    with pytest.raises(Exception):
        Emission.objects.create(
            grille=grille_brouillon, titre="Conflit", genre="autre",
            heure_debut=base, heure_fin=base.replace(hour=9),
        )


def test_en_cours_retourne_lemission_du_moment(client_public, client_directeur, grille_brouillon):
    """L'indicateur public « en direct » renvoie l'émission en cours."""
    client_directeur.post(reverse("grilles-valider", args=[grille_brouillon.id]))
    # Force une émission couvrant l'instant présent.
    now = timezone.now()
    Emission.objects.create(
        grille=grille_brouillon, titre="Direct Test", genre="info",
        heure_debut=now.replace(second=0, microsecond=0),
        heure_fin=now + timezone.timedelta(hours=1),
    )

    reponse = client_public.get(reverse("grilles-en-cours") + "?chaine=balafon-tv")
    assert reponse.status_code == status.HTTP_200_OK
    assert reponse.json()[0]["chaine"]["slug"] == "balafon-tv"

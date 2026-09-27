"""
Tests d'intégration de l'API — BALAFON + GUIDE (modèle à drapeaux).

Couvre :
    1. validation de grille (statut + valide_par + date_validation) ;
    2. restriction de rôle sur POST /grilles/{id}/valider/ ;
    3. filtrage public (seules les grilles validées demandées via ?statut=) ;
    4. anti-chevauchement refusé par l'API ;
    5. endpoint complétude.
"""
import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from programmation.models import Emission, Grille

pytestmark = pytest.mark.django_db


# ------------------------------------------------ 1. transition de statut
def test_valider_passe_la_grille_en_validee(client_directeur, grille_brouillon):
    """La validation pose statut, valide_par et date_validation."""
    url = reverse("grilles-valider", args=[grille_brouillon.id])
    reponse = client_directeur.post(url)

    assert reponse.status_code == status.HTTP_200_OK
    grille_brouillon.refresh_from_db()
    assert grille_brouillon.statut == Grille.Statut.VALIDEE
    assert grille_brouillon.valide_par is not None
    assert grille_brouillon.date_validation is not None


# ------------------------------------- 2. restriction de rôle sur valider/
def test_seul_le_directeur_peut_valider(client_admin, client_diffuseur, client_public, grille_brouillon):
    """Ni l'admin seul ni le diffuseur ni le public ne peuvent valider."""
    url = reverse("grilles-valider", args=[grille_brouillon.id])

    assert client_admin.post(url).status_code == status.HTTP_403_FORBIDDEN
    assert client_diffuseur.post(url).status_code == status.HTTP_403_FORBIDDEN
    assert client_public.post(url).status_code == status.HTTP_403_FORBIDDEN

    grille_brouillon.refresh_from_db()
    assert grille_brouillon.statut == Grille.Statut.BROUILLON


# ------------------------------------------- 3. filtrage par statut & chaîne
def test_filtre_statut_validee(client_public, client_directeur, grille_brouillon):
    """?statut=validee ne renvoie la grille qu'après validation."""
    url = reverse("grilles-list") + "?statut=validee&chaine=balafon-tv"

    assert len(client_public.get(url).json()) == 0

    client_directeur.post(reverse("grilles-valider", args=[grille_brouillon.id]))
    resultat = client_public.get(url).json()
    assert len(resultat) == 1
    assert resultat[0]["statut"] == Grille.Statut.VALIDEE
    assert resultat[0]["chaine_nom"] == "Balafon TV"
    assert len(resultat[0]["emissions"]) == 2


# ----------------------------------------------- 4. anti-chevauchement API
def test_chevauchement_refuse_par_l_api(client_directeur, grille_brouillon):
    """Un POST d'émission qui chevauche renvoie 400."""
    base = timezone.now().replace(hour=7, minute=0, second=0, microsecond=0)
    url = reverse("grille-emissions-list", args=[grille_brouillon.id])
    reponse = client_directeur.post(
        url,
        {
            "titre": "Conflit",
            "genre": "autre",
            "heure_debut": base.isoformat(),
            "heure_fin": base.replace(hour=9).isoformat(),
        },
        format="json",
    )
    assert reponse.status_code == status.HTTP_400_BAD_REQUEST
    assert Emission.objects.filter(grille=grille_brouillon).count() == 2


# ------------------------------------------------------- 5. complétude
def test_completude_signale_les_trous(client_directeur, grille_brouillon):
    """La grille de démo (08:00 → 19:30 vide) n'est pas complète."""
    url = reverse("grilles-completude", args=[grille_brouillon.id])
    reponse = client_directeur.get(url)

    assert reponse.status_code == status.HTTP_200_OK
    corps = reponse.json()
    assert corps["complete"] is False
    assert len(corps["plages_vides"]) >= 2  # 06→08h déjà couvert… au moins le soir

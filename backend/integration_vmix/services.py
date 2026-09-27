"""
Couche d'adaptation vMix — isolée du reste du code métier.

L'API HTTP native de vMix répond en XML sur des paramètres de requête
(`http://<ip>:8088/api?Function=...`), pas en JSON REST pur : cette classe
encapsule le vrai format d'échange. `ClientVmixSimule` permet de développer
tant que le poste vMix de la régie n'est pas joignable (VMIX_MODE=simule).
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class ClientVmix:
    """Client réel — dialogue HTTP avec le poste vMix de la régie."""

    def __init__(self, base_url: str, timeout: int = 5):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _call(self, function: str, **params) -> requests.Response:
        return requests.get(
            self.base_url,
            params={"Function": function, **params},
            timeout=self.timeout,
        )

    def verifier_etat(self) -> dict:
        """Health-check du poste vMix (retourne un résumé d'état)."""
        try:
            reponse = self._call("API")
            return {"en_ligne": reponse.ok, "code": reponse.status_code}
        except requests.RequestException as exc:
            logger.warning("vMix injoignable : %s", exc)
            return {"en_ligne": False, "erreur": str(exc)}

    def pousser_grille(self, grille) -> dict:
        """
        Envoie la playlist de la grille à vMix.

        En pratique on alimente une playlist vMix (AddInputToPlaylist /
        PlaylistAdd) ; ici on résume l'intention d'appel.
        """
        try:
            reponse = self._call(
                "PlaylistAdd",
                Value="balafon_programmes.m3u",
            )
            return {"succes": reponse.ok, "code": reponse.status_code}
        except requests.RequestException as exc:
            logger.error("Échec push vMix : %s", exc)
            return {"succes": False, "erreur": str(exc)}


class ClientVmixSimule(ClientVmix):
    """
    Client simulé — ne fait aucune requête réseau.

    Utilisé en développement et pour la soutenance (VMIX_MODE=simule).
    Reproduit une réponse plausible pour que tout le flux soit démontrable.
    """

    def verifier_etat(self) -> dict:
        return {"en_ligne": True, "code": 200, "mode": "simule"}

    def pousser_grille(self, grille) -> dict:
        emissions = list(grille.emissions.order_by("heure_debut"))
        return {
            "succes": True,
            "mode": "simule",
            "playlist": "balafon_programmes.m3u",
            "entrees": len(emissions),
            "resume": [
                {"titre": e.titre, "debut": e.heure_debut.strftime("%H:%M"),
                 "fin": e.heure_fin.strftime("%H:%M")}
                for e in emissions
            ],
        }


def get_client() -> ClientVmix:
    """Retourne le client selon VMIX_MODE (simule par défaut)."""
    if getattr(settings, "VMIX_MODE", "simule") == "reel":
        return ClientVmix(settings.VMIX_API_URL, settings.VMIX_API_TIMEOUT)
    return ClientVmixSimule(settings.VMIX_API_URL, settings.VMIX_API_TIMEOUT)

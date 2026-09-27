"""
Service de notification temps réel — appelé depuis la couche métier,
jamais depuis les vues (cf. cahier des charges §7).
"""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def notifier_alerte(alerte) -> None:
    """
    Pousse une alerte au groupe WebSocket de sa chaîne.

    Groupe : `alertes_chaine_<id_chaine>` — chaque diffuseur ne s'abonne
    qu'aux chaînes qu'il couvre.

    CORRECTIF : `get_channel_layer()` renvoie un objet configuré même si
    Redis lui-même est injoignable — la connexion n'est tentée que plus
    tard, au moment de `group_send()`. Sans ce try/except, la moindre
    opération métier légitime (créer une émission dans une grille déjà
    validée, la valider) plantait dès que Redis n'était pas démarré —
    ce qui, sur un poste de développement sans Docker, est le cas normal.
    Une alerte non diffuée en direct est acceptable (elle reste consultable
    via l'API REST du modèle Alerte) ; un enregistrement métier qui échoue
    à cause d'un service de notification optionnel ne l'est pas.
    """
    if alerte.grille is None:
        return

    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:  # pas de channel layer configuré (tests)
            return

        payload = {
            "type": "alerte.message",
            "alerte": {
                "id": alerte.id,
                "type": alerte.type,
                "type_display": alerte.get_type_display(),
                "message": alerte.message,
                "date_envoi": alerte.date_envoi.isoformat(),
                "grille_id": alerte.grille_id,
                "chaine_id": alerte.grille.chaine_id,
                "chaine_slug": alerte.grille.chaine.slug,
            },
        }
        async_to_sync(channel_layer.group_send)(
            f"alertes_chaine_{alerte.grille.chaine_id}", payload
        )
    except Exception as exc:  # noqa: BLE001 — Redis absent, panne réseau, etc.
        logger.warning("Diffusion temps réel de l'alerte %s impossible : %s", alerte.id, exc)

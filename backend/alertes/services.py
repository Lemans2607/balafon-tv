"""
Service de notification temps réel — appelé depuis la couche métier,
jamais depuis les vues (cf. cahier des charges §7).
"""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def notifier_alerte(alerte) -> None:
    """
    Pousse une alerte au groupe WebSocket de sa chaîne.

    Groupe : `alertes_chaine_<id_chaine>` — chaque diffuseur ne s'abonne
    qu'aux chaînes qu'il couvre.
    """
    if alerte.grille is None:
        return

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

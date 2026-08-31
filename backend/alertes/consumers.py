"""
Consumer WebSocket — diffusion des alertes vers la régie.

Connexion : ws://<host>/ws/alertes/?chaine=<slug>&token=<jwt>
Le diffuseur s'abonne au groupe `alertes_chaine_<id>` de sa chaîne.
"""
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async


class AlerteConsumer(AsyncJsonWebsocketConsumer):
    """Relaye les alertes d'une chaîne au(x) diffuseur(s) connecté(s)."""

    async def connect(self):
        params = parse_qs(self.scope.get("query_string", b"").decode())
        chaine_slug = (params.get("chaine", ["balafon-tv"])[0]).strip()

        # Authentification optionnelle par JWT (présent en query string).
        token = params.get("token", [None])[0]
        if token and not await self._token_valide(token):
            await self.close(code=4401)
            return

        self.groupe = await self._resoudre_groupe(chaine_slug)
        if self.groupe is None:
            await self.close(code=4404)
            return

        await self.channel_layer.group_add(self.groupe, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "groupe") and self.groupe:
            await self.channel_layer.group_discard(self.groupe, self.channel_name)

    async def alerte_message(self, event):
        """Handler appelé par `group_send(type='alerte.message')`."""
        await self.send_json({"type": "alerte", "payload": event["alerte"]})

    # ------------------------------------------------------------- helpers
    @database_sync_to_async
    def _resoudre_groupe(self, chaine_slug: str):
        from programmation.models import Chaine

        chaine = Chaine.objects.filter(slug=chaine_slug, actif=True).first()
        return f"alertes_chaine_{chaine.id}" if chaine else None

    @database_sync_to_async
    def _token_valide(self, token: str) -> bool:
        from rest_framework_simplejwt.tokens import UntypedToken
        from rest_framework_simplejwt.exceptions import TokenError

        try:
            UntypedToken(token)
            return True
        except TokenError:
            return False

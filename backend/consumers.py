"""
Consumer WebSocket — groupe « grille ».

Le frontend s'abonne sur ws://<host>/ws/grille/ et reçoit les messages
{ type: "grille.mise_a_jour" | "grille.validee", emission: {...} }
poussés par les vues REST à chaque mutation du workflow.
"""
from channels.generic.websocket import AsyncJsonWebsocketConsumer

GROUPE = "grille"


class GrilleConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add(GROUPE, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(GROUPE, self.channel_name)

    # Événements émis côté vues (group_send)
    async def grille_mise_a_jour(self, event):
        await self.send_json({"type": "grille.mise_a_jour", "emission": event["emission"]})

    async def grille_validee(self, event):
        await self.send_json({"type": "grille.validee", "emission": event["emission"]})

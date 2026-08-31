"""
Entrée ASGI — HTTP (Django) + WebSocket (Channels).

Le middleware JWT est appliqué aux sockets pour authentifier les diffuseurs
avant leur abonnement au groupe d'alertes de leur chaîne.
"""
import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "balafon_guide.settings")

django_asgi_app = get_asgi_application()

# Import après get_asgi_application pour éviter les imports circulaires.
from alertes.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            AuthMiddlewareStack(URLRouter(websocket_urlpatterns))
        ),
    }
)

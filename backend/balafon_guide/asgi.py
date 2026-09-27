"""
Entrée ASGI — HTTP + WebSocket (Django Channels) pour les alertes régie.

L'app `alertes` (modèle, service `notifier_alerte`, consumer, routing)
existait déjà dans le dépôt, mais ce fichier ne faisait que servir du HTTP :
sans ProtocolTypeRouter, /ws/alertes/ n'était routable nulle part, même si
CHANNEL_LAYERS et le consumer étaient corrects. Voir MODIFICATIONS.md.

Lancer en ASGI pour que les WebSockets fonctionnent :
    daphne -b 0.0.0.0 -p 8000 balafon_guide.asgi:application
`manage.py runserver` retombe sur ce même fichier et fait aussi l'affaire
en développement dès lors que ASGI_APPLICATION est défini dans settings.py.
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "balafon_guide.settings")

django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack  # noqa: E402
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from alertes.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)

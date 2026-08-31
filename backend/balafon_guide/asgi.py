"""
Entrée ASGI — phase 1 : HTTP uniquement.

En phase 2 (Django Channels + Redis), ce fichier recevra le
ProtocolTypeRouter et le routing WebSocket des alertes.
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "balafon_guide.settings")

application = get_asgi_application()

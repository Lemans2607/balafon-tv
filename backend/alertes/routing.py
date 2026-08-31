"""Routing WebSocket — /ws/alertes/."""
from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r"^ws/alertes/$", consumers.AlerteConsumer.as_asgi()),
]

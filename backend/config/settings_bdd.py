"""
BALAFON + GUIDE — extraits de configuration Django à fusionner dans
balafon_guide/settings.py (Phase 1.5 du guide d'intégration).

Sections : dotenv, DATABASES (PostgreSQL), CHANNEL_LAYERS (Redis),
REST_FRAMEWORK + JWT, CORS, ASGI, Swagger.
"""
from pathlib import Path

from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-a-changer")
DEBUG = os.getenv("DEBUG", "True") == "True"

INSTALLED_APPS = [
    # … apps Django par défaut …
    "daphne",  # AVANT django.contrib.staticfiles pour l'ASGI
    "rest_framework",
    "corsheaders",
    "channels",
    "drf_spectacular",
    # Apps métier
    "comptes",
    "programmation",
    "alertes",
    "integration_vmix",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # en tout premier
    # … reste du middleware …
]

# ---------------------------------------------------------------- PostgreSQL
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "balafon_guide"),
        "USER": os.getenv("DB_USER", "balafon_admin"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
        "OPTIONS": {"connect_timeout": 5},
    }
}

# ------------------------------------------------- WebSocket (Django Channels)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(os.getenv("REDIS_HOST", "localhost"), int(os.getenv("REDIS_PORT", "6379")))],
        },
    }
}
ASGI_APPLICATION = "balafon_guide.asgi.application"

# ------------------------------------------------------------------ DRF + JWT
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticatedOrReadOnly",),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}

from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),   # journée d'antenne
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "BALAFON + GUIDE API",
    "DESCRIPTION": "EPG Balafon TV — grilles, émissions, alertes, synchro vMix.",
    "VERSION": "1.0.0",
}

# ------------------------------------------------------------------------ CORS
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]

# --------------------------------------------------------------------- Divers
TIME_ZONE = os.getenv("TIME_ZONE", "Africa/Douala")
USE_TZ = True
LANGUAGE_CODE = "fr-fr"

# URLs Swagger : /api/schema/swagger/
#   urlpatterns += [
#       path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
#       path("api/schema/swagger/", SpectacularSwaggerView.as_view(url_name="schema")),
#   ]

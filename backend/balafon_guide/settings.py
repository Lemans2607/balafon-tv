"""
Django settings — BALAFON + GUIDE (EPG Balafon TV).

Phase 1 : REST (DRF + SimpleJWT) + PostgreSQL.
Phase 2 (non active ici) : Django Channels + Redis pour les alertes temps réel.

Toutes les valeurs sensibles proviennent de variables d'environnement (.env).
"""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-change-moi-avant-production")
DEBUG = os.getenv("DEBUG", "True") == "True"
ALLOWED_HOSTS = [h for h in os.getenv("ALLOWED_HOSTS", "*").split(",") if h]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Tierces
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "channels",
    # Métier
    "comptes",
    "programmation",
    "alertes",   # déjà écrite, jamais montée avant ce correctif — cf. MODIFICATIONS.md
    "audience",  # nouvelle app : mesure d'audience du portail public
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # en premier
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "balafon_guide.urls"
WSGI_APPLICATION = "balafon_guide.wsgi.application"

# ---------------------------------------------------------- Temps réel (Channels)
# L'app `alertes` (modèle, service, consumer) existait déjà dans le dépôt mais
# n'était montée nulle part : ASGI_APPLICATION n'était jamais défini, donc
# `runserver` servait tout en WSGI et /ws/alertes/ n'était pas routable, même
# si le frontend s'y connectait. Voir MODIFICATIONS.md, cause n°6.
ASGI_APPLICATION = "balafon_guide.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(os.getenv("REDIS_HOST", "127.0.0.1"), int(os.getenv("REDIS_PORT", "6379")))],
        },
    }
}
# Sans Redis sous la main (poste de démonstration), remplacer par :
#   CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
# InMemory ne fonctionne qu'avec un seul processus — jamais en production.

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ---------------------------------------------------------------- PostgreSQL
# DB_ENGINE bascule entre SQLite (par défaut — aucun serveur à lancer, adapté
# à une machine modeste) et PostgreSQL (DB_ENGINE=postgresql dans .env, celle
# du cahier des charges — JSONB, contraintes d'exclusion, etc.). Le code
# métier ne dépend d'aucune fonctionnalité propre à PostgreSQL : le modèle
# Emission valide le non-chevauchement en Python (voir clean() dans
# programmation/models.py), une ancienne contrainte d'exclusion PostgreSQL a
# déjà été retirée du graphe de migrations pour cette raison (voir
# programmation/migrations/0005_...). La bascule est donc sûre dans les deux
# sens ; seule la commande manage.py migrate diffère (SQLite n'a besoin de
# rien de plus).
DB_ENGINE = os.getenv("DB_ENGINE", "sqlite").strip().lower()

if DB_ENGINE == "postgresql":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "balafon_tv"),
            "USER": os.getenv("DB_USER", "postgres"),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "OPTIONS": {"connect_timeout": 5},
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# --------------------------------------------------------------- Custom user
AUTH_USER_MODEL = "comptes.Utilisateur"

# ------------------------------------------------------------------- DRF+JWT
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    # Permission ouverte par défaut en développement ; serrée en production.
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.AllowAny",),
    "DEFAULT_PAGINATION_CLASS": None,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),   # une journée d'antenne
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ----------------------------------------------------------------------- CORS
# localhost et 127.0.0.1 sont deux origines DIFFÉRENTES pour un navigateur :
# ouvrir le front sur l'une quand seule l'autre est autorisée produit une
# erreur CORS que `fetch` restitue comme un simple échec réseau — donc,
# côté frontend v1, indiscernable d'une base vide. Voir MODIFICATIONS.md.
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# ------------------------------------------------------------------- Divers
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Douala"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

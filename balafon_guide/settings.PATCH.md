# Patch — `backend/balafon_guide/settings.py`

## 1. Enregistrer l'app d'audience

```python
INSTALLED_APPS = [
    # …
    "comptes",
    "programmation",
+   "audience",
]
```

## 2. Activer Channels pour la diffusion temps réel

Sans cette section, `programmation/signals.py` se contente de journaliser un
avertissement : rien n'est poussé, et la synchronisation retombe sur le
rafraîchissement périodique de 45 s (ce qui reste fonctionnel, mais moins vif).

```python
ASGI_APPLICATION = "balafon_guide.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [(os.getenv("REDIS_HOST", "127.0.0.1"),
                              int(os.getenv("REDIS_PORT", 6379)))]},
    }
}

# Sans Redis sous la main (poste de démonstration), remplacez par :
# CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
# ⚠ InMemory ne fonctionne qu'avec un seul processus — jamais en production.
```

Lancez ensuite le serveur en ASGI, sinon les WebSockets ne sont pas servis :

```bash
daphne -b 0.0.0.0 -p 8000 balafon_guide.asgi:application
# (`manage.py runserver` reste possible en développement : Channels
#  prend la main automatiquement dès que ASGI_APPLICATION est défini.)
```

## 3. CORS — ajouter le port de prévisualisation Vite

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",   # ← à ajouter : 127.0.0.1 et localhost sont
    "http://localhost:5173",   #   des origines DIFFÉRENTES pour le navigateur
    "http://127.0.0.1:5173",
    "http://localhost:4173",
]
```

> C'est un piège fréquent : ouvrir le front sur `127.0.0.1:3000` alors que seul
> `localhost:3000` est autorisé produit une erreur CORS que la console affiche
> mais que `fetch` renvoie comme un simple échec réseau — donc, dans la v1,
> comme un `null` indistinguable d'une base vide.

---

# Patch — `backend/balafon_guide/urls.py`

```python
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("comptes.urls")),
+   path("api/audience/", include("audience.urls")),
    path("api/", include("programmation.urls")),   # doit rester EN DERNIER
]
```

L'ordre compte : `path("api/", …)` monte un routeur DRF qui capterait
`api/audience/` si on le plaçait avant.

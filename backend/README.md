# BALAFON + GUIDE — Backend Django (scaffold)

Scaffold conforme au guide d'intégration (Phases 1 et 2bis). À copier dans un
projet Django réel (`balafon_guide`) avec les apps `comptes`, `programmation`,
`alertes`, `integration_vmix`.

## Démarrage (Phase 1)

```bash
python3.12 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env            # éditer DB_PASSWORD / SECRET_KEY
docker compose up -d            # PostgreSQL 16 + Redis 7

django-admin startproject balafon_guide .
django-admin startapp comptes
django-admin startapp programmation
django-admin startapp alertes
django-admin startapp integration_vmix

# Fusionner config/settings_bdd.py dans balafon_guide/settings.py
cp data/emissions_reelles_balafon_tv.json data/ 2>/dev/null || true

python manage.py makemigrations && python manage.py migrate
python manage.py verifier_bdd                 # ← teste la connexion PostgreSQL
python manage.py createsuperuser
python manage.py charger_emissions_demo       # ← vraies émissions Balafon TV
python manage.py runserver                    # API sur http://localhost:8000/api/
```

## Contrat d'API attendu par le frontend

| Endpoint | Méthode | Usage frontend |
|---|---|---|
| `/api/chaines/` | GET | Liste des chaînes (seul `balafon-tv` est diffusé) |
| `/api/grilles/?statut=validee` | GET | **Hydratation de l'EPG** (`depuisApiBackend` dans `src/utils/planbyAdapter.ts`) |
| `/api/emissions/` | GET/POST/PATCH | CRUD émissions (Admin) |
| `/api/auth/token/` | POST | JWT (superuser → rôle administrateur) |
| `ws://…/ws/alertes/` | WS | Alertes temps réel vers la Régie (Channels + Redis) |

Le frontend bascule automatiquement : si `VITE_API_URL` répond, l'EPG est hydraté
depuis Django ; sinon il fonctionne en **mode démo local** (catalogue JSON embarqué,
persistance localStorage). Aucun écran vide dans les deux cas.

## vMix

`VMIX_MODE=simule` par défaut : le service `integration_vmix` journalise les appels
sans émettre de requête réelle. Passer en `reel` avec l'URL de la régie
(`:8088/api`) après validation réseau — voir `backend/.env.example`.

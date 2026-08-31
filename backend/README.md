# BALAFON + GUIDE — Backend Django

Backend REST du système EPG de Balafon TV. **2 apps** : `comptes` (auth JWT +
drapeaux de rôle) et `programmation` (chaînes, grilles, émissions).

## Rôles (drapeaux sur `comptes.Utilisateur`)

| Drapeau | Rôle métier | Droits |
|---|---|---|
| `est_admin` | Administrateur plateforme | CRUD grilles/émissions/chaînes/comptes |
| `est_directeur_antenne` | Directeur d'Antenne | idem + **validation exclusive** (`POST /grilles/{id}/valider/`) |
| aucun des deux | Diffuseur (régie) | lecture, futur WebSocket d'alertes (phase 2) |

Le serializer `/auth/profil/` expose un champ `role` calculé
(`administrateur` / `directeur_antenne` / `diffuseur`) consommé par le frontend.

## Démarrage (Windows PowerShell, depuis `backend/`)

```powershell
# 1. Environnement
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env        # éditer DB_PASSWORD si besoin

# 2. PostgreSQL locale : créer la base
psql -U postgres -c "CREATE DATABASE balafon_tv;"

# 3. Vérification + migrations
python manage.py check
python manage.py makemigrations comptes
python manage.py makemigrations programmation
python manage.py migrate      # « comptes » doit être appliqué avant admin

# 4. Premier compte + données réelles
python manage.py createsuperuser
python manage.py charger_emissions_demo     # vraies émissions Balafon TV
python manage.py runserver
```

`charger_emissions_demo` accepte le catalogue hebdomadaire
(`data/emissions_reelles_balafon_tv.json`) **et** le format contrat (liste
plate ISO avec `image_affiche`) ; idempotent (`update_or_create`).

## Contrat consommé par le frontend

| URL | Réponse attendue |
|---|---|
| `GET /api/chaines/` | `[{"nom": "Balafon TV", "slug": "balafon-tv", ...}]` |
| `GET /api/grilles/?statut=validee` | grilles avec `chaine` imbriquée, `chaine_nom`, `emissions[]` (ISO), `est_complete` |
| `GET /api/emissions/` | émissions avec `image_affiche`, `fiabilite` |
| `GET /api/grilles/{id}/completude/` | `{"complete": bool, "plages_vides": [...]}` |
| `POST /api/grilles/{id}/valider/` | 200 (directeur) / 403 (autre) |
| `POST /api/auth/connexion/` | `{access, refresh, utilisateur{role}}` |
| `POST /api/auth/rafraichir/` | `{access}` |
| `POST /api/auth/deconnexion/` | blacklist du refresh |
| `GET /api/auth/profil/` | utilisateur courant |

Frontend : `VITE_API_URL=http://localhost:8000/api` dans `.env.local` —
l'app bascule automatiquement de la démo locale vers l'API (hydratation des
grilles, affiches via `image_affiche`).

## Tests

```powershell
pytest            # backend/tests — validation, rôles, filtrage, chevauchement, complétude
```

## Phase 2 (non incluse)

Django Channels + Redis : `ws/alertes/` poussera les alertes de modification
des grilles validées vers la régie (groupe par chaîne).

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

### Option A — SQLite (recommandé pour commencer, zéro dépendance)

Le `.env` fourni est déjà configuré en `DB_ENGINE=sqlite`. Aucun serveur de base
de données n'est nécessaire :

```powershell
# 1. Environnement
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env        # déjà en DB_ENGINE=sqlite

# 2. Migrations + compte + données
python manage.py makemigrations comptes programmation
python manage.py migrate
python manage.py creer_compte --email direction@balafon.media `
    --motdepasse "MotDePasseSolide!" --prenom Martin --nom Essomba `
    --role directeur_antenne --superuser
python manage.py charger_emissions_demo     # vraies émissions Balafon TV

# 3. Lancer
python manage.py runserver    # http://localhost:8000/api/
```

### Option B — PostgreSQL 16 (production / docker)

```powershell
# 1. Démarrer PostgreSQL + Redis (crée la base balafon_tv, user postgres)
docker compose up -d
docker ps                     # balafon_guide_db doit être "healthy"

# 2. Passer le .env en postgresql
#    éditer .env : DB_ENGINE=postgresql

# 3. Migrations + compte + données (mêmes commandes que l'option A)
python manage.py makemigrations comptes programmation
python manage.py migrate
python manage.py creer_compte --email direction@balafon.media `
    --motdepasse "MotDePasseSolide!" --role directeur_antenne --superuser
python manage.py charger_emissions_demo
python manage.py runserver
```

> `creer_compte` fixe le **vrai rôle métier** (RBAC) — `createsuperuser` seul ne
> donne que les droits Django admin, pas le rôle `directeur_antenne`.

## Dépannage

**`connection timeout expired` sur `localhost:5432`** : Django ne trouve aucun
serveur PostgreSQL. Causes et remèdes :

1. **PostgreSQL pas démarré** → c'est le cas le plus courant. Soit vous lancez
   `docker compose up -d`, soit vous démarrez le service Windows
   (`Services` → `postgresql-x64-16` → Démarrer), soit — le plus simple — vous
   passez en SQLite (`DB_ENGINE=sqlite` dans `.env`) qui ne requiert rien.
2. **Base / utilisateur inexistants** → `docker-compose.yml` et `.env` sont
   alignés sur `balafon_tv` / `postgres`. Si vous avez une install native, créez
   la base : `psql -U postgres -c "CREATE DATABASE balafon_tv;"`.
3. **Résolution IPv6 (`::1`)** → le `.env` force `DB_HOST=127.0.0.1` pour
   l'éviter sur Windows.

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

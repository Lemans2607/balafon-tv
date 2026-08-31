# BALAFON + GUIDE — Backend Django

API REST + WebSocket pour la plateforme EPG de Balafon TV.

**Stack** : Django 5 · DRF · Channels (Redis) · PostgreSQL 16 · SimpleJWT · drf-spectacular.

## Modèle RBAC (2 rôles métier)

| Rôle | Droits |
|---|---|
| **Directeur d'Antenne** (`directeur_antenne`) | Administrateur de la plateforme : CRUD grilles/émissions, gestion des comptes (`/api/comptes/`), **validation éditoriale exclusive** (`POST /grilles/{id}/valider/`), synchro vMix. |
| **Diffuseur** (`diffuseur`) | Régie : lecture des grilles, alertes temps réel (WebSocket), acquittement, synchro vMix. |

Le rôle « administrateur » n'existe plus : le Directeur d'Antenne EST l'admin (cf. rapport de stage).
Le public non authentifié ne lit que les grilles `statut=validee`.

## Démarrage complet

```bash
# 1. Dépendances
python3.12 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 2. Variables d'environnement
cp .env.example .env            # éditer DB_PASSWORD / SECRET_KEY

# 3. PostgreSQL 16 + Redis 7
docker compose up -d
docker ps                       # balafon_guide_db + balafon_guide_redis

# 4. Migrations
python manage.py makemigrations && python manage.py migrate
python manage.py verifier_bdd   # teste la connexion + liste les tables

# 5. VRAIS comptes métier (remplace createsuperuser, qui ne fixe pas le rôle)
python manage.py creer_compte \
    --email direction@balafon.media --motdepasse 'ChangeMoi!2026' \
    --prenom Martin --nom Essomba --role directeur_antenne --superuser

python manage.py creer_compte \
    --email regie@balafon.media --motdepasse 'ChangeMoi!2026' \
    --prenom Rodrigue --nom Talla --role diffuseur --poste 'Poste vMix 1'

# 6. Données de démo (vraies émissions Balafon TV)
python manage.py charger_emissions_demo

# 7. Serveur ASGI (HTTP + WebSocket)
daphne -p 8000 balafon_guide.asgi:application
```

## Contrat d'API (consommé par le frontend React)

| Endpoint | Méthode | Accès |
|---|---|---|
| `/api/auth/connexion/` | POST | public — `{ email, mot_de_passe }` → JWT |
| `/api/auth/rafraichir/` · `/deconnexion/` · `/profil/` | POST/GET | JWT |
| `/api/comptes/` | CRUD | **Directeur d'Antenne** |
| `/api/chaines/` | GET | public |
| `/api/grilles/?statut=validee&chaine=&date=` | GET | public (validées) / staff |
| `/api/grilles/` | POST/PATCH/DELETE | Directeur d'Antenne |
| `/api/grilles/{id}/valider/` | POST | **Directeur d'Antenne uniquement** |
| `/api/grilles/{id}/completude/` · `/api/grilles/en-cours/` | GET | public |
| `/api/grilles/{id}/emissions/` · `/api/emissions/{id}/` | CRUD | Directeur d'Antenne |
| `/api/alertes/` · `/api/alertes/{id}/marquer-lue/` | GET/POST | Diffuseur (les siennes) / Direction (toutes) |
| `/api/vmix/synchroniser/{grille_id}/` | POST | Direction + Diffuseur |
| `/api/vmix/etat/` | GET | staff |
| `/api/schema/swagger/` | GET | documentation interactive |
| `ws://…/ws/alertes/?chaine=balafon-tv&token=<jwt>` | WS | groupes d'alertes par chaîne |

Le frontend bascule automatiquement : si `VITE_API_URL` répond, l'EPG est hydraté depuis
Django ; sinon il fonctionne en mode démo local (catalogue embarqué + localStorage).

## vMix

`VMIX_MODE=simule` par défaut : le service journalise les appels sans émettre de requête
réelle. Passer en `reel` avec l'URL du poste régie (`http://<ip>:8088/api`) après validation
réseau — chaque synchro est tracée dans `synchro_vmix` (JSONB).

## Tests

```bash
pytest                          # transition de statut, restriction valider/,
                                # alerte post-validation, filtrage public
```

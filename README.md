# BALAFON + GUIDE — Balafon TV

Plateforme de programmation TV pour **Balafon Media Group** (Cameroun) : portail public
(EPG, direct, replay) + back-office **Balafon Studio** (construction de grille, validation
éditoriale, régie de diffusion, synchronisation vMix simulée).

> Portail public dédié **exclusivement à Balafon TV** — aucune radio.

## Données de démonstration — émissions réelles de Balafon TV

Les grilles ne sont plus fictives : elles sont **générées depuis le catalogue réel des
émissions** (`src/data/emissions_reelles_balafon_tv.json` — C'le Matin, Faut Pas Zapper,
Femme au Contrôle, Les Meufs, Top 25 Hit-Parade, C'le Weekend, Grand Plateau, Entretien,
Moment de Sports, Télé-Zoom, Grand Déballage, Télémarché, Séries Cultes).

- `src/utils/planbyAdapter.ts` fournit les deux voies d'alimentation de l'EPG :
  - `depuisApiBackend(grilles)` → format Planby depuis l'API Django/DRF (usage réel à venir) ;
  - `depuisCatalogueDemo(catalogue, slug, nom, lundi)` → format Planby depuis le catalogue JSON
    (c'est cette voie qui alimente le seeding actuel via `src/data/schedules.ts`).
- Chaque émission porte un champ `fiabilite` : `"confirme"` (horaire rapporté par
  balafon.media / presse, source citée dans le JSON) ou `"estime"` (émission réelle, horaire
    hypothétique pour la démo — signalé par un badge doré sur la fiche émission).
- Les jours de la semaine sont peuplés selon les jours de diffusion réels ; les vides sont
    comblés par des blocs de continuité (Rediffusion / Balafon Clips) et le hors antenne
    00:00–06:00. **Une journée (J+2) est volontairement laissée incomplète** pour démontrer la
    détection de trous et le déblocage de la publication par drag & drop.
- Seul le slug `balafon-tv` est diffusé sur ce portail (pas de radio).
- Sources : https://balafon.media/balafon-tv/ et https://lejour.cm (lancement de grille du
  01/07/2024). La grille de production doit être demandée à jour à la régie pour remplacer les
  entrées « estimées ».

## Lancement

```bash
npm install
npm run dev        # développement
npm run build      # build de production
npm run preview    # prévisualisation du build
```

## Stack

React 19 · TypeScript · Vite 6 · Tailwind CSS v4 · Zustand (persistance localStorage) ·
date-fns · Framer Motion · Lucide · React Router (HashRouter) · **Planby 2.1.0** (moteur EPG).

## Architecture

```
src/
  components/planby/    moteur EPG Planby personnalisé (thème, mappers, rendus)
  components/ui/        primitives (Button, Modal, Drawer, Toast, DaySelector, SimClock…)
  components/layout/    PublicNavbar/Footer, StaffShell (sidebar/topbar)
  components/alerts/    AlertCard
  components/media/     ProgramPoster, FakePlayer
  pages/public/         PublicHome, PublicGuide, PublicReplay, ProgramDetails
  pages/staff/          StudioDashboard, AdminBuilder, DirecteurKanban(+GridsPage),
                        RegieControl, ProgramLibrary, AlertCenter, GridHistory, SettingsPage
  store/                appStore, scheduleStore (source demo|api + hydrateFromApi), alertStore, vmixStore
  services/             backend.ts (REST Django + fallback démo), realtime.ts (WebSocket Channels)
  hooks/                useNow (horloge simulée), useCurrentProgram, usePlayheadX, useMediaQuery
backend/                scaffold Django : docker-compose, settings, charger_emissions_demo, verifier_bdd
  data/                 emissions_reelles_balafon_tv.json + programmes + grilles générées (7 jours)
  utils/                time.ts, validation.ts, planbyAdapter.ts (API Django ↔ Planby, catalogue ↔ Planby)
  types/                types métier + métadonnées sémantiques
```

## Rôles & routes

| Route | Accès |
|---|---|
| `/demo` | Sélecteur d’espace (changement de rôle sans rechargement) |
| `/tv`, `/tv/guide`, `/tv/replay`, `/tv/program/:id` | Portail public |
| `/studio` | Pilotage (tous rôles staff) |
| `/studio/admin` | Admin — constructeur EPG (drag & drop, complétude, soumission) |
| `/studio/directeur` | Directeur — Kanban de validation éditoriale |
| `/studio/regie` | Régie — mission control lecture seule + alertes + vMix |
| `/studio/programmes` `/studio/grilles` `/studio/alertes` `/studio/historique` `/studio/parametres` | Studio |

## Intégration Planby — audit

- **Package utilisé : `planby@2.1.0`** (`npm install planby`). Le namespace `@nessprim/planby`
  n’existe pas dans le registry utilisé ; `planby@2.x` exige React ≥ 19 → le projet a été migré
  de React 18.3 vers React 19 (`react`, `react-dom`, `@types/react`, `@types/react-dom`) et
  `lucide-react` a été mis à jour (≥ 0.469) pour la compatibilité.
- **Fonctionnalités Planby réellement utilisées** : `useEpg`, `Epg`, `Layout`,
  `renderProgram` / `renderChannel` / `renderTimeline`, `useProgram`, `useTimeline`,
  `ProgramBox`, `ProgramContent`, `ChannelBox`, `ChannelLogo`, `TimelineWrapper/Box/Time/Divider(s)`,
  `onScrollLeft` / `onScrollRight`, thème `Theme` complet, virtualisation interne
  (`isProgramVisible`), timeline 06:00→24:00 (admin) et 00:00→24:00 (public).
- **Adaptations vérifiées dans les types de la 2.1.0** :
  - `useProgram({ program, isBaseTimeFormat })` et `useTimeline(n, isBaseTimeFormat)` prennent
    des arguments explicites (plus de contexte implicite).
  - Le `ProgramItem` exporté est le type des props de rendu ; le type de l’élément positionné
    `{ position, data }` est redéfini structurellement (`BalafonProgramItem`).
  - `ChannelBox` attend `{ top, height }`.
- **Limitations de la version libre et fallbacks propres** :
  - **Drag & Drop** : absent de Planby libre → fallback HTML5 natif au-dessus du conteneur
    Planby (`handleProgramDrop`), conversion du point de dépôt en heure via `hourWidth`,
    `sidebarWidth` et le scroll interne (`[data-testid="content"]`), snap 30 min.
  - **Playhead** : la ligne native est verte et liée à l’heure réelle → `isLine: false` +
    playhead rouge Balafon superposé, synchronisé sur l’**heure simulée** (`usePlayheadX`).
  - **« Aller à maintenant »** : `onScrollToNow` natif ne fonctionne que sur le jour réel ;
    scroll custom calculé depuis l’heure simulée (avec repli sur l’API native).
  - Les règles métier (trous, chevauchements, complétude, publication, rôles, historique,
    alertes, vMix) sont **hors Planby** : `utils/validation.ts`, stores et services.

## Fonctionnalités fonctionnelles (état local persisté)

- Portail public : direct calculé en continu, rail « En ce moment », guide EPG 7 jours,
  filtres par catégorie, playhead, hors antenne/rediffusion, recherche, replay, fiches émission.
- Admin : drag & drop bibliothèque → timeline, refus de chevauchement et de dépassement de
  00:00, détection de trous (hachures rouges), bouton **Publier** désactivé tant que la grille
  est incomplète ou non validée, soumission au Directeur, modale rouge sur modification d’une
  grille validée (alerte critique Régie + journal + vMix).
- Directeur : Kanban Brouillons / En attente / Validées, validation (→ portail public),
  refus, alerte info Régie, journal d’audit.
- Régie : EPG lecture seule, précédent/en cours/suivant, acquittement d’alertes (historique
  conservé), synchronisation vMix **simulée**, simulation de modification.
- Horloge de démonstration persistée (décalage ±8 h) partagée par tous les modules.

## Fonctionnalités simulées

Flux vidéo (lecteur factice), liaison vMix (statuts, journal, synchro), notifications
« temps réel » (état local). Rien n’est émis vers un serveur.

## Intégration backend Django (dès maintenant)

Le frontend est **déjà câblé** sur le contrat d’API du guide d’intégration — il bascule
automatiquement entre les deux modes, sans écran vide :

| Mode | Condition | Source des grilles |
|---|---|---|
| **Démo locale** | `VITE_API_URL` vide ou backend injoignable | Catalogue embarqué + localStorage |
| **API Django** | `GET {VITE_API_URL}/grilles/?statut=validee` répond | Hydratation via `depuisApiBackend` (adaptateur Planby) |

- `src/services/backend.ts` — client REST (grilles, chaînes, JWT) avec timeout et fallback.
- `src/services/realtime.ts` — WebSocket Django Channels (`VITE_WS_URL`) : les alertes reçues
  sont injectées dans l’alertStore (acquittement en Régie, historique tracé).
- Badge « Démo locale / API Django » dans la topbar Studio + test de connexion live dans
  **Studio → Paramètres** (latence, nombre de grilles, hydratation en un clic).

### Scaffold backend fourni (`backend/`)

- `docker-compose.yml` — PostgreSQL 16 + Redis 7 (channel layer).
- `config/settings_bdd.py` — DATABASES, CHANNEL_LAYERS, DRF + SimpleJWT, CORS, Swagger.
- `comptes/management/commands/verifier_bdd.py` — `python manage.py verifier_bdd`.
- `programmation/management/commands/charger_emissions_demo.py` — charge les **vraies
  émissions Balafon TV** (`backend/data/emissions_reelles_balafon_tv.json`) dans la grille
  de la semaine en cours, fuseau Africa/Douala.
- Démarrage complet : `backend/README.md` (Phases 1 et 2bis du guide).

## Prochaines étapes (production)

1. **Déployer le backend** : Gunicorn/Daphne + Nginx, SSL, `.env` sécurisé (voir `backend/.env.example`).
2. **vMix réel** : passer `VMIX_MODE=reel` avec l’URL régie `:8088/API` — la façade
   `vmixService` (connect/getStatus/sync/sendChange/ack) est déjà alignée sur ce contrat.
3. **Authentification JWT** en production (écran de login branché sur `POST /api/auth/token/`).
4. **Fuseau Africa/Douala** strict côté serveur et CDN pour les affiches.
5. **CI/CD + monitoring** : GitHub Actions, Sentry, alertes Slack.

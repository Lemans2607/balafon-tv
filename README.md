# BALAFON + GUIDE — Balafon TV

Plateforme de programmation TV pour **Balafon Media Group** (Cameroun) : portail public
(EPG, direct, replay) + back-office **Balafon Studio** (construction de grille, validation
éditoriale, régie de diffusion, synchronisation vMix simulée).

> Portail public dédié **exclusivement à Balafon TV** — aucune radio.

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
  store/                appStore, scheduleStore, alertStore, vmixStore (Zustand + persist)
  hooks/                useNow (horloge simulée), useCurrentProgram, usePlayheadX, useMediaQuery
  data/                 programmes + grilles de démonstration (7 jours)
  utils/                time.ts (fuseau/ISO), validation.ts (trous, chevauchements, complétude)
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

## Prochaines étapes (production)

1. **Backend Django + PostgreSQL** : modèles `Program`, `ScheduleItem`, `Grid`, `Alert`,
   `AuditLog` ; API REST (`VITE_API_BASE_URL`) remplaçant les stores mock.
2. **WebSocket** (`VITE_WS_URL`) : push des alertes Régie et de l’état « en direct ».
3. **vMix réel** : la façade `vmixService` (connect/getStatus/sync/sendChange/ack) pointe déjà
   vers les futurs endpoints REST `:8088/API` et WebSocket `:8099` (voir `.env.example`).
4. **Fuseau Africa/Douala** côté serveur (conversion ISO → WAT stricte) et CDN pour les affiches.

# Balafon + Guide — Balafon Media Group

Portail TV public + studio de gestion d'antenne (EPG, validation éditoriale,
régie de diffusion) pour **Balafon TV**. React + TypeScript + Vite + Tailwind,
état persistant (localStorage) et synchronisation temps réel entre onglets
(BroadcastChannel).

## Lancement

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Routes

| Route | Écran |
|---|---|
| `/` · `/tv` | Portail public — Boulevard du Direct, rails, replay |
| `/guide` · `/tv/guide` | Guide TV public (EPG à la minute, hors antenne explicite) |
| `/login` · `/demo` | Authentification + choix du rôle |
| `/studio` | Tableau de bord (selon rôle actif) |
| `/studio/grilles` | Constructeur EPG (Admin) — drag & drop, contrôle de complétude |
| `/studio/directeur` | Kanban de validation éditoriale |
| `/studio/regie` | Mission control live — playhead, alertes, vMix simulé |
| `/studio/comptes` | Comptes back-office (API) — espace Directeur/Admin |

Comptes démo (mot de passe libre) : `admin@balafon.cm`, `direction@balafon.cm`,
`regie@balafon.cm`.

## Changements appliqués (état courant)

**Thème global**
- Thème **clair par défaut** ; les anciennes préférences sombres sont migrées
  automatiquement (`themeStore.ts`). Bascule clair/sombre dans la topbar Studio
  et le Guide TV. L'EPG et les panneaux suivent le thème (`planbyTheme.ts` :
  `planbyTheme` / `planbyThemeLight`) ; le portail public reste cinématographique
  (noir `#050505`).

**Authentification & comptes**
- Tous les domaines email valides sont acceptés (`utils/validators.ts`).
- Les comptes sont chargés via un service dédié simulant l'API Django
  `GET /api/auth/comptes/` (`services/auth.ts`), affichés dans
  `/studio/comptes` (espace Directeur d'Antenne, gestion réservée à l'Admin).
- Les rôles Django (`admin`, `directeur_antenne`, `regie_diffusion`,
  `technicien`) sont convertis vers les rôles Studio via
  `convertirRoleDjango()`.

**Constructeur de grille (`/studio/grilles`)**
- `Créer une grille` visible dans le Tableau de bord (ouvre directement la
  modale via `?nouvelle=1` ; `?grille=<id>` sélectionne une grille).
- Bibliothèque à gauche (recherche + filtres catégorie), timeline 24h à droite.
- Le calendrier est placé **sous la grille** pour libérer l'espace principal.
- L'horloge de démonstration ne figure plus sur cette page.

**Drag & drop EPG**
- Payload standard `text/plain` : JSON `{ emissionId, dureeMinutes }`
  (`encoderProgramme` / `decoderProgramme`), avec compatibilité de l'ancien
  format `text/balafon-program`. Magnétisme 30 min, ghost de survol vert/rouge,
  chevauchements refusés (toast), limite 24:00 respectée.

**Horloge & logique temporelle (`hooks/useNow.ts`)**
- L'horloge de démonstration est réservée à la Régie (presets 06:15 / 13:30 /
  **18:00** / 20:45 / 23:45 + retour temps réel) ; retirée du portail public,
  du Tableau de bord et des Paramètres.
- Le programme « Ensuite » est déterministe : toujours le créneau
  immédiatement suivant dans la grille.

**Logo & favicon**
- Favicon : **B blanc sur fond Balafon Red** (`public/favicon.svg`).
- Branding **Balafon + Guide** partagé (navbar, Studio, footer, connexion,
  EPG) ; plus de wordmark « Balafon Media » dans les en-têtes.

**Footer public**
- Zone dédiée aux **réseaux de diffusion de Balafon TV** avec logos locaux :
  Canal+ (903), StarTimes (747), Creolink (301), Swecom (S43), TV+ (36),
  Amos 17 (17° Est) — `components/PublicFooter.tsx`.

**Protection visuelle**
- Couches `z-index` explicites sur le lecteur simulé du hero ; overlays
  décoratifs en `pointer-events-none` ; hauteur minimale du conteneur EPG
  (`min-h-[150px]`) pour limiter les soucis d'affichage liés aux extensions
  navigateur.

## Vers la production

- **Backend** : remplacer `services/auth.ts` et le store par l'API Django
  (PostgreSQL) — les contrats (`/api/auth/comptes/`, grilles, alertes) sont
  déjà isolés dans `services/` et `state/`.
- **Temps réel** : le canal BroadcastChannel se remplace par un WebSocket
  (Django Channels) sans toucher aux vues.
- **vMix** : `syncVmix()` dans le store est clairement marquée « mode
  démonstration » ; brancher l'API REST vMix (`localhost:8088/api`) derrière la
  même signature.

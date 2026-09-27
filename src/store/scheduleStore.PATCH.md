# Patch — `src/store/scheduleStore.ts`

Trois modifications chirurgicales. Le reste du fichier ne bouge pas.

---

## 1. Déclarer `viderGrille` dans l'interface

Dans `interface ScheduleState`, sous `hydrateFromApi` :

```ts
  hydrateFromApi: (grilles: GrilleAPI[]) => void;
+ /** Le backend a répondu « aucune grille validée » : on efface réellement. */
+ viderGrille: (motif: string) => void;
```

---

## 2. Remplacer `hydrateFromApi` en entier

Deux corrections : `programs` est **reconstruit** au lieu d'être cumulé (les émissions
supprimées dans Django disparaissent enfin de la bibliothèque), et l'identité d'un
programme s'appuie sur l'`id` serveur plutôt que sur le titre en minuscules.

```ts
      hydrateFromApi: (grilles) => {
        const statutNormalise = (s: string | undefined): GridStatus => {
          const clean = (s ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          if (clean.includes("valid")) return "validated";
          if (clean.includes("attente") || clean.includes("pending")) return "pending";
          return "draft";
        };

        /* ─── CORRECTIF n°3 ───────────────────────────────────────────
           On NE part PLUS de get().programs.

           L'ancienne version faisait `const programsBase = [...get().programs]`
           puis `programsBase.push(...)` : la liste ne faisait que croître.
           Une émission supprimée côté Django restait dans le localStorage
           d'une session précédente, donc toujours visible dans la
           bibliothèque, les filtres et le panneau « À suivre ».

           On repart des seules entrées système du catalogue local
           (bloc « hors antenne », habillages) et on reconstruit le reste
           à partir de la réponse serveur, qui fait autorité.
           ──────────────────────────────────────────────────────────── */
        const programsBase: Program[] = SEED_PROGRAMS.filter(
          (p) => p.category === "off-air" || p.id.startsWith("sys-")
        );
        const parCle = new Map(programsBase.map((p) => [p.id, p]));

        const scheduleMap: Record<string, ScheduleItem[]> = {};
        const gridsOut: Record<string, GridInfo> = {};
        let seq = 0;

        for (const grille of grilles) {
          const statut = statutNormalise((grille as unknown as { statut?: string }).statut);

          for (const emission of grille.emissions ?? []) {
            const debut = new Date(emission.heure_debut);
            const fin = new Date(emission.heure_fin);
            if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) continue;

            /* Identité stable côté serveur : le titre seul provoquait des
               collisions entre deux émissions homonymes de grilles différentes. */
            const cle = `api-${emission.id}`;
            let program = parCle.get(cle);

            if (!program) {
              /* Reprise de l'affiche/description du catalogue local si le
                 backend ne les fournit pas encore (champs facultatifs). */
              const local = SEED_PROGRAMS.find(
                (p) => p.title.toLowerCase() === emission.titre.trim().toLowerCase()
              );
              program = {
                id: cle,
                title: emission.titre.trim(),
                description: emission.description || local?.description || "",
                category: GENRE_TO_CATEGORY[emission.genre] ?? "entertainment",
                durationMinutes: Math.max(
                  5,
                  Math.round((fin.getTime() - debut.getTime()) / 60000)
                ),
                posterUrl: emission.image_affiche || local?.posterUrl || "",
                status: "validated",
                isReplayAvailable: local?.isReplayAvailable ?? false,
                tags: [emission.genre],
                fiabilite: emission.fiabilite ?? "confirme",
              };
              parCle.set(cle, program);
              programsBase.push(program);
            }

            const date = dateKey(debut);
            (scheduleMap[date] ??= []).push({
              id: `api-${grille.id}-${emission.id}-${++seq}`,
              programId: program.id,
              channelId: grille.chaine?.slug ?? "balafon-tv",
              date,
              startTime: format(debut, "HH:mm"),
              endTime: format(fin, "HH:mm"),
              status: statut,
              source: "import",
              lastModifiedBy: "API Django",
              updatedAt: isoLocal(new Date()),
              /* Conservé pour que le Studio puisse appeler
                 DELETE /api/emissions/{id}/ sans re-résoudre l'identifiant. */
              serverId: Number(emission.id),
            } as ScheduleItem);

            gridsOut[date] = {
              date,
              status: statut,
              author: "API Django",
              updatedAt: isoLocal(new Date()),
              published: statut === "validated",
              serverId: Number(grille.id),
            } as GridInfo;
          }
        }

        for (const jour of Object.keys(scheduleMap)) {
          scheduleMap[jour].sort((a, b) => a.startTime.localeCompare(b.startTime));
        }

        set({
          programs: programsBase,
          scheduleMap,
          grids: gridsOut,
          seededFor: todayKey(),
          source: "api",
          logs: [
            {
              id: `log-api-${Date.now()}`,
              at: isoLocal(new Date()),
              user: "API Django",
              role: "directeur",
              action: "Synchronisation backend",
              details:
                `${Object.keys(scheduleMap).length} jour(s) et ` +
                `${programsBase.length} émission(s) reçus de GET /api/grilles/?statut=validee.`,
              severity: "info",
            },
            ...get().logs,
          ].slice(0, 200),
        });
      },

      /* ─── CORRECTIF n°2 (côté store) ──────────────────────────────
         Le backend a répondu, et il n'a rien. Ce n'est pas une panne :
         c'est l'état réel de la base après suppression. On efface.
         ──────────────────────────────────────────────────────────── */
      viderGrille: (motif) => {
        set({
          scheduleMap: {},
          grids: {},
          programs: SEED_PROGRAMS.filter(
            (p) => p.category === "off-air" || p.id.startsWith("sys-")
          ),
          source: "api",
          seededFor: todayKey(),
          logs: [
            {
              id: `log-vide-${Date.now()}`,
              at: isoLocal(new Date()),
              user: "API Django",
              role: "directeur",
              action: "Grille vidée",
              details: motif,
              severity: "warning",
            },
            ...get().logs,
          ].slice(0, 200),
        });
      },
```

---

## 3. Persister `source`

Sans cette ligne, `source` revient à `"demo"` à chaque rechargement, le garde-fou
`if (get().source === "api") return;` de `ensureSeed()` ne se déclenche jamais, et le jeu
de démonstration réécrase les données venues de Django.

```ts
    {
      name: "balafon-schedule-v4",   // ← v3 → v4 : purge les caches pollués
      partialize: (s) => ({
        programs: s.programs,
        scheduleMap: s.scheduleMap,
        grids: s.grids,
        logs: s.logs.slice(0, 200),
        seededFor: s.seededFor,
+       source: s.source,
      }),
    }
```

> Le passage de `balafon-schedule-v3` à `v4` est important : il force l'abandon des
> `localStorage` existants, qui contiennent déjà les émissions fantômes. Pensez à mettre à
> jour les deux `localStorage.removeItem("balafon-schedule-v3")` de l'`ErrorBoundary`
> dans `App.tsx`.

---

## 4. Brancher le hook dans `App.tsx`

Supprimez le bloc d'hydratation manuelle du `useEffect` de `Root()` (l'appel à
`fetchGrillesValidees` et `hydrateFromApi`) : `useGrilleLive()` s'en charge désormais, en
continu.

```tsx
+ import { useGrilleLive } from "./hooks/useGrilleLive";

  function Root() {
    const theme = useThemeStore((s) => s.theme);
+   const { etat, raison } = useGrilleLive();   // ← synchro permanente

    useEffect(() => {
      // …thème inchangé…
    }, [theme]);

    useEffect(() => {
      useScheduleStore.getState().ensureSeed();
      // …alertes et date sélectionnée inchangées…
-     if (isBackendConfigured()) {
-       const grilles = await fetchGrillesValidees();
-       if (!cancelled && grilles) useScheduleStore.getState().hydrateFromApi(grilles);
-     }
      stopStream = connectAlertStream(/* … */);
    }, []);
```

Ajoutez également deux champs optionnels aux types, dans `src/types/index.ts` :

```ts
export interface ScheduleItem {
  // …
+ /** Clé primaire Django, pour les mutations depuis le Studio. */
+ serverId?: number;
}

export interface GridInfo {
  // …
+ serverId?: number;
}
```

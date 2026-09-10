import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Alerte, Db, Grille, Role } from "../types";
import { PROGRAMMES, seedDb } from "../data/mock";
import {
  SLOTS,
  blocCouvrant,
  finBlocLabel,
  peutPlacer,
  programmeDe,
  slotLabel,
  toHHMM,
  uid,
} from "../utils/epg";

const LS_KEY = "balafon_studio_v3";
const CANAL = "balafon-studio-sync";
const ROLE_KEY = "balafon_role";

export interface DragInfo {
  programmeId: string;
  duree: number;
  from?: { grilleId: string; jourIdx: number; blockId: string };
}

interface Vmix {
  syncing: boolean;
  lastSync: number | null;
}

interface StudioCtx {
  db: Db;
  role: Role | null;
  setRole: (r: Role) => void;
  dragInfo: DragInfo | null;
  setDragInfo: (d: DragInfo | null) => void;
  vmix: Vmix;
  syncVmix: () => Promise<void>;
  grilleAntenne: Grille | undefined;
  /* actions EPG */
  placer: (grilleId: string, jourIdx: number, slot: number, programmeId: string, acteur: Role, from?: DragInfo["from"]) => { ok: boolean; raison?: string };
  retirer: (grilleId: string, jourIdx: number, blockId: string, acteur: Role) => void;
  publier: (grilleId: string, acteur: Role) => { ok: boolean; raison?: string };
  repasserBrouillon: (grilleId: string, acteur: Role) => void;
  valider: (grilleId: string, acteur: Role) => void;
  renvoyer: (grilleId: string, acteur: Role) => void;
  creerGrille: (nom: string, acteur: Role) => Grille;
  acquitter: (alerteId: string) => void;
}

const Ctx = createContext<StudioCtx | null>(null);

function charger(): Db {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const db = JSON.parse(raw) as Db;
      if (db.version === 3 && Array.isArray(db.grilles)) return db;
    }
  } catch {
    /* re-seed */
  }
  const db = seedDb();
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch {
    /* mémoire seule */
  }
  return db;
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Db>(charger);
  const [role, setRoleState] = useState<Role | null>(() => {
    const r = sessionStorage.getItem(ROLE_KEY);
    return r === "admin" || r === "directeur" || r === "regie" ? r : null;
  });
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [vmix, setVmix] = useState<Vmix>({ syncing: false, lastSync: Date.now() - 42 * 60_000 });
  const bcRef = useRef<BroadcastChannel | null>(null);
  const senderId = useRef(uid("tab"));

  /* ——— Persistance + temps réel inter-onglets ——— */
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(db));
    } catch {
      /* mémoire seule */
    }
    try {
      if (!bcRef.current) bcRef.current = new BroadcastChannel(CANAL);
      bcRef.current.postMessage({ from: senderId.current, db });
    } catch {
      /* pas de canal */
    }
  }, [db]);

  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(CANAL);
      bc.onmessage = (ev: MessageEvent<{ from: string; db: Db }>) => {
        if (ev.data?.from !== senderId.current && ev.data?.db) setDb(ev.data.db);
      };
    } catch {
      bc = null;
    }
    return () => {
      bc?.close();
      bcRef.current = null;
    };
  }, []);

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    try {
      sessionStorage.setItem(ROLE_KEY, r);
    } catch {
      /* ignore */
    }
  }, []);

  /* ——— Journal + alertes ——— */
  const loguer = (d: Db, acteur: Role | "systeme", action: string): Db => ({
    ...d,
    log: [{ id: uid("l"), ts: Date.now(), acteur, action }, ...d.log].slice(0, 60),
  });

  const alerter = (d: Db, texte: string): Db => {
    const a: Alerte = { id: uid("a"), ts: Date.now(), heure: toHHMM(new Date().getHours() * 60 + new Date().getMinutes()), texte, acquittee: false };
    return { ...d, alertes: [a, ...d.alertes].slice(0, 30) };
  };

  /* ——— Mutations ——— */

  const muterGrille = useCallback(
    (grilleId: string, fn: (g: Grille, d: Db) => { g: Grille; d: Db }) => {
      setDb((prev) => {
        const g = prev.grilles.find((x) => x.id === grilleId);
        if (!g) return prev;
        const { g: ng, d: nd } = fn(g, prev);
        return { ...nd, grilles: prev.grilles.map((x) => (x.id === grilleId ? ng : x)) };
      });
    },
    []
  );

  const placer = useCallback<StudioCtx["placer"]>(
    (grilleId, jourIdx, slot, programmeId, acteur, from) => {
      const grille = db.grilles.find((x) => x.id === grilleId);
      const prog = programmeDe(PROGRAMMES, programmeId);
      if (!grille || !prog) return { ok: false, raison: "Programme introuvable." };
      if (grille.statut === "validee" && acteur === "admin") {
        return { ok: false, raison: "Grille validée : seul le Directeur d'Antenne peut la modifier." };
      }
      const jour = grille.jours[jourIdx] ?? [];
      const ignore = from?.blockId;
      const remplace = blocCouvrant(jour, PROGRAMMES, slot);
      if (!peutPlacer(jour, PROGRAMMES, slot, prog.duree, ignore)) {
        return { ok: false, raison: `Conflit horaire : le créneau ${slotLabel(slot)} – ${finBlocLabel(slot, prog.duree)} n'est pas libre.` };
      }

      muterGrille(grilleId, (g, d) => {
        let jourActuel = g.jours[jourIdx].filter((b) => b.id !== from?.blockId);
        if (remplace && remplace.id !== from?.blockId) jourActuel = jourActuel.filter((b) => b.id !== remplace.id);
        const blocs = [...jourActuel, { id: uid("b"), programmeId, slot }];
        const jours = g.jours.map((j, i) => (i === jourIdx ? blocs : j));

        let dd = { ...d };
        const titreRemplace = remplace ? programmeDe(PROGRAMMES, remplace.programmeId)?.titre : undefined;
        const action =
          titreRemplace && titreRemplace !== prog.titre
            ? `Remplacement de « ${titreRemplace} » par « ${prog.titre} » (${slotLabel(slot)})`
            : `Ajout de « ${prog.titre} » à ${slotLabel(slot)}`;

        if (g.statut === "validee") {
          dd = alerter(dd, `Modification Directeur : ${action}. Action requise dans vMix.`);
        }
        dd = loguer(dd, acteur, `${action} — ${g.nom}`);
        return { g: { ...g, jours, majLe: Date.now() }, d: dd };
      });
      return { ok: true };
    },
    [db.grilles, muterGrille]
  );

  const retirer = useCallback<StudioCtx["retirer"]>(
    (grilleId, jourIdx, blockId, acteur) => {
      muterGrille(grilleId, (g, d) => {
        const bloc = g.jours[jourIdx].find((b) => b.id === blockId);
        if (!bloc) return { g, d };
        const titre = programmeDe(PROGRAMMES, bloc.programmeId)?.titre ?? "programme";
        const jours = g.jours.map((j, i) => (i === jourIdx ? j.filter((b) => b.id !== blockId) : j));
        let dd = { ...d };
        const action = `Retrait de « ${titre} » (${slotLabel(bloc.slot)})`;
        if (g.statut === "validee") dd = alerter(dd, `Modification Directeur : ${action}. Action requise dans vMix.`);
        dd = loguer(dd, acteur, `${action} — ${g.nom}`);
        return { g: { ...g, jours, majLe: Date.now() }, d: dd };
      });
    },
    [muterGrille]
  );

  const publier = useCallback<StudioCtx["publier"]>(
    (grilleId, acteur) => {
      const g = db.grilles.find((x) => x.id === grilleId);
      if (!g) return { ok: false, raison: "Grille introuvable." };
      const trous = g.jours.reduce((s, j) => {
        const occ = new Array<boolean>(SLOTS).fill(false);
        for (const b of j) {
          const p = programmeDe(PROGRAMMES, b.programmeId);
          if (!p) continue;
          for (let k = 0; k < Math.round(p.duree / 30); k++) if (b.slot + k < SLOTS) occ[b.slot + k] = true;
        }
        return s + occ.filter((o) => !o).length;
      }, 0);
      if (trous > 0) return { ok: false, raison: `${trous} créneau(x) de 30 min manquant(s) — complétez la grille avant de publier.` };

      muterGrille(grilleId, (gg, d) => {
        let dd = loguer(d, acteur, `Publication de « ${gg.nom} » — soumise à la validation du Directeur d'Antenne`);
        dd = alerter(dd, `Nouvelle grille soumise : « ${gg.nom} » en attente de validation. Synchronisation vMix à prévoir dès validation.`);
        return { g: { ...gg, statut: "en_attente", majLe: Date.now() }, d: dd };
      });
      return { ok: true };
    },
    [db.grilles, muterGrille]
  );

  const repasserBrouillon = useCallback<StudioCtx["repasserBrouillon"]>(
    (grilleId, acteur) => {
      muterGrille(grilleId, (g, d) => ({
        g: { ...g, statut: "brouillon", majLe: Date.now() },
        d: loguer(d, acteur, `« ${g.nom} » repassée en brouillon`),
      }));
    },
    [muterGrille]
  );

  const valider = useCallback<StudioCtx["valider"]>(
    (grilleId, acteur) => {
      setDb((prev) => {
        const g = prev.grilles.find((x) => x.id === grilleId);
        if (!g) return prev;
        let dd = loguer(prev, acteur, `Validation de « ${g.nom} » — passage à l'antenne`);
        dd = alerter(dd, `Grille validée : « ${g.nom} » passe à l'antenne. Synchronisation vMix automatique — vérifiez la playlist.`);
        return {
          ...dd,
          grilles: prev.grilles.map((x) =>
            x.id === grilleId ? { ...x, statut: "validee", antenne: true, majLe: Date.now() } : { ...x, antenne: false }
          ),
        };
      });
    },
    []
  );

  const renvoyer = useCallback<StudioCtx["renvoyer"]>(
    (grilleId, acteur) => {
      muterGrille(grilleId, (g, d) => ({
        g: { ...g, statut: "brouillon", majLe: Date.now() },
        d: loguer(d, acteur, `Renvoi de « ${g.nom} » en brouillon`),
      }));
    },
    [muterGrille]
  );

  const creerGrille = useCallback<StudioCtx["creerGrille"]>(
    (nom, acteur) => {
      const g: Grille = {
        id: uid("g"),
        nom: nom.trim() || "Nouvelle grille",
        semaine: "À planifier · Balafon TV",
        statut: "brouillon",
        jours: Array.from({ length: 7 }, () => []),
        antenne: false,
        creePar: acteur === "admin" ? "S. Ekotto" : "M. Njoya",
        majLe: Date.now(),
      };
      setDb((prev) => loguer({ ...prev, grilles: [g, ...prev.grilles] }, acteur, `Création de la grille « ${g.nom} »`));
      return g;
    },
    []
  );

  const acquitter = useCallback((alerteId: string) => {
    setDb((prev) => ({
      ...prev,
      alertes: prev.alertes.map((a) => (a.id === alerteId ? { ...a, acquittee: true } : a)),
    }));
  }, []);

  const syncVmix = useCallback(async () => {
    setVmix((v) => ({ ...v, syncing: true }));
    await new Promise((r) => setTimeout(r, 1400));
    setVmix({ syncing: false, lastSync: Date.now() });
    setDb((prev) => loguer(prev, "systeme", "Synchronisation vMix complète — playlist antenne à jour, 0 écart"));
  }, []);

  const grilleAntenne = useMemo(
    () => db.grilles.find((g) => g.antenne) ?? db.grilles.find((g) => g.statut === "validee"),
    [db.grilles]
  );

  const value = useMemo<StudioCtx>(
    () => ({
      db,
      role,
      setRole,
      dragInfo,
      setDragInfo,
      vmix,
      syncVmix,
      grilleAntenne,
      placer,
      retirer,
      publier,
      repasserBrouillon,
      valider,
      renvoyer,
      creerGrille,
      acquitter,
    }),
    [db, role, setRole, dragInfo, vmix, syncVmix, grilleAntenne, placer, retirer, publier, repasserBrouillon, valider, renvoyer, creerGrille, acquitter]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudio(): StudioCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStudio doit être utilisé sous <StudioProvider>");
  return ctx;
}

/** Horloge vivante (playhead, topbar, direct). */
export function useNow(ms = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export { PROGRAMMES };

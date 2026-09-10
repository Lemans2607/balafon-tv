import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  GripVertical,
  Library,
  Loader2,
  Lock,
  Plus,
  Search,
  Send,
  Undo2,
} from "lucide-react";
import type { Categorie, Grille } from "../types";
import { PROGRAMMES } from "../data/mock";
import { CATS, TYPES, finBlocLabel, jourIdxAujourdhui, slotLabel, trousGrille } from "../utils/epg";
import { useStudio } from "../state/store";
import { GoldChip, Modale, OngletsJours, StatutChip, useToast } from "../components/shared";
import { TimelineJour, encoderProgramme, etatJour } from "../components/EpgTimeline";

const FILTRES: (Categorie | "toutes")[] = ["toutes", "information", "divertissement", "sport", "culture", "film", "jeunesse"];

/**
 * Constructeur EPG (Admin) — split-screen :
 * bibliothèque des programmes à gauche, timeline 24h à droite.
 * Le calendrier est placé SOUS la grille pour libérer l'espace principal.
 */
export function AdminBuilder() {
  const { db, placer, publier, repasserBrouillon, creerGrille, setDragInfo, dragInfo } = useStudio();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const brouillons = useMemo(() => db.grilles.filter((g) => g.statut !== "validee"), [db.grilles]);
  const [grilleId, setGrilleId] = useState<string>(() => {
    const demande = params.get("grille");
    if (demande && db.grilles.some((g) => g.id === demande)) return demande;
    return brouillons[0]?.id ?? "";
  });
  const grille = db.grilles.find((g) => g.id === grilleId) ?? brouillons[0];

  const [jourIdx, setJourIdx] = useState(() => jourIdxAujourdhui());
  const [filtre, setFiltre] = useState<Categorie | "toutes">("toutes");
  const [recherche, setRecherche] = useState("");
  const [nouvelle, setNouvelle] = useState(() => params.get("nouvelle") === "1");
  const [nomGrille, setNomGrille] = useState("");
  const [publie, setPublie] = useState(false);

  /* Ouverture automatique de la modale depuis le Dashboard (?nouvelle=1) */
  useEffect(() => {
    if (params.get("nouvelle") === "1") {
      setNouvelle(true);
      params.delete("nouvelle");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const programmes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return PROGRAMMES.filter(
      (p) =>
        (filtre === "toutes" || p.categorie === filtre) &&
        (q === "" || p.titre.toLowerCase().includes(q))
    );
  }, [filtre, recherche]);

  if (!grille) return null;

  const trous = trousGrille(grille, PROGRAMMES);
  const verrouillee = grille.statut === "en_attente";
  const etats = grille.jours.map((j) => etatJour(j));

  const publierMaintenant = async () => {
    setPublie(true);
    await new Promise((r) => setTimeout(r, 800));
    const res = publier(grille.id, "admin");
    setPublie(false);
    if (res.ok) {
      toast.push({ type: "succes", titre: "Grille publiée", message: `« ${grille.nom} » est en attente de validation par le Directeur d'Antenne.` });
    } else {
      toast.push({ type: "erreur", titre: "Publication impossible", message: res.raison });
    }
  };

  const creer = () => {
    if (nomGrille.trim().length < 3) {
      toast.push({ type: "erreur", titre: "Nom trop court", message: "Donnez un nom d'au moins 3 caractères." });
      return;
    }
    const g = creerGrille(nomGrille, "admin");
    setGrilleId(g.id);
    setNouvelle(false);
    setNomGrille("");
    toast.push({ type: "succes", titre: "Grille créée", message: `« ${g.nom} » — glissez vos programmes sur la timeline.` });
  };

  return (
    <div className="px-5 sm:px-7 py-7 max-w-[1400px] mx-auto">
      {/* ——— En-tête ——— */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }} className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[10.5px] font-black uppercase tracking-[0.24em] text-gold">Vue Administrateur</p>
          <h1 className="font-display font-extrabold text-[26px] tracking-tight mt-1.5">Constructeur EPG — Balafon TV</h1>
          <p className="text-[12.5px] text-inkfaint mt-1">
            Glissez un programme depuis la bibliothèque vers la timeline · slots de 30 min, 06:00 → 24:00
          </p>
        </div>
        <button
          onClick={() => setNouvelle(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-pane border border-line hover:border-gold/50 px-4 py-2.5 text-[13px] font-bold text-inksoft hover:text-ink transition-colors"
        >
          <Plus size={16} className="text-gold" /> Créer une grille
        </button>
      </motion.div>

      <div className="grid xl:grid-cols-[330px_1fr] gap-6 items-start">
        {/* ——— Bibliothèque des programmes (source) ——— */}
        <motion.aside
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="glass-pane rounded-xl overflow-hidden xl:sticky xl:top-[86px]"
        >
          <header className="px-4 py-3.5 border-b border-line flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-gold/12 text-gold">
              <Library size={16} />
            </span>
            <div>
              <h2 className="font-display font-bold text-[14px] tracking-tight">Bibliothèque des Programmes</h2>
              <p className="text-[10px] text-inkfaint">Source · glisser vers la timeline</p>
            </div>
          </header>

          <div className="p-3 border-b border-line">
            <label className="relative block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-inkfaint" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un programme…"
                className="w-full rounded-lg bg-night2 border border-line pl-9 pr-3 py-2 text-[12.5px] font-medium placeholder:text-inkfaint focus:border-gold/50 outline-none transition-colors"
                aria-label="Rechercher un programme"
              />
            </label>
            <div className="flex gap-1.5 flex-wrap mt-2.5" role="group" aria-label="Filtrer par catégorie">
              {FILTRES.map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltre(f)}
                  aria-pressed={filtre === f}
                  className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border transition-colors ${
                    filtre === f ? "bg-gold/15 border-gold/50 text-gold" : "border-line text-inkfaint hover:text-ink"
                  }`}
                >
                  {f === "toutes" ? "Toutes" : CATS[f].label}
                </button>
              ))}
            </div>
          </div>

          <ul className="max-h-[560px] overflow-y-auto p-2.5 space-y-2">
            {programmes.map((p) => {
              const cat = CATS[p.categorie];
              const enDrag = dragInfo?.programmeId === p.id && !dragInfo.from;
              return (
                <li key={p.id}>
                  <div
                    draggable
                    onDragStart={(e) => {
                      /* Payload standard : JSON sur text/plain + compat legacy */
                      e.dataTransfer.setData("text/plain", encoderProgramme(p.id, p.duree));
                      e.dataTransfer.setData("text/balafon-program", p.id);
                      e.dataTransfer.effectAllowed = "copy";
                      setDragInfo({ programmeId: p.id, duree: p.duree });
                    }}
                    onDragEnd={() => setDragInfo(null)}
                    className={`group relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-grab active:cursor-grabbing transition-all duration-200 select-none ${
                      enDrag ? "opacity-40 scale-[0.98] border-gold/60" : "border-line bg-night2 hover:border-line2 hover:bg-pane2 hover:-translate-y-[1px] hover:shadow-card"
                    }`}
                    style={{ borderLeft: `3px solid ${cat.color}` }}
                    title="Glisser vers un créneau de la timeline"
                  >
                    <GripVertical size={15} className="text-inkfaint group-hover:text-inksoft flex-none transition-colors" />
                    {p.image && <img src={p.image} alt="" className="w-8 h-11 object-cover rounded flex-none" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-bold truncate">{p.titre}</p>
                      <p className="flex items-center gap-1.5 mt-0.5 text-[10px] text-inkfaint">
                        <span className="font-mono font-semibold tabular-nums" style={{ color: cat.color }}>
                          {p.duree >= 60 ? `${Math.floor(p.duree / 60)}h${p.duree % 60 ? String(p.duree % 60).padStart(2, "0") : ""}` : `${p.duree} min`}
                        </span>
                        · {TYPES[p.type]}
                      </p>
                    </div>
                    <GoldChip label="Disponible" compact />
                  </div>
                </li>
              );
            })}
            {programmes.length === 0 && <li className="text-center text-[12px] text-inkfaint py-8">Aucun programme ne correspond.</li>}
          </ul>
        </motion.aside>

        {/* ——— Timeline EPG (destination) ——— */}
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.06, ease: "easeOut" }} className="min-w-0">
          {/* Barre de grille active */}
          <div className="glass-pane rounded-xl px-4 py-3.5 mb-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2.5 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-inkfaint flex-none">Grille</span>
              <select
                value={grille.id}
                onChange={(e) => setGrilleId(e.target.value)}
                className="bg-night2 border border-line rounded-lg px-3 py-2 text-[13px] font-bold outline-none cursor-pointer max-w-[260px] truncate"
                aria-label="Choisir la grille à éditer"
              >
                {brouillons.map((g) => (
                  <option key={g.id} value={g.id} className="bg-pane">
                    {g.nom}
                  </option>
                ))}
              </select>
            </label>
            <StatutChip statut={grille.statut} />
            <div className="flex-1" />
            <span
              className={`inline-flex items-center gap-1.5 font-mono text-[11.5px] font-bold tabular-nums ${trous > 0 ? "text-bred" : "text-sgreen"}`}
              role="status"
            >
              {trous > 0 ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
              {trous > 0 ? `Grille incomplète — ${trous} trou${trous > 1 ? "s" : ""} détecté${trous > 1 ? "s" : ""}` : "Grille complète"}
            </span>
          </div>

          {verrouillee && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold/30 bg-gold/[0.07] px-4 py-3 animate-fade">
              <Lock size={16} className="text-gold flex-none" />
              <p className="text-[12.5px] text-inksoft flex-1">
                Grille soumise — édition verrouillée en attendant la décision du Directeur d'Antenne.
              </p>
              <button
                onClick={() => {
                  repasserBrouillon(grille.id, "admin");
                  toast.push({ type: "info", titre: "Repassée en brouillon", message: "La grille est de nouveau éditable." });
                }}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-gold hover:underline underline-offset-4"
              >
                <Undo2 size={14} /> Repasser en brouillon
              </button>
            </div>
          )}

          <TimelineJour grilleId={grille.id} jourIdx={jourIdx} mode={verrouillee ? "lecture" : "edit"} acteur="admin" />

          {/* ——— Calendrier (sous la grille) ——— */}
          <div className="mt-4">
            <OngletsJours actif={jourIdx} onChange={setJourIdx} etats={etats} soulignerAujourdhui={jourIdxAujourdhui()} />
          </div>

          {/* ——— Contrôle de complétude + publication ——— */}
          <div className="mt-4 glass-pane rounded-xl px-4 py-3.5 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              {etats.map((e, i) => (
                <button key={i} onClick={() => setJourIdx(i)} className="flex flex-col items-center gap-1 group" aria-label={`Aller à ${["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i]}`}>
                  <span
                    className={`w-7 h-7 rounded-lg grid place-items-center font-mono text-[10px] font-bold transition-colors ${
                      e === "complet"
                        ? "bg-sgreen/12 text-sgreen border border-sgreen/30"
                        : e === "trous"
                        ? "bg-bred/12 text-bred border border-bred/35"
                        : "bg-night2 text-inkfaint border border-line"
                    } ${jourIdx === i ? "ring-2 ring-bred/40" : ""}`}
                  >
                    {e === "complet" ? <CheckCircle2 size={13} /> : e === "trous" ? <AlertTriangle size={12} /> : ["L", "M", "M", "J", "V", "S", "D"][i]}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <span className={`text-[11.5px] font-semibold ${trous > 0 ? "text-bred" : "text-inkfaint"}`}>
                {trous > 0 ? "Complétez les zones hachurées rouges" : "Prête pour la validation éditoriale"}
              </span>
              <button
                onClick={() => void publierMaintenant()}
                disabled={trous > 0 || publie || verrouillee}
                aria-disabled={trous > 0 || verrouillee}
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13.5px] font-bold transition-all duration-200 ${
                  trous > 0 || verrouillee
                    ? "bg-pane2 text-inkfaint/60 cursor-not-allowed border border-line"
                    : "bg-bred hover:bg-bred2 text-white shadow-glow-red active:scale-[0.98]"
                }`}
                title={trous > 0 ? `${trous} créneau(x) manquant(s) — publication bloquée` : "Soumettre au Directeur d'Antenne"}
              >
                {publie ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Publier la Grille
              </button>
            </div>
          </div>
        </motion.section>
      </div>

      {/* ——— Modale nouvelle grille ——— */}
      <Modale
        ouvert={nouvelle}
        onFermer={() => setNouvelle(false)}
        titre="Nouvelle grille EPG"
        sousTitre="Balafon TV — semaine complète, slots de 30 min"
        footer={
          <div className="flex justify-end gap-2.5">
            <button onClick={() => setNouvelle(false)} className="px-4 py-2 rounded-lg border border-line text-[13px] font-semibold text-inksoft hover:bg-pane2 transition-colors">
              Annuler
            </button>
            <button onClick={creer} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-night text-[13px] font-black hover:brightness-110 transition-all active:scale-[0.98]">
              <Plus size={15} /> Créer la grille
            </button>
          </div>
        }
      >
        <label className="block text-[11px] font-bold uppercase tracking-wider text-inkfaint mb-1.5" htmlFor="nom-grille">Nom de la grille</label>
        <input
          id="nom-grille"
          autoFocus
          value={nomGrille}
          onChange={(e) => setNomGrille(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && creer()}
          placeholder="Ex. : Grille Semaine 10 — Spéciale CAN"
          className="w-full rounded-lg bg-night2 border border-line px-3.5 py-2.5 text-[13.5px] font-medium placeholder:text-inkfaint focus:border-gold/60 outline-none transition-colors"
        />
        <p className="text-[11.5px] text-inkfaint mt-3 leading-relaxed">
          La grille démarre vide : chaque jour devra être couvert de 06:00 à 24:00 avant publication.
        </p>
      </Modale>

      {/* Aide contextuelle pendant un drag */}
      {dragInfo && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] toast-dark rounded-full px-5 py-2.5 shadow-pop animate-pop flex items-center gap-2.5">
          <GripVertical size={14} className="text-gold" />
          <p className="text-[12px] font-bold text-white/85">
            Déposez « {PROGRAMMES.find((p) => p.id === dragInfo.programmeId)?.titre} » sur un créneau libre —{" "}
            <span className="font-mono text-gold">{slotLabel(0)} – {finBlocLabel(35, 30)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

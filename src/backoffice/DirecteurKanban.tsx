import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clapperboard,
  History,
  Pencil,
  Radio,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Grille, StatutGrille } from "../types";
import { PROGRAMMES } from "../data/mock";
import { JOURS_COURT, ilYa, trousGrille } from "../utils/epg";
import { useStudio } from "../state/store";
import { ConfirmModal, Modale, OngletsJours, RoleChip, StatutChip, useToast } from "../components/shared";
import { TimelineJour, etatJour } from "../components/EpgTimeline";

const COLONNES: { key: StatutGrille; titre: string; desc: string; dot: string }[] = [
  { key: "brouillon", titre: "Brouillons", desc: "En construction chez l'Admin", dot: "bg-gold" },
  { key: "en_attente", titre: "En attente de validation", desc: "À arbitrer éditorialement", dot: "bg-gold animate-blink-alert" },
  { key: "validee", titre: "Validées pour diffusion", desc: "Miroir antenne + vMix", dot: "bg-sgreen" },
];

export function DirecteurKanban() {
  const { db, valider, renvoyer } = useStudio();
  const toast = useToast();

  const [sel, setSel] = useState<Grille | null>(null);
  const [avertir, setAvertir] = useState<Grille | null>(null);
  const [editer, setEditer] = useState<Grille | null>(null);
  const [jourEd, setJourEd] = useState(0);
  const [busy, setBusy] = useState(false);

  const grilleLive = (id: string) => db.grilles.find((g) => g.id === id) ?? null;
  const selection = sel ? grilleLive(sel.id) : null;

  const parStatut = useMemo(() => {
    const m: Record<StatutGrille, Grille[]> = { brouillon: [], en_attente: [], validee: [] };
    for (const g of db.grilles) m[g.statut].push(g);
    for (const k of Object.keys(m) as StatutGrille[]) m[k].sort((a, b) => b.majLe - a.majLe);
    return m;
  }, [db.grilles]);

  const validerMaintenant = async (g: Grille) => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    valider(g.id, "directeur");
    setBusy(false);
    setSel(null);
    toast.push({ type: "succes", titre: "Grille validée pour diffusion", message: `« ${g.nom} » passe à l'antenne — la Régie et le portail sont mis à jour.` });
  };

  return (
    <div className="px-5 sm:px-7 py-7 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }} className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-black uppercase tracking-[0.24em] text-sgreen">Vue Directeur d'Antenne</p>
          <h1 className="font-display font-extrabold text-[26px] tracking-tight mt-1.5">Validation Éditoriale</h1>
          <p className="text-[12.5px] text-inkfaint mt-1">
            Arbitrez les grilles soumises — la validation passe la grille à l'antenne et notifie la Régie.
          </p>
        </div>
        {/* Accès rapide aux comptes backend (espace Directeur) */}
        <Link
          to="/studio/comptes"
          className="inline-flex items-center gap-2 rounded-lg bg-pane border border-line hover:border-sgreen/50 px-4 py-2.5 text-[13px] font-bold text-inksoft hover:text-ink transition-colors"
        >
          <Users size={15} className="text-sgreen" /> Comptes Studio
        </Link>
      </motion.div>

      {/* ——— Kanban ——— */}
      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {COLONNES.map((col, ci) => {
          const cartes = parStatut[col.key];
          return (
            <motion.section
              key={col.key}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: ci * 0.07, ease: "easeOut" }}
              className="rounded-xl border border-line bg-night2/70 overflow-hidden"
            >
              <header className="px-4 py-3.5 border-b border-line flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full flex-none ${col.dot}`} />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display font-bold text-[13.5px] tracking-tight">{col.titre}</h2>
                  <p className="text-[10px] text-inkfaint">{col.desc}</p>
                </div>
                <span className="font-mono text-[11px] font-bold text-inksoft bg-night border border-line rounded-full px-2 py-0.5 tabular-nums">
                  {cartes.length}
                </span>
              </header>

              <ul className="p-3 space-y-3 min-h-[220px]">
                <AnimatePresence initial={false}>
                  {cartes.map((g) => {
                    const trous = trousGrille(g, PROGRAMMES);
                    return (
                      <motion.li
                        key={g.id}
                        layout
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      >
                        <button
                          onClick={() => setSel(g)}
                          className={`w-full text-left rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop group ${
                            g.statut === "validee"
                              ? "border-sgreen/35 bg-sgreen/[0.05] hover:border-sgreen/60"
                              : g.statut === "en_attente"
                              ? "border-gold/35 bg-gold/[0.05] hover:border-gold/60"
                              : "border-line bg-pane hover:border-line2"
                          } ${g.antenne ? "ring-1 ring-sgreen/40" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-display font-bold text-[14.5px] tracking-tight leading-snug">{g.nom}</h3>
                            {g.antenne && (
                              <span className="flex-none inline-flex items-center gap-1 text-[9px] font-black text-sgreen bg-sgreen/10 border border-sgreen/30 rounded px-1.5 py-0.5">
                                <Radio size={9} /> ANTENNE
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-inkfaint mt-1">{g.semaine}</p>

                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            <span className="font-mono text-[10.5px] font-bold text-inksoft tabular-nums">
                              {g.jours.reduce((s, j) => s + j.length, 0)} programmes
                            </span>
                            {g.statut !== "validee" && (
                              <span className={`font-mono text-[10.5px] font-bold tabular-nums ${trous > 0 ? "text-bred" : "text-sgreen"}`}>
                                {trous > 0 ? `${trous} trous` : "complète"}
                              </span>
                            )}
                            <span className="text-[10.5px] text-inkfaint ml-auto">{ilYa(g.majLe)}</span>
                          </div>

                          {/* Mini-états des jours */}
                          <div className="flex gap-1 mt-3">
                            {g.jours.map((j, i) => {
                              const e = etatJour(j);
                              return (
                                <span
                                  key={i}
                                  title={`${JOURS_COURT[i]} — ${e}`}
                                  className={`flex-1 h-[5px] rounded-full ${
                                    e === "complet" ? "bg-sgreen/70" : e === "trous" ? "bg-bred/80" : "bg-line2/60"
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
                {cartes.length === 0 && (
                  <li className="text-center text-[12px] text-inkfaint py-10 border border-dashed border-line rounded-xl">
                    Aucune grille {col.key === "brouillon" ? "en brouillon" : col.key === "en_attente" ? "en attente" : "validée"}.
                  </li>
                )}
              </ul>
            </motion.section>
          );
        })}
      </div>

      {/* ——— Journal des modifications ——— */}
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }} className="mt-8 glass-pane rounded-xl overflow-hidden">
        <header className="px-5 py-3.5 border-b border-line flex items-center gap-2.5">
          <ScrollText size={16} className="text-gold" />
          <h2 className="font-display font-bold text-[14px] tracking-tight">Journal des modifications</h2>
          <span className="text-[10.5px] text-inkfaint ml-auto font-mono">{db.log.length} entrées · traçabilité complète</span>
        </header>
        <ul className="max-h-[300px] overflow-y-auto p-2">
          {db.log.map((l) => {
            const Icon = l.acteur === "directeur" ? Clapperboard : l.acteur === "admin" ? Pencil : l.acteur === "regie" ? Radio : History;
            const couleur = l.acteur === "directeur" ? "text-sgreen" : l.acteur === "admin" ? "text-gold" : l.acteur === "regie" ? "text-bred" : "text-inkfaint";
            return (
              <li key={l.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-pane2 transition-colors">
                <span className={`grid place-items-center w-8 h-8 rounded-lg bg-night border border-line flex-none ${couleur}`}>
                  <Icon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-snug text-inksoft">{l.action}</p>
                  <p className="font-mono text-[10px] text-inkfaint mt-0.5">{ilYa(l.ts)}</p>
                </div>
                <span className="flex-none">
                  {l.acteur === "systeme" ? (
                    <span className="text-[10px] font-bold text-inkfaint border border-line rounded px-1.5 py-0.5">Système</span>
                  ) : (
                    <RoleChip role={l.acteur} />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </motion.section>

      {/* ——— Fiche grille ——— */}
      <Modale
        ouvert={selection !== null}
        onFermer={() => setSel(null)}
        titre={selection?.nom ?? ""}
        sousTitre={selection ? `${selection.semaine} · créée par ${selection.creePar} · ${ilYa(selection.majLe)}` : undefined}
        largeur="max-w-2xl"
        footer={
          selection && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatutChip statut={selection.statut} />
              <div className="flex items-center gap-2.5">
                {selection.statut === "en_attente" && (
                  <>
                    <button
                      onClick={() => {
                        renvoyer(selection.id, "directeur");
                        setSel(null);
                        toast.push({ type: "info", titre: "Renvoyée en brouillon", message: `« ${selection.nom} » retourne chez l'Administrateur.` });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 text-[13px] font-bold transition-colors"
                    >
                      <ArrowLeft size={15} /> Renvoyer à l'Admin
                    </button>
                    <button
                      onClick={() => void validerMaintenant(selection)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-sgreen text-night text-[13px] font-black hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-60 shadow-glow-green"
                    >
                      {busy ? <span className="w-4 h-4 rounded-full border-2 border-night border-t-transparent animate-spin" /> : <CheckCircle2 size={16} />}
                      Valider pour diffusion
                    </button>
                  </>
                )}
                {selection.statut === "validee" && (
                  <button
                    onClick={() => {
                      setAvertir(selection);
                      setSel(null);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-bred hover:bg-bred2 text-white text-[13px] font-bold shadow-glow-red transition-all active:scale-[0.98]"
                  >
                    <Pencil size={15} /> Modifier la grille validée
                  </button>
                )}
                {selection.statut === "brouillon" && (
                  <p className="text-[12px] text-inkfaint">En construction chez l'Administrateur — sera soumise prochainement.</p>
                )}
              </div>
            </div>
          )
        }
      >
        {selection && (
          <>
            <div className="grid grid-cols-7 gap-1.5">
              {selection.jours.map((j, i) => {
                const e = etatJour(j);
                return (
                  <div key={i} className={`rounded-lg border px-1.5 py-2.5 text-center ${e === "complet" ? "border-sgreen/30 bg-sgreen/[0.05]" : e === "trous" ? "border-bred/35 bg-bred/[0.06]" : "border-line bg-night2"}`}>
                    <p className="text-[10px] font-bold text-inksoft">{JOURS_COURT[i]}</p>
                    <p className={`font-mono text-[12px] font-bold tabular-nums mt-1 ${e === "complet" ? "text-sgreen" : e === "trous" ? "text-bred" : "text-inkfaint"}`}>
                      {j.length}
                    </p>
                    <p className="text-[8px] uppercase font-bold tracking-wide text-inkfaint">{e === "complet" ? "complet" : e === "trous" ? "trous" : "vide"}</p>
                  </div>
                );
              })}
            </div>
            <ul className="mt-4 space-y-1.5 max-h-[220px] overflow-y-auto">
              {selection.jours.flatMap((j, i) =>
                j.map((b) => {
                  const p = PROGRAMMES.find((x) => x.id === b.programmeId);
                  return p ? (
                    <li key={`${i}-${b.id}`} className="flex items-center gap-3 rounded-lg bg-night2 border border-line px-3 py-2">
                      <span className="text-[9.5px] font-bold text-inkfaint w-8 flex-none">{JOURS_COURT[i]}</span>
                      <span className="font-mono text-[11px] font-bold text-inksoft w-[92px] flex-none tabular-nums">
                        {`${String(6 + Math.floor((b.slot * 30) / 60)).padStart(2, "0")}:${String((b.slot * 30) % 60).padStart(2, "0")}`}
                      </span>
                      <span className="text-[12.5px] font-semibold truncate flex-1">{p.titre}</span>
                      <span className="w-2 h-2 rounded-full flex-none" style={{ background: { information: "#3D9BFF", divertissement: "#FF5CA8", sport: "#00D1FF", culture: "#B18CFF", film: "#FF8A3D", jeunesse: "#FFE06B" }[p.categorie] }} />
                    </li>
                  ) : null;
                })
              )}
            </ul>
          </>
        )}
      </Modale>

      {/* ——— Alerte rouge : modification d'une grille validée ——— */}
      <ConfirmModal
        ouvert={avertir !== null}
        titre="Attention — grille déjà validée"
        message={
          <>
            <span className="font-bold text-ink">Cette modification déclenchera une alerte temps réel à la Régie de diffusion.</span>
            <span className="block mt-2">
              « {avertir?.nom} » est actuellement à l'antenne : chaque changement sera journalisé et poussé instantanément vers la console
              d'alertes de la Régie pour action dans vMix.
            </span>
          </>
        }
        confirmLabel="Continuer la modification"
        annulerLabel="Annuler"
        onAnnuler={() => setAvertir(null)}
        onConfirmer={() => {
          if (avertir) {
            setEditer(avertir);
            setJourEd(0);
          }
          setAvertir(null);
        }}
      />

      {/* ——— Éditeur d'une grille validée ——— */}
      <Modale
        ouvert={editer !== null}
        onFermer={() => setEditer(null)}
        titre={`Modification à l'antenne — ${editer?.nom ?? ""}`}
        sousTitre="Directeur d'Antenne · chaque action alerte la Régie en temps réel"
        largeur="max-w-5xl"
      >
        {editer && (
          <>
            <p className="mb-4 flex items-start gap-2.5 text-[12.5px] text-bred bg-bred/10 border border-bred/30 rounded-lg px-3.5 py-3">
              <AlertTriangle size={16} className="mt-0.5 flex-none" />
              Grille en cours de diffusion — les remplacements et retraits sont tracés et notifiés à la Régie (action vMix requise).
            </p>
            <div className="mb-4 flex items-center gap-3">
              <OngletsJours actif={jourEd} onChange={setJourEd} etats={editer.jours.map((j) => etatJour(j))} />
            </div>
            <TimelineJour grilleId={editer.id} jourIdx={jourEd} mode="edit" acteur="directeur" />
            <p className="mt-3 text-[11px] text-inkfaint flex items-center gap-2">
              <ShieldCheck size={13} className="text-sgreen" /> Fin de la double saisie : la Régie lit directement ce miroir, aucune ressaisie de sa part.
            </p>
          </>
        )}
      </Modale>
    </div>
  );
}

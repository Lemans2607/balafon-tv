import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  Cog,
  KanbanSquare,
  LayoutTemplate,
  Plus,
  Radio,
  RefreshCw,
  ScrollText,
} from "lucide-react";
import type { Role } from "../types";
import { PROGRAMMES } from "../data/mock";
import { ROLES, ilYa, toHHMM, trousGrille } from "../utils/epg";
import { useStudio } from "../state/store";
import { RoleChip, StatutChip } from "../components/shared";
import { etatJour } from "../components/EpgTimeline";

const ACCUEIL: Record<Role, { titre: string; pitch: string; cta: string; to: string; Icon: typeof Radio }> = {
  admin: {
    titre: "Construisez la grille de la semaine",
    pitch: "Glissez les programmes de la bibliothèque vers la timeline 24h — le contrôle de complétude bloque la publication tant qu'un trou de 30 min subsiste.",
    cta: "Ouvrir le constructeur EPG",
    to: "/studio/grilles",
    Icon: LayoutTemplate,
  },
  directeur: {
    titre: "Arbitrez les grilles soumises",
    pitch: "Validez pour diffusion, renvoyez en brouillon ou modifiez une grille à l'antenne — chaque action est journalisée et notifiée à la Régie.",
    cta: "Ouvrir la validation éditoriale",
    to: "/studio/directeur",
    Icon: KanbanSquare,
  },
  regie: {
    titre: "Supervisez l'antenne en direct",
    pitch: "Lecture seule du miroir validé, playhead temps réel, alertes à acquitter et synchronisation vMix simulée — zéro double saisie.",
    cta: "Ouvrir la console régie",
    to: "/studio/regie",
    Icon: Radio,
  },
};

export function StudioDashboard() {
  const { db, role, grilleAntenne, vmix } = useStudio();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const trousTotal = db.grilles.reduce((s, g) => s + (g.statut === "validee" ? 0 : trousGrille(g, PROGRAMMES)), 0);
    return {
      enAttente: db.grilles.filter((g) => g.statut === "en_attente").length,
      validees: db.grilles.filter((g) => g.statut === "validee").length,
      brouillons: db.grilles.filter((g) => g.statut === "brouillon").length,
      trous: trousTotal,
      alertes: db.alertes.filter((a) => !a.acquittee).length,
      joursComplets: grilleAntenne ? grilleAntenne.jours.filter((j) => etatJour(j) === "complet").length : 0,
    };
  }, [db, grilleAntenne]);

  if (!role) return null;
  const accueil = ACCUEIL[role];

  const tuiles = [
    { label: "Grille à l'antenne", val: grilleAntenne?.nom ?? "—", sub: grilleAntenne ? "validée · miroir régie + portail" : "aucune grille validée", Icon: Radio, cls: "text-bred", fond: "bg-bred/10" },
    { label: "En attente de validation", val: String(stats.enAttente), sub: "chez le Directeur d'Antenne", Icon: Clapperboard, cls: "text-gold", fond: "bg-gold/10" },
    { label: "Alertes non acquittées", val: String(stats.alertes), sub: "console Régie temps réel", Icon: Bell, cls: stats.alertes > 0 ? "text-bred" : "text-sgreen", fond: stats.alertes > 0 ? "bg-bred/10" : "bg-sgreen/10" },
    { label: "Dernière synchro vMix", val: vmix.lastSync ? toHHMM(new Date(vmix.lastSync).getHours() * 60 + new Date(vmix.lastSync).getMinutes()) : "—", sub: vmix.syncing ? "synchronisation en cours…" : "mode démonstration", Icon: RefreshCw, cls: "text-sgreen", fond: "bg-sgreen/10" },
  ];

  return (
    <div className="px-5 sm:px-7 py-7 max-w-[1400px] mx-auto">
      {/* ——— En-tête ——— */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }} className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[10.5px] font-black uppercase tracking-[0.24em] text-bred">Balafon Studio</p>
          <h1 className="font-display font-extrabold text-[26px] tracking-tight mt-1.5">
            Tableau de bord — <span className="text-inksoft">{ROLES[role].label}</span>
          </h1>
          <p className="text-[12.5px] text-inkfaint mt-1">{stats.brouillons} brouillon{stats.brouillons > 1 ? "s" : ""} · {stats.validees} validée{stats.validees > 1 ? "s" : ""} · {stats.joursComplets}/7 jours complets sur la grille antenne</p>
        </div>
        <RoleChip role={role} />
      </motion.div>

      {/* ——— Bandeau d'action principal ——— */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }}
        className="relative overflow-hidden rounded-xl border border-line glass-pane px-6 py-6 mb-6"
      >
        <div className="absolute inset-0 bg-studio-grid opacity-60 pointer-events-none" aria-hidden="true" />
        <div className="absolute -right-24 -top-24 w-[320px] h-[320px] rounded-full bg-bred/[0.07] blur-[90px] pointer-events-none" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center gap-6">
          <span className="grid place-items-center w-14 h-14 rounded-xl bg-bred/12 text-bred border border-bred/25 flex-none">
            <accueil.Icon size={26} />
          </span>
          <div className="flex-1 min-w-[240px]">
            <h2 className="font-display font-extrabold text-[19px] tracking-tight">{accueil.titre}</h2>
            <p className="text-[13px] text-inksoft mt-1.5 max-w-[640px] leading-relaxed">{accueil.pitch}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {role === "admin" && (
              <button
                onClick={() => navigate("/studio/grilles?nouvelle=1")}
                className="inline-flex items-center gap-2 rounded-lg bg-gold text-night font-black text-[13.5px] px-5 py-2.5 hover:brightness-110 transition-all active:scale-[0.98] shadow-card"
              >
                <Plus size={16} /> Créer une grille
              </button>
            )}
            <button
              onClick={() => navigate(accueil.to)}
              className="inline-flex items-center gap-2 rounded-lg bg-bred hover:bg-bred2 text-white font-bold text-[13.5px] px-5 py-2.5 shadow-glow-red transition-all active:scale-[0.98]"
            >
              {accueil.cta} <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </motion.section>

      {/* ——— Tuiles de statut ——— */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {tuiles.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 + i * 0.06, ease: "easeOut" }}
            className="rounded-xl border border-line glass-pane px-5 py-4 hover:border-line2 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-inkfaint">{t.label}</p>
              <span className={`grid place-items-center w-8 h-8 rounded-lg ${t.fond} ${t.cls}`}>
                <t.Icon size={15} />
              </span>
            </div>
            <p className={`font-display font-extrabold text-[19px] tracking-tight mt-2 truncate ${t.cls}`}>{t.val}</p>
            <p className="text-[11px] text-inkfaint mt-0.5">{t.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mt-6 items-start">
        {/* ——— Grilles ——— */}
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }} className="rounded-xl border border-line glass-pane overflow-hidden">
          <header className="px-5 py-3.5 border-b border-line flex items-center gap-2.5">
            <CalendarDays size={16} className="text-gold" />
            <h2 className="font-display font-bold text-[14px] tracking-tight">Grilles de programmes</h2>
            <Link to="/studio/grilles" className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] font-bold text-bred hover:underline underline-offset-4">
              Constructeur <ArrowRight size={12} />
            </Link>
          </header>
          <ul className="p-2.5 space-y-2">
            {db.grilles.map((g) => {
              const trous = g.statut === "validee" ? 0 : trousGrille(g, PROGRAMMES);
              return (
                <li key={g.id}>
                  <button
                    onClick={() => navigate(role === "directeur" ? "/studio/directeur" : role === "regie" ? "/studio/regie" : `/studio/grilles?grille=${g.id}`)}
                    className="w-full flex flex-wrap items-center gap-3 rounded-lg border border-line bg-night2/60 hover:border-line2 hover:bg-pane2 px-4 py-3 text-left transition-all duration-150 group"
                  >
                    <div className="min-w-[180px] flex-1">
                      <p className="font-display font-bold text-[13.5px] tracking-tight truncate group-hover:text-bred transition-colors">{g.nom}</p>
                      <p className="text-[10.5px] text-inkfaint mt-0.5">
                        {g.semaine} · {g.jours.reduce((s, j) => s + j.length, 0)} programmes · {ilYa(g.majLe)}
                      </p>
                    </div>
                    <span className={`font-mono text-[10.5px] font-bold tabular-nums ${trous > 0 ? "text-bred" : "text-sgreen"}`}>
                      {g.statut === "validee" ? "complète ✓" : trous > 0 ? `${trous} trous` : "complète ✓"}
                    </span>
                    <StatutChip statut={g.statut} compact />
                    {g.antenne && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-sgreen bg-sgreen/10 border border-sgreen/30 rounded px-1.5 py-0.5">
                        <Radio size={9} /> ANTENNE
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.section>

        <div className="space-y-6">
          {/* ——— Alertes récentes ——— */}
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.26, ease: "easeOut" }} className="rounded-xl border border-line glass-pane overflow-hidden">
            <header className="px-5 py-3.5 border-b border-line flex items-center gap-2.5">
              <AlertTriangle size={15} className={stats.alertes > 0 ? "text-bred" : "text-sgreen"} />
              <h2 className="font-display font-bold text-[13.5px] tracking-tight">Alertes récentes</h2>
              <Link to="/studio/regie" className="ml-auto text-[11px] font-bold text-bred hover:underline underline-offset-4">Console</Link>
            </header>
            <ul className="p-2.5 space-y-1.5">
              {db.alertes.slice(0, 4).map((a) => (
                <li key={a.id} className={`rounded-lg border px-3.5 py-2.5 ${a.acquittee ? "border-line opacity-55" : "border-bred/35 bg-bred/[0.05]"}`}>
                  <p className="text-[11.5px] leading-snug text-inksoft line-clamp-2">{a.texte}</p>
                  <p className="font-mono text-[9.5px] text-inkfaint mt-1">{a.heure} · {a.acquittee ? "acquittée" : "action requise"}</p>
                </li>
              ))}
              {db.alertes.length === 0 && <li className="text-center text-[12px] text-inkfaint py-6">Aucune alerte.</li>}
            </ul>
          </motion.section>

          {/* ——— Journal ——— */}
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32, ease: "easeOut" }} className="rounded-xl border border-line glass-pane overflow-hidden">
            <header className="px-5 py-3.5 border-b border-line flex items-center gap-2.5">
              <ScrollText size={15} className="text-gold" />
              <h2 className="font-display font-bold text-[13.5px] tracking-tight">Dernières activités</h2>
              <span className="ml-auto font-mono text-[10px] text-inkfaint">{db.log.length} entrées</span>
            </header>
            <ul className="p-2.5 space-y-1">
              {db.log.slice(0, 5).map((l) => {
                const Icon = l.acteur === "directeur" ? Clapperboard : l.acteur === "admin" ? LayoutTemplate : l.acteur === "regie" ? Radio : Cog;
                const coul = l.acteur === "directeur" ? "text-sgreen" : l.acteur === "admin" ? "text-gold" : l.acteur === "regie" ? "text-bred" : "text-inkfaint";
                return (
                  <li key={l.id} className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-pane2 transition-colors">
                    <Icon size={13} className={`mt-0.5 flex-none ${coul}`} />
                    <p className="text-[11.5px] text-inksoft leading-snug flex-1 line-clamp-2">{l.action}</p>
                    <span className="font-mono text-[9.5px] text-inkfaint flex-none">{ilYa(l.ts)}</span>
                  </li>
                );
              })}
            </ul>
          </motion.section>

          {/* Accès rapide Comptes (Directeur & Admin) */}
          {(role === "directeur" || role === "admin") && (
            <Link to="/studio/comptes" className="block rounded-xl border border-line glass-pane px-5 py-4 hover:border-line2 transition-all group">
              <p className="flex items-center gap-2.5 font-display font-bold text-[13.5px] tracking-tight">
                <CheckCircle2 size={16} className="text-sgreen" /> Comptes Studio
                <ArrowRight size={14} className="ml-auto text-inkfaint group-hover:text-bred group-hover:translate-x-0.5 transition-all" />
              </p>
              <p className="text-[11.5px] text-inkfaint mt-1">Comptes back-office chargés depuis l'API — rôles Django convertis en rôles Studio.</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

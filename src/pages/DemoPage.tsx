import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MonitorPlay, ShieldCheck, Tv, Users } from "lucide-react";

import { useAppStore } from "../store/appStore";
import { BALAFON_LOGO_URI } from "../components/planby/planbyMappers";
import type { AppRole } from "../types";

/* ============================================================
   SÉLECTEUR D'ESPACE — BALAFON + GUIDE
   Le Directeur d'Antenne EST l'administrateur : il gère les comptes
   ET les grilles, et détient le droit exclusif de validation.
   ============================================================ */

const SPACES: Array<{
  role: AppRole;
  to: string;
  title: string;
  user: string;
  desc: string;
  points: string[];
  icon: React.ReactNode;
  accent: string;
}> = [
  {
    role: "public",
    to: "/tv",
    title: "Portail public",
    user: "Téléspectateurs",
    desc: "Le direct, le guide TV et le replay de Balafon TV — la chaîne TV uniquement, sans radio.",
    points: ["Hero du programme à l’antenne", "EPG 7 jours + ligne du direct", "Recherche, fiches & replay"],
    icon: <Tv size={20} />,
    accent: "#E31E24",
  },
  {
    role: "directeur",
    to: "/studio/directeur",
    title: "Direction d’Antenne",
    user: "Martin Essomba",
    desc: "L’administrateur de la plateforme : construit les grilles, gère les comptes de l’équipe et valide seul avant diffusion.",
    points: ["Constructeur EPG drag & drop", "Comptes & équipe", "Validation → portail public"],
    icon: <ShieldCheck size={20} />,
    accent: "#0F6BD6",
  },
  {
    role: "regie",
    to: "/studio/regie",
    title: "Régie · Diffusion",
    user: "Rodrigue Talla",
    desc: "Grille du jour en lecture seule, alertes temps réel à acquitter et synchronisation vMix simulée.",
    points: ["Mission control lecture seule", "Console d’alertes", "Sync vMix (simulation)"],
    icon: <MonitorPlay size={20} />,
    accent: "#00F5A0",
  },
];

export function DemoPage() {
  const setRole = useAppStore((s) => s.setRole);
  const role = useAppStore((s) => s.role);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink-900 glow-balafon grain relative overflow-hidden">
      <div className="bg-grid-faint absolute inset-0" aria-hidden />

      <header className="relative border-b border-ink-800 bg-ink-900/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <img src={BALAFON_LOGO_URI} alt="" className="h-9 w-9 rounded-[9px]" aria-hidden />
          <div>
            <p className="font-display text-[15px] font-black uppercase leading-none tracking-tight text-paper">
              Balafon <span className="text-balafon">+ Guide</span>
            </p>
            <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-mist-dark">
              Pilotage d’antenne · Balafon TV
            </p>
          </div>
          <span className="ml-auto rounded-md bg-ink-800 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-mist">
            Espace actif : {role === "public" ? "portail" : role}
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display max-w-3xl text-[34px] font-black uppercase leading-[0.98] tracking-tight text-paper sm:text-[46px]"
        >
          La grille, du brouillon <span className="text-balafon">à l’antenne</span>
        </motion.h1>
        <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-mist">
          Une seule plateforme pour planifier, valider et diffuser les programmes de Balafon TV.
          Ce que la Direction planifie, elle le valide ; la Régie le diffuse ; le public le regarde.
          Choisissez votre espace — le changement de rôle est instantané.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {SPACES.map((s, i) => (
            <motion.button
              key={s.role}
              type="button"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07 * i, duration: 0.45, ease: "easeOut" }}
              onClick={() => {
                setRole(s.role);
                navigate(s.to);
              }}
              className={`group relative flex flex-col overflow-hidden rounded-xl border p-6 text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_50px_rgba(0,0,0,0.45)] ${
                role === s.role ? "border-balafon/60 bg-ink-800" : "border-ink-700 bg-ink-800/70 hover:border-ink-500"
              }`}
            >
              <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: s.accent }} aria-hidden />
              <div className="flex items-center justify-between">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${s.accent}1e`, color: s.accent }}
                >
                  {s.icon}
                </span>
                <span className="flex items-center gap-1 text-[12px] font-extrabold uppercase tracking-wide text-mist transition-colors group-hover:text-balafon">
                  Entrer <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </div>
              <h2 className="font-display mt-5 text-[19px] font-black uppercase leading-tight tracking-tight text-paper">{s.title}</h2>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest" style={{ color: s.accent }}>
                {s.user}
              </p>
              <p className="mt-3 flex-1 text-[13px] leading-relaxed text-mist">{s.desc}</p>
              <ul className="mt-4 space-y-1.5">
                {s.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-[12px] font-semibold text-mist-dark">
                    <span className="h-1 w-1 rounded-full" style={{ background: s.accent }} aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.button>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-10 flex items-start gap-2 max-w-2xl text-[11.5px] leading-relaxed text-mist-dark"
        >
          <Users size={13} className="mt-0.5 shrink-0 text-balafon" aria-hidden />
          Données de démonstration persistées localement. En production, la plateforme consomme l’API
          Django (PostgreSQL) et le flux WebSocket de la régie — flux vidéo et liaison vMix simulés ici.
        </motion.p>
      </main>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Clapperboard, MonitorPlay, ShieldCheck, Tv } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { BALAFON_LOGO_URI } from "../components/planby/planbyMappers";
import type { AppRole } from "../types";

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
    user: "Téléspectateur",
    desc: "Le direct, le guide TV Planby et le replay de Balafon TV — uniquement la chaîne TV, sans radio.",
    points: ["Hero du programme en direct", "EPG 7 jours + playhead rouge", "Recherche & replay"],
    icon: <Tv size={20} />,
    accent: "#FF3D00",
  },
  {
    role: "admin",
    to: "/studio/admin",
    title: "Admin Antenne",
    user: "Sandra Kamga",
    desc: "Construction de la grille par glisser-déposer sur la timeline Planby, contrôle de complétude, soumission.",
    points: ["Drag & Drop vers les créneaux", "Détection des trous (hachures)", "Publication bloquée si incomplète"],
    icon: <Clapperboard size={20} />,
    accent: "#FFB800",
  },
  {
    role: "directeur",
    to: "/studio/directeur",
    title: "Directeur d’Antenne",
    user: "Martin Essomba",
    desc: "Validation éditoriale en Kanban : brouillons, en attente, validées. Alerte critique si grille validée modifiée.",
    points: ["Kanban de validation", "Validation → portail public", "Modale rouge anti-modification"],
    icon: <ShieldCheck size={20} />,
    accent: "#3B82F6",
  },
  {
    role: "regie",
    to: "/studio/regie",
    title: "Régie · Mission Control",
    user: "Rodrigue Talla",
    desc: "Grille du jour en lecture seule, playhead, alertes temps réel à acquitter, synchronisation vMix simulée.",
    points: ["EPG lecture seule", "Console d’alertes", "Sync vMix (simulation)"],
    icon: <MonitorPlay size={20} />,
    accent: "#00F5A0",
  },
];

export function DemoPage() {
  const setRole = useAppStore((s) => s.setRole);
  const role = useAppStore((s) => s.role);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink-900 bg-grid-faint">
      <header className="border-b border-ink-700 bg-ink-900/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <img src={BALAFON_LOGO_URI} alt="" className="h-9 w-9 rounded-[9px]" aria-hidden />
          <div>
            <p className="font-display text-[15px] font-black uppercase leading-none tracking-tight text-paper">
              Balafon <span className="text-balafon">+ Guide</span>
            </p>
            <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-mist-dark">
              Sélecteur d’espace — démonstration
            </p>
          </div>
          <span className="ml-auto rounded-md bg-ink-700 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-mist">
            Rôle actuel : {role}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display max-w-2xl text-3xl font-black uppercase leading-tight tracking-tight text-paper sm:text-4xl"
        >
          Choisissez votre espace <span className="text-balafon">Studio</span>
        </motion.h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-mist">
          Quatre expériences sur la même plateforme, avec un état partagé et persisté : ce que
          l’Admin planifie, le Directeur le valide, la Régie le diffuse et le public le regarde.
          Le changement de rôle s’effectue sans rechargement.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {SPACES.map((s, i) => (
            <motion.button
              key={s.role}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
              onClick={() => {
                setRole(s.role);
                navigate(s.to);
              }}
              className={`group relative overflow-hidden rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 ${
                role === s.role ? "border-balafon/60 bg-ink-800" : "border-ink-600 bg-ink-800/70 hover:border-ink-500"
              }`}
            >
              <span
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{ background: s.accent }}
                aria-hidden
              />
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${s.accent}1f`, color: s.accent }}>
                  {s.icon}
                </span>
                <span className="flex items-center gap-1 text-[12px] font-extrabold uppercase tracking-wide text-mist transition-colors group-hover:text-paper">
                  Entrer <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </div>
              <h2 className="font-display mt-4 text-[19px] font-extrabold text-paper">{s.title}</h2>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest" style={{ color: s.accent }}>
                {s.user}
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-mist">{s.desc}</p>
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

        <p className="mt-10 max-w-2xl text-[11.5px] leading-relaxed text-mist-dark">
          Données de démonstration persistées localement (localStorage). Flux vidéo, connexion vMix
          et notifications temps réel sont simulés — aucune donnée réelle n’est émise.
        </p>
      </main>
    </div>
  );
}

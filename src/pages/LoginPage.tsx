import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Wifi } from "lucide-react";
import type { z } from "zod";

import { useAuth } from "../context/AuthContext";
import { schemaConnexion } from "../utils/validators";
import { useNow } from "../hooks/useNow";
import { formatClock, todayKey, labelDay } from "../utils/time";
import { BALAFON_LOGO_URI } from "../components/planby/planbyMappers";

/* ============================================================
   CONNEXION — ESPACE STUDIO BALAFON TV
   Panneau gauche : identité d'antenne (horloge, égaliseur).
   Panneau droit : formulaire d'authentification JWT (Zod).
   ============================================================ */
export function LoginPage() {
  const { login, connexionEnCours, erreur, modeApi } = useAuth();
  const navigate = useNavigate();
  const now = useNow(1000);

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreursChamp, setErreursChamp] = useState<Record<string, string>>({});

  const aujourdhui = labelDay(todayKey());

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const resultat = schemaConnexion.safeParse({ email, motDePasse });
    if (!resultat.success) {
      const champs: Record<string, string> = {};
      resultat.error.issues.forEach((issue: z.ZodIssue) => {
        champs[String(issue.path[0])] = issue.message;
      });
      setErreursChamp(champs);
      return;
    }
    setErreursChamp({});
    try {
      await login(email, motDePasse);
      navigate("/studio");
    } catch {
      /* l'erreur globale est affichée via `erreur` */
    }
  };

  return (
    <div className="grid min-h-screen bg-ink-950 text-paper lg:grid-cols-[1.15fr_1fr]">
      {/* ==================== PANNEAU ANTENNE ==================== */}
      <aside className="relative hidden overflow-hidden border-r border-ink-800 lg:flex lg:flex-col lg:justify-between p-10 glow-balafon grain">
        <div className="bg-grid-faint absolute inset-0" aria-hidden />

        <div className="relative flex items-center gap-3">
          <img src={BALAFON_LOGO_URI} alt="" className="h-11 w-11 rounded-xl" aria-hidden />
          <div>
            <p className="font-display text-[19px] font-black uppercase leading-none tracking-tight">
              Balafon <span className="text-balafon">TV</span>
            </p>
            <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.24em] text-mist-dark">
              Régie de diffusion · Douala
            </p>
          </div>
        </div>

        <div className="relative">
          <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-balafon">
            <span className="live-pulse inline-block h-2 w-2 rounded-full bg-balafon" aria-hidden />
            Antenne en direct
          </p>
          <h1 className="font-display mt-4 max-w-md text-[44px] font-black uppercase leading-[0.95] tracking-tightest">
            La grille, du brouillon à l’antenne.
          </h1>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-mist">
            Planification EPG, validation éditoriale et synchronisation vMix — une seule plateforme
            pour la Direction d’Antenne et la régie de Balafon TV.
          </p>

          <div className="mt-8 flex items-end gap-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-mist-dark">{aujourdhui}</p>
              <p className="font-mono text-[56px] font-bold leading-none tabular-nums text-paper">
                {formatClock(now)}
              </p>
              <p className="mt-1 font-mono text-[10.5px] uppercase tracking-widest text-mist-dark">
                Fuseau Africa/Douala · WAT
              </p>
            </div>
            <div className="flex h-14 items-end gap-1.5 pb-1" aria-hidden>
              {[...Array(7)].map((_, i) => (
                <span
                  key={i}
                  className={`w-2.5 rounded-t bg-balafon/80 ${["eq-bar1", "eq-bar2", "eq-bar3"][i % 3]}`}
                  style={{ height: `${25 + ((i * 17) % 60)}%`, animationDelay: `${i * 0.09}s` }}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="relative font-mono text-[10px] uppercase tracking-widest text-mist-dark">
          Balafon Media Group · Douala, Cameroun · {new Date().getFullYear()}
        </p>
      </aside>

      {/* ==================== PANNEAU FORMULAIRE ==================== */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <img src={BALAFON_LOGO_URI} alt="" className="h-10 w-10 rounded-xl" aria-hidden />
            <p className="font-display text-[18px] font-black uppercase tracking-tight">
              Balafon <span className="text-balafon">TV</span>
            </p>
          </div>

          <h2 className="font-display text-[26px] font-black uppercase tracking-tight">Espace Studio</h2>
          <p className="mt-1 text-[13.5px] text-mist">
            {modeApi
              ? "Connectez-vous avec vos identifiants (JWT)."
              : "Mode démonstration — choisissez un espace pour entrer sans compte."}
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
            <Champ id="email" label="Email professionnel" icone={<Mail size={15} />} erreur={erreursChamp.email}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@balafon.media"
                className="w-full bg-transparent text-[14px] text-paper placeholder:text-mist-dark focus:outline-none"
              />
            </Champ>

            <Champ id="motDePasse" label="Mot de passe" icone={<Lock size={15} />} erreur={erreursChamp.motDePasse}>
              <input
                id="motDePasse"
                type="password"
                autoComplete="current-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-[14px] text-paper placeholder:text-mist-dark focus:outline-none"
              />
            </Champ>

            {erreur && (
              <p role="alert" className="rounded-lg border border-crit/40 bg-crit/10 px-3 py-2 text-[12.5px] font-semibold text-crit">
                {erreur}
              </p>
            )}

            <button
              type="submit"
              disabled={connexionEnCours}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-balafon px-5 py-3 text-[14px] font-extrabold text-white shadow-[0_10px_28px_rgba(227,30,36,0.4)] transition-all hover:-translate-y-0.5 hover:bg-balafon-soft active:translate-y-0 disabled:opacity-60"
            >
              {connexionEnCours ? "Connexion…" : "Se connecter"}
              {!connexionEnCours && <ArrowRight size={16} aria-hidden />}
            </button>
          </form>

          <p className="mt-8 flex items-center gap-2 text-[11.5px] text-mist-dark">
            <Wifi size={12} aria-hidden />
            {modeApi
              ? "Backend Django connecté — authentification JWT réelle."
              : "Aucun backend détecté (VITE_API_URL) — les données restent locales."}
            <span aria-hidden>·</span>
            <Link to="/tv" className="font-semibold text-balafon hover:text-balafon-soft">
              Portail public
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

function Champ({
  id,
  label,
  icone,
  erreur,
  children,
}: {
  id: string;
  label: string;
  icone: React.ReactNode;
  erreur?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-mist">
        {label}
      </label>
      <div
        className={`flex items-center gap-2.5 rounded-xl border bg-white/[0.03] px-3.5 py-2.5 transition-colors focus-within:border-balafon/70 ${
          erreur ? "border-crit/60" : "border-ink-700"
        }`}
      >
        <span className="text-mist-dark" aria-hidden>{icone}</span>
        {children}
      </div>
      {erreur && (
        <p role="alert" className="mt-1 text-[11.5px] font-semibold text-crit">
          {erreur}
        </p>
      )}
    </div>
  );
}

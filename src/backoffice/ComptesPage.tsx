import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { KeySquare, Loader2, Mail, Plus, Trash2, Users } from "lucide-react";
import type { Role } from "../types";
import {
  ROLES_DJANGO,
  ajouterCompte,
  convertirRoleDjango,
  listerComptes,
  supprimerCompte,
  type CompteStudio,
  type RoleDjango,
} from "../services/auth";
import { ROLES, ilYa } from "../utils/epg";
import { estEmailValide, estNomValide } from "../utils/validators";
import { useStudio } from "../state/store";
import { ConfirmModal, useToast } from "../components/shared";

/**
 * Comptes Studio — espace Directeur d'Antenne (lecture) & Admin (gestion).
 * Les comptes sont chargés depuis l'API (simulation locale de
 * GET /api/auth/comptes/), puis les rôles Django sont convertis en rôles Studio.
 */
export function ComptesPage() {
  const { role } = useStudio();
  const toast = useToast();

  const [comptes, setComptes] = useState<CompteStudio[] | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [roleDjango, setRoleDjango] = useState<RoleDjango>("technicien");
  const [erreurForm, setErreurForm] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [aSupprimer, setASupprimer] = useState<CompteStudio | null>(null);

  const peutGerer = role === "admin";

  const recharger = async () => {
    setChargement(true);
    setErreurChargement(null);
    try {
      setComptes(await listerComptes());
    } catch {
      setErreurChargement("Impossible de charger les comptes depuis l'API.");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    void recharger();
  }, []);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setErreurForm(null);
    if (!estNomValide(nom)) return setErreurForm("Nom trop court (2 caractères minimum).");
    if (!estEmailValide(email)) return setErreurForm("Adresse email invalide — tous les domaines sont acceptés.");
    setEnvoi(true);
    try {
      const c = await ajouterCompte({ nom, email, roleDjango });
      toast.push({ type: "succes", titre: "Compte créé", message: `${c.nom} — en attente de première connexion.` });
      setNom("");
      setEmail("");
      await recharger();
    } catch (err) {
      setErreurForm(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    try {
      await supprimerCompte(aSupprimer.id);
      toast.push({ type: "info", titre: "Compte supprimé", message: aSupprimer.email });
      setASupprimer(null);
      await recharger();
    } catch (err) {
      toast.push({ type: "erreur", titre: "Suppression impossible", message: err instanceof Error ? err.message : undefined });
    }
  };

  const inputCls =
    "w-full rounded-lg bg-night2 border border-line px-3.5 py-2.5 text-[13px] font-medium text-ink placeholder:text-inkfaint focus:border-sgreen/60 outline-none transition-colors";

  return (
    <div className="px-5 sm:px-7 py-7 max-w-[1100px] mx-auto">
      {/* ——— En-tête (espacé pour éviter tout chevauchement) ——— */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }} className="mb-6">
        <p className="text-[10.5px] font-black uppercase tracking-[0.24em] text-sgreen">Espace Directeur d'Antenne · Admin</p>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-1.5">
          <div>
            <h1 className="font-display font-extrabold text-[26px] tracking-tight flex items-center gap-3">
              <Users size={22} className="text-sgreen" /> Comptes Studio
            </h1>
            <p className="text-[12.5px] text-inkfaint mt-1">
              Source : <span className="font-mono text-[11px]">GET /api/auth/comptes/</span> (simulation locale) — rôles Django convertis en rôles Studio.
            </p>
          </div>
          {peutGerer ? (
            <span className="text-[10.5px] font-bold text-sgreen bg-sgreen/10 border border-sgreen/30 rounded-lg px-2.5 py-1.5">Gestion complète (admin)</span>
          ) : (
            <span className="text-[10.5px] font-bold text-inkfaint border border-line rounded-lg px-2.5 py-1.5">Lecture seule (directeur)</span>
          )}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
        {/* ——— Liste des comptes ——— */}
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.06, ease: "easeOut" }} className="rounded-xl border border-line glass-pane overflow-hidden">
          <header className="px-5 py-3.5 border-b border-line flex items-center gap-2.5">
            <KeySquare size={16} className="text-gold" />
            <h2 className="font-display font-bold text-[14px] tracking-tight">Comptes back-office</h2>
            <span className="ml-auto font-mono text-[10.5px] text-inkfaint">{comptes ? `${comptes.length} comptes` : "…"}</span>
          </header>

          {erreurChargement && (
            <div className="m-4 rounded-lg border border-bred/35 bg-bred/[0.06] px-4 py-3 text-[12.5px] font-semibold text-bred">{erreurChargement}</div>
          )}

          {chargement ? (
            <div className="p-4 space-y-2.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[62px] rounded-lg skeleton" />
              ))}
            </div>
          ) : (
            <ul className="p-3 space-y-2">
              {comptes?.map((c) => {
                const roleStudio = convertirRoleDjango(c.roleDjango);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3.5 rounded-lg border border-line bg-night2/60 px-4 py-3 hover:border-line2 transition-colors">
                    <span className="grid place-items-center w-10 h-10 rounded-full bg-pane2 border border-line font-display font-bold text-[12px] text-inksoft flex-none">
                      {c.nom
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div className="min-w-[180px] flex-1">
                      <p className="text-[13.5px] font-bold truncate">{c.nom}</p>
                      <p className="flex items-center gap-1.5 text-[11px] text-inkfaint mt-0.5">
                        <Mail size={11} /> {c.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-inkfaint">Rôle Django</p>
                      <p className="font-mono text-[11px] font-semibold text-inksoft">{c.roleDjango}</p>
                    </div>
                    <div className="text-right min-w-[110px]">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-inkfaint">Rôle Studio</p>
                      {roleStudio ? (
                        <p className="text-[11.5px] font-bold text-sgreen">{ROLES[roleStudio].label}</p>
                      ) : (
                        <p className="text-[11.5px] font-bold text-inkfaint">— (pas d'accès)</p>
                      )}
                    </div>
                    <span className={`text-[9.5px] font-black uppercase tracking-wide rounded px-1.5 py-0.5 border ${c.actif ? "text-sgreen border-sgreen/35 bg-sgreen/10" : "text-inkfaint border-line bg-pane"}`}>
                      {c.actif ? "Actif" : "Inactif"}
                    </span>
                    <span className="font-mono text-[9.5px] text-inkfaint w-[74px] text-right">{c.dernierAcces ? ilYa(c.dernierAcces) : "jamais"}</span>
                    {peutGerer && (
                      <button
                        onClick={() => setASupprimer(c)}
                        className="grid place-items-center w-8 h-8 rounded-lg border border-line text-inkfaint hover:text-bred hover:border-bred/40 hover:bg-bred/[0.07] transition-colors"
                        aria-label={`Supprimer ${c.nom}`}
                        title="Supprimer le compte"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>

        {/* ——— Création de compte (admin) ——— */}
        <motion.aside initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }} className="rounded-xl border border-line glass-pane overflow-hidden lg:sticky lg:top-[86px]">
          <header className="px-5 py-3.5 border-b border-line">
            <h2 className="font-display font-bold text-[14px] tracking-tight flex items-center gap-2">
              <Plus size={16} className="text-sgreen" /> Nouveau compte
            </h2>
            <p className="text-[11px] text-inkfaint mt-0.5">POST /api/auth/comptes/ — l'email peut être sur n'importe quel domaine.</p>
          </header>

          {!peutGerer ? (
            <p className="px-5 py-8 text-center text-[12.5px] text-inkfaint leading-relaxed">
              Seul un compte <span className="font-bold text-inksoft">administrateur</span> peut créer des accès.
              <br />
              Basculez sur Admin via le switcheur de rôle pour tester.
            </p>
          ) : (
            <form onSubmit={soumettre} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-inkfaint mb-1.5" htmlFor="cpt-nom">Nom complet</label>
                <input id="cpt-nom" className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. : Clarisse Mbarga" />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-inkfaint mb-1.5" htmlFor="cpt-email">Email</label>
                <input id="cpt-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@nimportequel-domaine.cm" />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-inkfaint mb-1.5" htmlFor="cpt-role">Rôle Django</label>
                <select id="cpt-role" className={`${inputCls} cursor-pointer`} value={roleDjango} onChange={(e) => setRoleDjango(e.target.value as RoleDjango)}>
                  {ROLES_DJANGO.map((r) => (
                    <option key={r.value} value={r.value} className="bg-pane">
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10.5px] text-inkfaint mt-1.5">
                  Conversion Studio :{" "}
                  <span className="font-semibold text-sgreen">
                    {(() => {
                      const r = convertirRoleDjango(roleDjango);
                      return r ? (ROLES as Record<Role, { label: string }>)[r].label : "aucun accès Studio";
                    })()}
                  </span>
                </p>
              </div>

              {erreurForm && <p className="text-[12px] font-semibold text-bred">{erreurForm}</p>}

              <button
                type="submit"
                disabled={envoi}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-sgreen text-night font-black text-[13px] py-2.5 hover:brightness-110 transition-all active:scale-[0.99] disabled:opacity-60"
              >
                {envoi ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Créer le compte
              </button>
            </form>
          )}
        </motion.aside>
      </div>

      <ConfirmModal
        ouvert={aSupprimer !== null}
        titre="Supprimer le compte"
        message={
          <>
            Le compte <span className="font-bold text-ink">{aSupprimer?.nom}</span> ({aSupprimer?.email}) perdra immédiatement tout accès au Studio.
          </>
        }
        confirmLabel="Supprimer"
        onAnnuler={() => setASupprimer(null)}
        onConfirmer={() => void supprimer()}
      />
    </div>
  );
}

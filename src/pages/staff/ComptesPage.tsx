import { useMemo, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { motion } from "framer-motion";
import { Mail, ShieldCheck, Trash2, UserCog, UserPlus, UserX } from "lucide-react";
import type { z } from "zod";

import { useAppStore } from "../../store/appStore";
import { useAuth } from "../../context/AuthContext";
import { useScheduleStore } from "../../store/scheduleStore";
import { Badge, Button, EmptyState, Modal } from "../../components/ui";
import { schemaUtilisateur } from "../../utils/validators";
import type { UserRole } from "../../types";

/* ============================================================
   COMPTES & ÉQUIPE — gérés par le Directeur d'Antenne
   (administrateur de la plateforme).

   Deux rôles métier : directeur_antenne / diffuseur.
   Persistés localement ; en production, synchronisés avec
   GET/POST /api/comptes/ (Django, permission EstDirecteurAntenne).
   ============================================================ */

interface Compte {
  id: string;
  nom: string;
  email: string;
  role: UserRole;
  fonction: string;
  actif: boolean;
}

/* Aucun compte fictif : l'équipe se construit avec de vrais comptes. */
const COMPTES_INITIAUX: Compte[] = [];

const ROLE_META: Record<UserRole, { label: string; color: string; soft: string }> = {
  directeur: { label: "Direction d’Antenne", color: "#E31E24", soft: "rgba(227,30,36,0.14)" },
  regie: { label: "Régie · Diffuseur", color: "#0F6BD6", soft: "rgba(15,107,214,0.16)" },
};

interface ComptesState {
  comptes: Compte[];
  ajouter: (c: Omit<Compte, "id">) => void;
  modifier: (id: string, patch: Partial<Compte>) => void;
  supprimer: (id: string) => void;
}

const useComptes = create<ComptesState>()(
  persist(
    (set, get) => ({
      comptes: COMPTES_INITIAUX,
      ajouter: (c) => set({ comptes: [...get().comptes, { ...c, id: `c-${Date.now()}` }] }),
      modifier: (id, patch) =>
        set({ comptes: get().comptes.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
      supprimer: (id) => set({ comptes: get().comptes.filter((x) => x.id !== id) }),
    }),
    { name: "balafon-comptes-v2" }
  )
);

export function ComptesPage() {
  const { role: roleActif } = useAuth();
  const toast = useAppStore((s) => s.toast);
  const addLog = useScheduleStore((s) => s.addLog);
  const { comptes, ajouter, modifier, supprimer } = useComptes();

  const [filtre, setFiltre] = useState<"all" | UserRole>("all");
  const [modal, setModal] = useState<{ ouvert: boolean; edition?: Compte }>({ ouvert: false });
  const [suppression, setSuppression] = useState<Compte | null>(null);

  /* Formulaire */
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("regie");
  const [fonction, setFonction] = useState("");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  const visibles = useMemo(
    () => comptes.filter((c) => filtre === "all" || c.role === filtre),
    [comptes, filtre]
  );

  const ouvrirCreation = () => {
    setNom(""); setEmail(""); setRole("regie"); setFonction(""); setErreurs({});
    setModal({ ouvert: true });
  };
  const ouvrirEdition = (c: Compte) => {
    setNom(c.nom); setEmail(c.email); setRole(c.role); setFonction(c.fonction); setErreurs({});
    setModal({ ouvert: true, edition: c });
  };

  const enregistrer = () => {
    const res = schemaUtilisateur.safeParse({ nom, email, role, fonction });
    if (!res.success) {
      const champs: Record<string, string> = {};
      res.error.issues.forEach((issue: z.ZodIssue) => {
        champs[String(issue.path[0])] = issue.message;
      });
      setErreurs(champs);
      return;
    }
    if (modal.edition) {
      modifier(modal.edition.id, { nom, email, role, fonction });
      toast({ title: "Compte mis à jour", message: `${nom} — ${ROLE_META[role].label}.`, tone: "success" });
      addLog({ user: "Direction d’Antenne", role: "directeur", action: "Modification de compte", details: `Compte de ${nom} (${email}) mis à jour.`, severity: "info" });
    } else {
      ajouter({ nom, email, role, fonction, actif: true });
      toast({ title: "Compte créé", message: `${nom} rejoint l’équipe en tant que ${ROLE_META[role].label}.`, tone: "success" });
      addLog({ user: "Direction d’Antenne", role: "directeur", action: "Création de compte", details: `Compte de ${nom} (${email}) créé — rôle ${ROLE_META[role].label}.`, severity: "info" });
    }
    setModal({ ouvert: false });
  };

  const basculerActif = (c: Compte) => {
    modifier(c.id, { actif: !c.actif });
    toast({
      title: c.actif ? "Compte désactivé" : "Compte réactivé",
      message: `${c.nom} ${c.actif ? "ne peut plus se connecter" : "peut de nouveau se connecter"}.`,
      tone: c.actif ? "warning" : "success",
    });
    addLog({ user: "Direction d’Antenne", role: "directeur", action: c.actif ? "Désactivation de compte" : "Réactivation de compte", details: `Compte de ${c.nom} (${c.email}).`, severity: "warning" });
  };

  const confirmerSuppression = () => {
    if (!suppression) return;
    supprimer(suppression.id);
    toast({ title: "Compte supprimé", message: `${suppression.nom} a été retiré de l’équipe.`, tone: "warning" });
    addLog({ user: "Direction d’Antenne", role: "directeur", action: "Suppression de compte", details: `Compte de ${suppression.nom} (${suppression.email}) supprimé.`, severity: "critical" });
    setSuppression(null);
  };

  const estDirecteur = roleActif === "directeur_antenne";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-lg border border-ink-600">
          {([
            { id: "all", label: "Toute l’équipe" },
            { id: "directeur", label: "Direction" },
            { id: "regie", label: "Régie" },
          ] as const).map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filtre === f.id}
              onClick={() => setFiltre(f.id)}
              className={`px-4 py-2 text-[12.5px] font-extrabold transition-colors ${
                filtre === f.id ? "bg-balafon/15 text-balafon" : "bg-ink-800 text-mist hover:text-paper"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {estDirecteur && (
          <Button className="ml-auto" onClick={ouvrirCreation}>
            <UserPlus size={14} aria-hidden /> Nouveau compte
          </Button>
        )}
      </div>

      <p className="flex items-center gap-2 text-[12px] text-mist-dark">
        <ShieldCheck size={13} className="text-balafon" aria-hidden />
        La gestion des comptes relève du Directeur d’Antenne. En production, ces données vivent dans
        <span className="font-mono text-mist">/api/comptes/</span> (Django) et les comptes réels se créent avec
        <span className="font-mono text-mist">manage.py creer_compte</span>.
      </p>

      {visibles.length === 0 ? (
        <EmptyState
          icon={<UserCog size={32} />}
          title={comptes.length === 0 ? "Aucun compte dans l’équipe" : "Aucun compte pour ce filtre"}
          hint={
            comptes.length === 0
              ? "Créez le premier compte — Direction d’Antenne ou Régie · Diffuseur."
              : "Modifiez le filtre pour voir le reste de l’équipe."
          }
          action={
            estDirecteur && comptes.length === 0 ? (
              <Button onClick={ouvrirCreation}>
                <UserPlus size={14} aria-hidden /> Créer un compte
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {visibles.map((c, i) => {
            const meta = ROLE_META[c.role];
            const initiales = c.nom.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
            return (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex flex-wrap items-center gap-4 rounded-xl border border-ink-700 bg-ink-800/70 p-4 transition-opacity ${c.actif ? "" : "opacity-55"}`}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold"
                  style={{ background: meta.soft, color: meta.color }}
                  aria-hidden
                >
                  {initiales}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-extrabold text-paper">
                    {c.nom}
                    {!c.actif && (
                      <span className="flex items-center gap-1 rounded bg-ink-700 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-mist">
                        <UserX size={9} aria-hidden /> Désactivé
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-mist-dark">
                    <Mail size={11} aria-hidden /> {c.email}
                    {c.fonction && <span aria-hidden>·</span>}
                    <span className="truncate">{c.fonction}</span>
                  </p>
                </div>
                <Badge color={meta.color} soft={meta.soft}>{meta.label}</Badge>
                {estDirecteur && (
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => basculerActif(c)}>
                      {c.actif ? "Désactiver" : "Réactiver"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => ouvrirEdition(c)}>Modifier</Button>
                    <button
                      type="button"
                      onClick={() => setSuppression(c)}
                      aria-label={`Supprimer le compte de ${c.nom}`}
                      className="rounded-lg p-2 text-mist transition-colors hover:bg-crit/15 hover:text-crit"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}

      {/* ---------------- Modale création / édition ---------------- */}
      <Modal
        open={modal.ouvert}
        onClose={() => setModal({ ouvert: false })}
        title={modal.edition ? `Modifier ${modal.edition.nom}` : "Nouveau compte"}
        width="max-w-lg"
      >
        <div className="space-y-4">
          <ChampForm label="Nom complet" erreur={erreurs.nom}>
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. : Aïcha Mbarga" className="input-balafon" />
          </ChampForm>
          <ChampForm label="Email professionnel" erreur={erreurs.email}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="prenom.nom@balafon.media" className="input-balafon" />
          </ChampForm>
          <ChampForm label="Rôle" erreur={erreurs.role}>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="input-balafon">
              {(Object.keys(ROLE_META) as UserRole[]).map((r) => (
                <option key={r} value={r}>{ROLE_META[r].label}</option>
              ))}
            </select>
          </ChampForm>
          <ChampForm label="Fonction / poste" erreur={erreurs.fonction}>
            <input value={fonction} onChange={(e) => setFonction(e.target.value)} placeholder="Ex. : Opérateur régie — poste vMix 2" className="input-balafon" />
          </ChampForm>
          <p className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-[11.5px] leading-relaxed text-mist-dark">
            {role === "directeur"
              ? "Le Directeur d’Antenne gère les comptes ET les grilles, et détient le droit exclusif de validation."
              : "La Régie consulte la grille en lecture seule, acquitte les alertes et synchronise vMix."}
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setModal({ ouvert: false })}>Annuler</Button>
            <Button onClick={enregistrer}>{modal.edition ? "Enregistrer" : "Créer le compte"}</Button>
          </div>
        </div>
      </Modal>

      {/* ---------------- Confirmation suppression ---------------- */}
      <Modal open={suppression !== null} onClose={() => setSuppression(null)} title="Supprimer ce compte ?" tone="critical">
        <p className="text-[13.5px] leading-relaxed text-mist">
          <strong className="text-paper">{suppression?.nom}</strong> ({suppression?.email}) perdra immédiatement
          l’accès à Balafon Studio. Cette action est tracée dans le journal d’audit.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setSuppression(null)}>Annuler</Button>
          <Button variant="danger" onClick={confirmerSuppression}>Supprimer définitivement</Button>
        </div>
      </Modal>
    </div>
  );
}

function ChampForm({ label, erreur, children }: { label: string; erreur?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-mist">{label}</label>
      {children}
      {erreur && <p role="alert" className="mt-1 text-[11.5px] font-semibold text-crit">{erreur}</p>}
    </div>
  );
}

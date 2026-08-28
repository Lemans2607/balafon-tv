import { useState } from "react";
import { Globe2, RefreshCcw, Satellite, UserRound } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useAlertStore } from "../../store/alertStore";
import { useVmixStore, VMIX_STATUS_META } from "../../store/vmixStore";
import { buildSeedData } from "../../data/schedules";
import { USERS } from "../../data/schedules";
import { Badge, Button, Modal, SimClock } from "../../components/ui";

export function SettingsPage() {
  const role = useAppStore((s) => s.role);
  const toast = useAppStore((s) => s.toast);
  const resetAll = useScheduleStore((s) => s.resetAll);
  const setAlerts = useAlertStore((s) => s.setAlerts);
  const vmix = useVmixStore();
  const [confirmReset, setConfirmReset] = useState(false);

  const user = role !== "public" ? USERS[role] : USERS.admin;
  const vMeta = VMIX_STATUS_META[vmix.status];

  const doReset = () => {
    resetAll();
    setAlerts(buildSeedData().alerts);
    setConfirmReset(false);
    toast({ title: "Données réinitialisées", message: "Grilles, programmes, alertes et journaux ont été restaurés à l’état de démonstration.", tone: "success" });
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      <section className="rounded-2xl border border-ink-700 bg-ink-800/70 p-5">
        <h2 className="font-display flex items-center gap-2 text-[15px] font-extrabold text-paper">
          <UserRound size={15} className="text-balafon" aria-hidden /> Profil & rôle
        </h2>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-balafon/20 text-[15px] font-extrabold text-balafon">
            {user.initials}
          </span>
          <div>
            <p className="text-[14.5px] font-extrabold text-paper">{user.name}</p>
            <p className="text-[12px] text-mist-dark">{user.roleLabel}</p>
          </div>
        </div>
        <p className="mt-4 text-[12.5px] leading-relaxed text-mist">
          Les permissions (construction, validation, diffusion) sont appliquées par rôle. Changez de
          rôle depuis <span className="font-bold text-balafon">/demo</span> sans rechargement.
        </p>
      </section>

      <section className="rounded-2xl border border-ink-700 bg-ink-800/70 p-5">
        <h2 className="font-display flex items-center gap-2 text-[15px] font-extrabold text-paper">
          <Globe2 size={15} className="text-studio" aria-hidden /> Fuseau horaire
        </h2>
        <dl className="mt-4 space-y-2 text-[13px]">
          <div className="flex justify-between rounded-lg bg-ink-900 px-3 py-2">
            <dt className="text-mist">Fuseau de référence</dt>
            <dd className="font-mono font-bold text-paper">Africa/Douala (WAT)</dd>
          </div>
          <div className="flex justify-between rounded-lg bg-ink-900 px-3 py-2">
            <dt className="text-mist">Décalage UTC</dt>
            <dd className="font-mono font-bold text-paper">UTC+1 · sans heure d’été</dd>
          </div>
          <div className="flex justify-between rounded-lg bg-ink-900 px-3 py-2">
            <dt className="text-mist">Fenêtre d’antenne</dt>
            <dd className="font-mono font-bold text-paper">06:00 → 24:00</dd>
          </div>
        </dl>
        <p className="mt-3 text-[11.5px] leading-relaxed text-mist-dark">
          Les horaires EPG sont stockés en ISO local et convertis dans le fuseau du navigateur de
          démonstration ; la production utilisera Africa/Douala côté serveur (Django + PostgreSQL).
        </p>
      </section>

      <section className="rounded-2xl border border-ink-700 bg-ink-800/70 p-5 md:col-span-2">
        <h2 className="font-display flex items-center gap-2 text-[15px] font-extrabold text-paper">
          <Satellite size={15} className="text-goldwarn" aria-hidden /> Intégration vMix — architecture prévue
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <Badge color={vMeta.color} soft={`${vMeta.color}22`}>{vMeta.label}</Badge>
              <span className="font-mono text-[11px] text-mist-dark">
                Dernière synchro : {vmix.lastSync ? vmix.lastSync.slice(0, 16).replace("T", " ") : "—"}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              {vmix.status === "disconnected" ? (
                <Button variant="outline" size="sm" onClick={vmix.connect}>Connecter (simulation)</Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={vmix.disconnect}>Déconnecter</Button>
              )}
              <Button size="sm" onClick={() => vmix.syncSchedule()} disabled={vmix.status === "disconnected"}>
                Synchroniser la grille
              </Button>
            </div>
            <p className="mt-3 rounded-lg border border-goldwarn/40 bg-goldwarn/8 px-3 py-2 text-[11px] font-bold text-goldwarn">
              Mode démonstration — connexion vMix simulée. Rien n’est envoyé à un vrai serveur.
            </p>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-ink-600 bg-ink-950 p-4 font-mono text-[11px] leading-relaxed text-mist">
{`// Façade prête pour l'intégration réelle
connectToVmix()            // WS  ws://regie.balafon.tv:8888
getVmixStatus()            // GET /api/vmix/status
syncScheduleWithVmix()     // POST /api/vmix/sync  {date, items[]}
sendScheduleChangeToVmix() // POST /api/vmix/changes
acknowledgeVmixAlert()     // POST /api/vmix/changes/:id/ack`}
          </pre>
        </div>
      </section>

      <section className="rounded-2xl border border-crit/40 bg-crit/5 p-5 md:col-span-2">
        <h2 className="font-display text-[15px] font-extrabold text-crit">Zone sensible — données de démonstration</h2>
        <p className="mt-2 text-[12.5px] text-mist">
          Restaure les grilles, programmes, alertes et journaux d’origine (les données saisies localement seront perdues).
        </p>
        <Button variant="danger" className="mt-4" onClick={() => setConfirmReset(true)}>
          <RefreshCcw size={13} aria-hidden /> Réinitialiser les données
        </Button>
      </section>

      <div className="md:col-span-2">
        <SimClock />
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Réinitialiser les données de démonstration ?" tone="critical">
        <p className="text-[13.5px] leading-relaxed text-mist">
          Toutes les modifications locales (grilles, programmes ajoutés, alertes acquittées, journaux)
          seront remplacées par le jeu de données d’origine.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>Annuler</Button>
          <Button variant="danger" onClick={doReset}>Oui, réinitialiser</Button>
        </div>
      </Modal>
    </div>
  );
}

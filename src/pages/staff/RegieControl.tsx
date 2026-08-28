import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertOctagon,
  ArrowLeft,
  ArrowRight,
  Lock,
  RefreshCw,
  Satellite,
  ShieldCheck,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { useAlertStore } from "../../store/alertStore";
import { useVmixStore, VMIX_STATUS_META } from "../../store/vmixStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useAppStore } from "../../store/appStore";
import { useCurrentProgram, useNow } from "../../hooks/useNow";
import { dateKey, formatHM, sinceISO, tillISO } from "../../utils/time";
import { BalafonEpg } from "../../components/planby/BalafonEpg";
import type { PlanbyEpgData } from "../../components/planby/planbyMappers";
import { AlertCard } from "../../components/alerts/AlertCard";
import { Badge, Button, Modal, ProgressBar, SimClock } from "../../components/ui";
import { ProgramPoster } from "../../components/media/ProgramPoster";
import { CATEGORY_META } from "../../types";
import { USERS } from "../../data/schedules";

/* ============================================================
   RÉGIE — Mission Control (lecture seule)
   ============================================================ */
export function RegieControl() {
  const now = useNow(1000);
  const today = dateKey(now);
  const toast = useAppStore((s) => s.toast);
  const live = useCurrentProgram(today, now);
  const alerts = useAlertStore((s) => s.alerts);
  const acknowledge = useAlertStore((s) => s.acknowledge);
  const addAlert = useAlertStore((s) => s.addAlert);
  const addLog = useScheduleStore((s) => s.addLog);
  const vmix = useVmixStore();
  const [detail, setDetail] = useState<PlanbyEpgData | null>(null);
  const [syncing, setSyncing] = useState(false);

  const user = USERS.regie;
  const unacked = alerts.filter((a) => !a.acknowledged);
  const acked = alerts.filter((a) => a.acknowledged).slice(0, 5);
  const vMeta = VMIX_STATUS_META[vmix.status];

  const onAck = (id: string) => {
    acknowledge(id, user.name);
    addLog({ user: user.name, role: "regie", action: "Acquittement d’alerte", details: `Alerte ${id} acquittée en régie.`, severity: "info" });
    toast({ title: "Alerte acquittée", message: "L’alerte reste consultable dans l’historique.", tone: "success" });
  };

  const sync = async () => {
    setSyncing(true);
    const ok = await vmix.syncSchedule();
    setSyncing(false);
    toast(
      ok
        ? { title: "Synchronisation vMix réussie", message: "Grille du jour transmise à vMix (simulation).", tone: "success" }
        : { title: "Échec de synchronisation", message: "La liaison simulée a échoué — nouvelle tentative possible.", tone: "error" }
    );
  };

  const simulateChange = () => {
    addAlert({
      severity: "critical",
      title: "Modification Directeur — grille du jour",
      message: `18:45 — Remplacement de « Le Journal du Soir »\npar « Documentaire Afrique ».\n\nAction requise dans vMix.`,
      source: "director",
      actionRequired: true,
      relatedScheduleId: today,
    });
    vmix.sendChange("Remplacement « Le Journal du Soir » → « Documentaire Afrique » (18:45)");
    addLog({ user: USERS.directeur.name, role: "directeur", action: "Modification de grille validée (simulation)", details: `Remplacement Journal du Soir → Documentaire Afrique sur la grille du ${today}.`, severity: "critical", date: today });
    toast({ title: "Alerte critique reçue", message: "La console d’alertes a été mise à jour — acquittement requis.", tone: "error" });
  };

  const programs = useScheduleStore((s) => s.programs);
  const prevProgram = live.previous ? programs.find((p) => p.id === live.previous!.programId) ?? null : null;

  const SlotCard = ({
    label,
    title,
    time,
    color,
    progress,
    live: isLive,
    category,
  }: {
    label: string;
    title: string;
    time?: string;
    color: string;
    progress?: number;
    live?: boolean;
    category?: keyof typeof CATEGORY_META;
  }) => (
    <div className="relative overflow-hidden rounded-2xl border border-ink-700 bg-ink-800 p-4">
      <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: color }} aria-hidden />
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-mist-dark">{label}</p>
      <p className="mt-1.5 truncate font-display text-[15px] font-extrabold text-paper">{title}</p>
      <div className="mt-1 flex items-center gap-2">
        {time && <span className="font-mono text-[11.5px] tabular-nums text-mist">{time}</span>}
        {category && (
          <span className="rounded-sm px-1.5 py-px text-[9px] font-extrabold uppercase" style={{ background: CATEGORY_META[category].soft, color: CATEGORY_META[category].color }}>
            {CATEGORY_META[category].label}
          </span>
        )}
        {isLive && (
          <span className="live-pulse rounded bg-balafon px-1.5 py-px text-[9px] font-extrabold uppercase text-white">Live</span>
        )}
      </div>
      {typeof progress === "number" && (
        <div className="mt-2.5">
          <ProgressBar value={progress} />
        </div>
      )}
    </div>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_350px]">
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge color="#00F5A0" soft="rgba(0,245,160,0.12)">
            <Lock size={10} /> Lecture seule
          </Badge>
          <p className="text-[12.5px] text-mist">
            Grille du <strong className="text-paper">{today}</strong> — la régie ne peut ni déplacer, ni modifier, ni publier.
          </p>
          <span
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-800 px-3 py-1.5 text-[11.5px] font-bold"
            style={{ color: vMeta.color }}
          >
            {vmix.status === "disconnected" ? <WifiOff size={12} aria-hidden /> : <Wifi size={12} aria-hidden />}
            vMix · {vMeta.label}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SlotCard
            label="Précédent"
            title={prevProgram?.title ?? "—"}
            color="#6B7280"
            time={live.previous ? `${live.previous.startTime} – ${live.previous.endTime}` : undefined}
            category={prevProgram?.category}
          />
          <SlotCard
            label="En cours"
            title={live.currentProgram ? live.currentProgram.title : "Hors antenne"}
            color="#FF3D00"
            time={live.current ? `${live.current.startTime} – ${live.current.endTime}` : "00:00 – 06:00"}
            progress={live.currentProgram && live.currentProgram.category !== "off-air" ? live.progress : undefined}
            live={live.currentProgram !== null && live.currentProgram.category !== "off-air"}
            category={live.currentProgram?.category}
          />
          <SlotCard
            label="Suivant"
            title={live.nextProgram ? live.nextProgram.title : "Fin d’antenne"}
            color="#3B82F6"
            time={live.next ? `${live.next.startTime} – ${live.next.endTime}` : undefined}
            category={live.nextProgram?.category}
          />
        </div>

        <div className="rounded-2xl border border-ink-700 bg-ink-800/60 p-4">
          <BalafonEpg date={today} mode="regie" now={now} heightPx={240} onSelectItem={setDetail} />
        </div>

        {/* Console vMix simulée */}
        <div className="rounded-2xl border border-ink-700 bg-ink-800/70 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display flex items-center gap-2 text-[15px] font-extrabold text-paper">
              <Satellite size={15} className="text-studio" aria-hidden /> Liaison vMix
            </h2>
            <Badge color={vMeta.color} soft={`${vMeta.color}22`}>{vMeta.label}</Badge>
            <span className="ml-auto font-mono text-[11px] text-mist-dark">
              Dernière synchro : {vmix.lastSync ? formatTime(vmix.lastSync) : "jamais"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {vmix.status === "disconnected" ? (
              <Button variant="outline" onClick={vmix.connect}><Wifi size={13} aria-hidden /> Connecter à vMix</Button>
            ) : (
              <Button variant="ghost" onClick={vmix.disconnect}><WifiOff size={13} aria-hidden /> Déconnecter</Button>
            )}
            <Button onClick={sync} disabled={syncing || vmix.status === "disconnected"}>
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} aria-hidden /> Synchroniser avec vMix
            </Button>
            <Button variant="gold" onClick={simulateChange}>
              <Zap size={13} aria-hidden /> Simuler une modification
            </Button>
          </div>
          {vmix.pendingChanges.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {vmix.pendingChanges.map((c, i) => (
                <li key={`${c}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-goldwarn/40 bg-goldwarn/8 px-3 py-2">
                  <span className="text-[12px] font-semibold text-goldwarn">{c}</span>
                  <Button size="sm" variant="ghost" onClick={() => vmix.acknowledgeChange(i)}>Acquitter</Button>
                </li>
              ))}
            </ul>
          )}
          {vmix.events.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-[11.5px] font-bold text-mist">Journal de liaison ({vmix.events.length})</summary>
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto font-mono text-[10.5px] text-mist-dark">
                {vmix.events.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
          <p className="mt-4 rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-[11px] font-semibold text-goldwarn">
            Mode démonstration — connexion vMix simulée. Aucune liaison réelle n’est établie.
          </p>
        </div>

        <SimClock compact />
      </div>

      {/* ===== Console d'alertes ===== */}
      <aside className="space-y-4" aria-label="Console d’alertes régie">
        <div className="rounded-2xl border border-ink-700 bg-ink-800/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2 text-[15px] font-extrabold text-paper">
              <AlertOctagon size={15} className="text-crit" aria-hidden /> Alertes actives
            </h2>
            <span className="rounded-full bg-crit/15 px-2 py-0.5 font-mono text-[11px] font-bold text-crit">{unacked.length}</span>
          </div>
          <div className="space-y-3">
            {unacked.length === 0 && (
              <p className="flex items-center gap-2 rounded-xl border border-studio/30 bg-studio/5 px-3 py-4 text-[12.5px] font-semibold text-studio">
                <ShieldCheck size={15} aria-hidden /> Aucune alerte active — antenne nominale.
              </p>
            )}
            {unacked
              .slice()
              .sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1))
              .map((a) => (
                <AlertCard key={a.id} alert={a} onAcknowledge={onAck} />
              ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ink-700 bg-ink-800/70 p-4">
          <h2 className="font-display mb-3 text-[14px] font-extrabold text-paper">Historique récent</h2>
          <div className="space-y-3">
            {acked.length === 0 && <p className="text-[12px] text-mist-dark">Aucune alerte acquittée.</p>}
            {acked.map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </div>
        </div>
      </aside>

      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.title ?? ""}>
        {detail && (
          <div>
            <div className="flex items-center gap-2">
              <Badge color={CATEGORY_META[detail.category].color} soft={CATEGORY_META[detail.category].soft}>
                {CATEGORY_META[detail.category].label}
              </Badge>
              <span className="font-mono text-[12.5px] tabular-nums text-mist">
                {formatHM(detail.since)} – {formatHM(detail.till)}
              </span>
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-mist">{detail.description || "Pas de description."}</p>
            {detail.isRerun && (
              <p className="mt-3 flex items-center gap-2 text-[12px] font-bold text-goldwarn">
                <ArrowLeft size={12} aria-hidden /> Rediffusion — seconde fenêtre de diffusion.
              </p>
            )}
            <p className="mt-4 flex items-center gap-2 text-[11px] text-mist-dark">
              <Lock size={11} aria-hidden /> Consultation seule — toute modification passe par l’Admin et la validation du Directeur.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function formatTime(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

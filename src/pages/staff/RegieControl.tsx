import { useState } from "react";
import {
  Activity,
  AlertOctagon,
  ArrowLeft,
  Lock,
  Maximize2,
  Minimize2,
  Moon,
  Radio,
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
import { useGrilleQuery } from "../../hooks/useGrilleQuery";
import { useFullscreen } from "../../hooks/useFullscreen";
import { GrilleGantt } from "../../components/charts/GrilleGantt";
import { dateKey, formatClock, labelDay } from "../../utils/time";
import { BalafonEpg } from "../../components/planby/BalafonEpg";
import type { PlanbyEpgData } from "../../components/planby/planbyMappers";
import { AlertCard } from "../../components/alerts/AlertCard";
import { Badge, Button, Modal, ProgressBar, SimClock } from "../../components/ui";
import { ProgramPoster } from "../../components/media/ProgramPoster";
import { CATEGORY_META, type Program } from "../../types";
import { synopsisDe } from "../../data/synopses";
import { USERS } from "../../data/schedules";

const VMIX_ENDPOINT = "http://127.0.0.1:8088/api";

/* ============================================================
   RÉGIE — POSTE DE DIFFUSION & RÉGIE vMix (lecture seule)
   Moniteur 1 = PGM (à l'antenne) · Moniteur 2 = PVW (à suivre)
   ============================================================ */
export function RegieControl() {
  const now = useNow(1000);
  const today = dateKey(now);
  const toast = useAppStore((s) => s.toast);
  const live = useCurrentProgram(today, now);
  const alerts = useAlertStore((s) => s.alerts);
  const acknowledge = useAlertStore((s) => s.acknowledge);
  const addAlert = useAlertStore((s) => s.addAlert);
  const programs = useScheduleStore((s) => s.programs);
  const addLog = useScheduleStore((s) => s.addLog);
  const vmix = useVmixStore();
  const grilleQuery = useGrilleQuery();
  const { ref: monitorsRef, isFullscreen, toggle } = useFullscreen<HTMLDivElement>();

  const [detail, setDetail] = useState<PlanbyEpgData | null>(null);
  const [syncing, setSyncing] = useState(false);

  const user = USERS.regie;
  const unacked = alerts.filter((a) => !a.acknowledged);
  const acked = alerts.filter((a) => a.acknowledged).slice(0, 5);
  const vMeta = VMIX_STATUS_META[vmix.status];
  const vmixConnecte = vmix.status === "synced" || vmix.status === "syncing";

  const currentProgram = live.currentProgram ?? null;
  const isOnAir = currentProgram !== null && currentProgram.category !== "off-air";
  const nextProgram = live.nextProgram ?? null;

  const onAck = (id: string) => {
    acknowledge(id, user.name);
    addLog({ user: user.name, role: "regie", action: "Acquittement d'alerte", details: `Alerte ${id} acquittée en régie.`, severity: "info" });
    toast({ title: "Alerte acquittée", message: "L'alerte reste consultable dans l'historique.", tone: "success" });
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
      message: `18:45 — Remplacement de « Faut Pas Zapper »\npar « C'le Weekend » (édition spéciale).\n\nAction requise dans vMix.`,
      source: "director",
      actionRequired: true,
      relatedScheduleId: today,
    });
    vmix.sendChange("Remplacement « Faut Pas Zapper » → « C'le Weekend » (18:45)");
    addLog({ user: USERS.directeur.name, role: "directeur", action: "Modification de grille validée (simulation)", details: `Remplacement Faut Pas Zapper → C'le Weekend sur la grille du ${today}.`, severity: "critical", date: today });
    toast({ title: "Alerte critique reçue", message: "La console d'alertes a été mise à jour — acquittement requis.", tone: "error" });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_350px]">
      <div className="min-w-0 space-y-5">
        {/* ===================== BANDEAU RÉGIE MASTER ===================== */}
        <div className="panel flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-mist-dark">
              Poste de Diffusion & Régie vMix
            </p>
            <p className="font-display mt-0.5 text-[26px] uppercase leading-none tracking-wide text-paper">
              Régie Master <span className="text-balafon">Balafon TV</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[11.5px] font-bold uppercase tracking-wider ${
                vmixConnecte ? "border-studio/50 bg-studio/10 text-studio" : "border-crit/50 bg-crit/10 text-crit"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${vmixConnecte ? "soft-blink bg-studio" : "bg-crit"}`} aria-hidden />
              {vmixConnecte ? "vMix Master Connecté" : "vMix Déconnecté"}
            </span>
            {grilleQuery.depuisCache && (
              <Badge color="#FFB800" soft="rgba(255,184,0,0.14)">Hors-ligne — grille en cache</Badge>
            )}
            <Badge color="#00F5A0" soft="rgba(0,245,160,0.12)">
              <Lock size={10} aria-hidden /> Lecture seule
            </Badge>
          </div>

          <div className="ml-auto flex items-center gap-5">
            <div className="text-right">
              <p className="font-mono text-[38px] font-bold leading-none tabular-nums text-paper">
                {formatClock(now)}
              </p>
              <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.24em] text-mist-dark">
                Heure Antenne UTC+1 · {labelDay(today)}
              </p>
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-label={isFullscreen ? "Quitter le plein écran" : "Passer les moniteurs en plein écran"}
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
              className="rounded-lg border border-ink-600 bg-ink-800 p-2.5 text-mist transition-colors hover:border-balafon/60 hover:text-balafon"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* ===================== DOUBLE MONITEUR PGM / PVW ===================== */}
        <div ref={monitorsRef} className={`grid gap-4 md:grid-cols-2 ${isFullscreen ? "content-start overflow-y-auto bg-ink-950 p-5" : ""}`}>
          <Moniteur
            numero={1}
            entete="Programme Actuel à l'Antenne"
            badge={isOnAir ? "EN DIRECT (PGM)" : "HORS ANTENNE"}
            badgeColor={isOnAir ? "#E31E24" : "#3a4256"}
            pulse={isOnAir}
            item={live.current}
            program={isOnAir ? currentProgram : null}
            fallbackTitle="Aucune diffusion"
            fallbackDesc="L'antenne reprend à 06:00. Conducteur nuit : continuité automatique."
            fallbackCredits="Régie : conduite automatisée"
            progress={isOnAir ? live.progress : undefined}
          />
          <Moniteur
            numero={2}
            entete="Programme Suivant (Preview)"
            badge={nextProgram ? "À SUIVRE (PVW)" : "FIN DE GRILLE"}
            badgeColor={nextProgram ? "#0F6BD6" : "#3a4256"}
            item={live.next}
            program={nextProgram}
            fallbackTitle="Fin de conduite"
            fallbackDesc="Aucun programme suivant sur la grille validée du jour."
            fallbackCredits="Régie : reprise à 06:00"
          />

          {/* Endpoint vMix — pied des moniteurs */}
          <div className="panel flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 md:col-span-2">
            <p className="font-mono text-[11.5px] text-mist">
              <span className="font-bold uppercase tracking-[0.2em] text-mist-dark">Endpoint vMix :</span>{" "}
              <span className="select-all rounded bg-ink-900 px-2 py-1 text-ocean-soft">{VMIX_ENDPOINT}</span>
            </p>
            <p className="ml-auto flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-goldwarn">
              <Radio size={11} aria-hidden /> Mode démonstration — connexion simulée
            </p>
          </div>
        </div>

        {/* ===================== GRILLE DU JOUR (EPG) ===================== */}
        <div className="rounded-2xl border border-ink-700 bg-ink-800/60 p-4">
          <BalafonEpg date={today} mode="regie" now={now} heightPx={240} onSelectItem={setDetail} />
        </div>

        {/* ===================== TIMELINE GANTT ===================== */}
        <section className="panel p-5" aria-label="Timeline de la journée">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display flex items-center gap-2 text-[20px] uppercase tracking-wide text-paper">
              <Activity size={16} className="text-balafon" aria-hidden /> Timeline de la journée
            </h2>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-mist-dark">
              06:00 → 24:00 · couleur = catégorie
            </p>
          </div>
          <GrilleGantt date={today} now={now} />
        </section>

        {/* ===================== LIAISON vMix ===================== */}
        <div className="rounded-2xl border border-ink-700 bg-ink-800/70 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display flex items-center gap-2 text-[15px] font-extrabold text-paper">
              <Satellite size={15} className="text-studio" aria-hidden /> Liaison vMix
            </h2>
            <Badge color={vMeta.color} soft={`${vMeta.color}22`}>{vMeta.label}</Badge>
            <span className="ml-auto font-mono text-[11px] text-mist-dark">
              Dernière synchro : {vmix.lastSync ? vmix.lastSync.slice(0, 16).replace("T", " ") : "jamais"}
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
            Mode démonstration — connexion vMix simulée. Aucune liaison réelle n'est établie.
          </p>
        </div>

        <SimClock compact />
      </div>

      {/* ===================== CONSOLE D'ALERTES ===================== */}
      <aside className="space-y-4" aria-label="Console d'alertes régie">
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

      {/* ===================== FICHE PROGRAMME ===================== */}
      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.title ?? ""}>
        {detail && (
          <div>
            <div className="flex items-center gap-2">
              <Badge color={CATEGORY_META[detail.category].color} soft={CATEGORY_META[detail.category].soft}>
                {CATEGORY_META[detail.category].label}
              </Badge>
              <span className="font-mono text-[12.5px] tabular-nums text-mist">
                {detail.since.slice(11, 16)} – {detail.till.slice(11, 16)}
              </span>
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-mist">{detail.description || "Pas de description."}</p>
            {detail.isRerun && (
              <p className="mt-3 flex items-center gap-2 text-[12px] font-bold text-goldwarn">
                <ArrowLeft size={12} aria-hidden /> Rediffusion — seconde fenêtre de diffusion.
              </p>
            )}
            <p className="mt-4 flex items-center gap-2 text-[11px] text-mist-dark">
              <Lock size={11} aria-hidden /> Consultation seule — toute modification passe par l'Admin et la validation du Directeur.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================================================
   MONITEUR — écran PGM (rouge) ou PVW (bleu) façon régie réelle
   ============================================================ */
function Moniteur({
  numero,
  entete,
  badge,
  badgeColor,
  pulse,
  item,
  program,
  fallbackTitle,
  fallbackDesc,
  fallbackCredits,
  progress,
}: {
  numero: number;
  entete: string;
  badge: string;
  badgeColor: string;
  pulse?: boolean;
  item: { startTime: string; endTime: string } | null;
  program: Program | null;
  fallbackTitle: string;
  fallbackDesc: string;
  fallbackCredits: string;
  progress?: number;
}) {
  const meta = program ? CATEGORY_META[program.category] : null;
  const synopsis = program ? synopsisDe(program.id) : null;
  const enDirect = Boolean(pulse);

  return (
    <section
      className={`panel sheen overflow-hidden ${
        enDirect
          ? "border-balafon/60 shadow-[0_0_0_1px_rgba(227,30,36,0.3),0_16px_40px_rgba(227,30,36,0.12)]"
          : "border-ocean/40"
      }`}
      aria-label={`Moniteur ${numero} — ${entete}`}
    >
      {/* En-tête moniteur */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-700 px-4 py-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-mist-dark">
          Moniteur {numero} — {entete}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10.5px] font-extrabold uppercase tracking-widest text-white ${pulse ? "live-pulse" : ""}`}
            style={{ background: badgeColor }}
          >
            {enDirect && <span className="flex h-2.5 items-end gap-[2px]" aria-hidden>
              <span className="eq-bar1 w-[2.5px] rounded-sm bg-white" />
              <span className="eq-bar2 w-[2.5px] rounded-sm bg-white" />
              <span className="eq-bar3 w-[2.5px] rounded-sm bg-white" />
            </span>}
            {badge}
          </span>
          <span className="hidden rounded-md border border-ink-600 px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-widest text-mist sm:block">
            1080p60 • SDI OUT
          </span>
        </div>
      </div>

      {/* Écran */}
      <div className="relative aspect-[16/7] overflow-hidden bg-ink-950">
        {program ? (
          <ProgramPoster program={program} className={`h-full w-full object-cover ${enDirect ? "kenburns" : ""} ${enDirect ? "opacity-70" : "opacity-50"}`} />
        ) : (
          <div className="glow-ocean flex h-full items-center justify-center">
            <Moon size={40} className="text-ink-600" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/25 to-transparent" aria-hidden />
        {enDirect && <div className="scanline" aria-hidden />}

        {/* Timecode + catégorie */}
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[15px] font-bold tabular-nums text-paper">
              {item ? `${item.startTime} - ${item.endTime}` : "--:-- - --:--"}
            </p>
          </div>
          {meta && (
            <span
              className="rounded-md px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.16em]"
              style={{ background: meta.soft, color: meta.color }}
            >
              {meta.label}
            </span>
          )}
        </div>
      </div>

      {/* Conducteur */}
      <div className="px-4 py-4">
        <h3 className="font-display truncate text-[30px] uppercase leading-none tracking-wide text-paper">
          {program ? program.title : fallbackTitle}
        </h3>
        <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-mist">
          {synopsis?.intro ?? program?.description ?? fallbackDesc}
        </p>
        <p className="mt-2.5 flex items-center gap-2 font-mono text-[11px] text-mist-dark">
          <span className="h-1 w-1 rounded-full bg-balafon" aria-hidden />
          {synopsis?.credits ?? (program ? `À l'antenne : ${program.subtitle ?? "Balafon TV"}` : fallbackCredits)}
        </p>
        {typeof progress === "number" && (
          <div className="mt-3">
            <ProgressBar value={progress} />
            <p className="mt-1 text-right font-mono text-[10px] tabular-nums text-mist-dark">{Math.round(progress)} % écoulé</p>
          </div>
        )}
      </div>
    </section>
  );
}

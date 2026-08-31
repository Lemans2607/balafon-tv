import { useState } from "react";
import {
  Activity,
  AlertOctagon,
  ArrowLeft,
  Lock,
  Maximize2,
  Minimize2,
  RefreshCw,
  Satellite,
  ShieldCheck,
  Tv2,
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
import { dateKey, formatClock, formatHM } from "../../utils/time";
import { BalafonEpg } from "../../components/planby/BalafonEpg";
import type { PlanbyEpgData } from "../../components/planby/planbyMappers";
import { AlertCard } from "../../components/alerts/AlertCard";
import { Badge, Button, Modal, SimClock } from "../../components/ui";
import { ProgramPoster } from "../../components/media/ProgramPoster";
import { CATEGORY_META, type Program } from "../../types";
import { USERS } from "../../data/schedules";
import { synopsisDe } from "../../data/synopses";
import { HERO_BACKDROP } from "../../data/programs";
import type { ScheduleItem } from "../../types";

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

  /* Cache React Query : la dernière grille reste consultable hors-ligne. */
  const grilleQuery = useGrilleQuery();

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
      message: `18:45 — Remplacement de « Faut Pas Zapper »\npar « C'le Weekend » (édition spéciale).\n\nAction requise dans vMix.`,
      source: "director",
      actionRequired: true,
      relatedScheduleId: today,
    });
    vmix.sendChange("Remplacement « Faut Pas Zapper » → « C'le Weekend » (18:45)");
    addLog({ user: USERS.directeur.name, role: "directeur", action: "Modification de grille validée (simulation)", details: `Remplacement Faut Pas Zapper → C'le Weekend sur la grille du ${today}.`, severity: "critical", date: today });
    toast({ title: "Alerte critique reçue", message: "La console d’alertes a été mise à jour — acquittement requis.", tone: "error" });
  };

  const programs = useScheduleStore((s) => s.programs);
  void programs;

  const { ref: fsRef, isFullscreen, toggle } = useFullscreen<HTMLDivElement>();

  const pgmItem = live.current ?? null;
  const pgmProgram = live.currentProgram ?? null;
  const pvwItem = live.next ?? null;
  const pvwProgram = live.nextProgram ?? null;
  const isPgmLive = pgmProgram !== null && pgmProgram.category !== "off-air";

  return (
    <div ref={fsRef} className="space-y-6">
      <BroadcastHeader
        now={now}
        vmixStatus={vmix.status}
        vMetaColor={vMeta.color}
        isFullscreen={isFullscreen}
        onToggle={toggle}
      />

      {/* ===== Mur de moniteurs PGM / PVW ===== */}
      <div className="grid gap-5 xl:grid-cols-2">
        <RegieMonitor
          kind="pgm"
          label="Moniteur 1 — Programme Actuel à l'Antenne"
          program={pgmProgram}
          item={pgmItem}
          isLive={isPgmLive}
          progress={live.progress}
        />
        <RegieMonitor
          kind="pvw"
          label="Moniteur 2 — Programme Suivant (Preview)"
          program={pvwProgram}
          item={pvwItem}
          isLive={false}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_350px]">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge color="#00F5A0" soft="rgba(0,245,160,0.12)">
              <Lock size={10} /> Lecture seule
            </Badge>
            <p className="text-[12.5px] text-mist">
              Grille du <strong className="text-paper">{today}</strong> — la régie ne peut ni déplacer, ni modifier, ni publier.
            </p>
            {grilleQuery.depuisCache && (
              <Badge color="#FFB800" soft="rgba(255,184,0,0.14)">
                Hors-ligne — grille en cache
              </Badge>
            )}
            <span
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-800 px-3 py-1.5 text-[11.5px] font-bold"
              style={{ color: vMeta.color }}
            >
              {vmix.status === "disconnected" ? <WifiOff size={12} aria-hidden /> : <Wifi size={12} aria-hidden />}
              vMix · {vMeta.label}
            </span>
          </div>

          <div className="rounded-2xl border border-ink-700 bg-ink-800/60 p-4">
            <BalafonEpg date={today} mode="regie" now={now} heightPx={240} onSelectItem={setDetail} />
          </div>

        {/* Timeline Gantt de la journée */}
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
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

/* ============================================================
   Bandeau « Poste de Diffusion & Régie vMix » — horloge d'antenne,
   état du master vMix, niveaux audio, bascule plein écran.
   ============================================================ */
function BroadcastHeader({
  now,
  vmixStatus,
  vMetaColor,
  isFullscreen,
  onToggle,
}: {
  now: Date;
  vmixStatus: string;
  vMetaColor: string;
  isFullscreen: boolean;
  onToggle: () => void;
}) {
  const connected = vmixStatus !== "disconnected";
  return (
    <section className="panel relative overflow-hidden px-5 py-4" aria-label="Poste de diffusion">
      <span className="absolute inset-x-0 top-0 flex h-[3px]" aria-hidden>
        <span className="flex-1 bg-balafon" />
        <span className="flex-1 bg-ocean" />
        <span className="flex-1 bg-paper/80" />
      </span>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <span className={`relative flex h-3 w-3 ${connected ? "" : "opacity-40"}`} aria-hidden>
              <span className={`absolute inline-flex h-full w-full rounded-full ${connected ? "soft-blink bg-studio" : "bg-mist-dark"}`} />
              <span className="relative inline-flex h-3 w-3 rounded-full border border-ink-950 bg-studio" />
            </span>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: connected ? "#00F5A0" : "#6B7280" }}>
                {connected ? "vMix Master Connecté" : "vMix Master Hors ligne"}
              </p>
              <p className="font-mono text-[10px] text-mist-dark">Endpoint : http://127.0.0.1:8088/api</p>
            </div>
          </div>
          <span className="hidden h-9 w-px bg-ink-600 sm:block" aria-hidden />
          <div>
            <p className="font-display text-[24px] uppercase leading-none tracking-wide text-paper">
              Régie Master <span className="text-balafon">Balafon TV</span>
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-mist-dark">
              <Tv2 size={11} aria-hidden /> Poste de Diffusion · UTC+1
            </p>
          </div>
        </div>

        {/* Niveaux audio (VU-mètres décoratifs) */}
        <div className="hidden items-end gap-[3px] md:flex" style={{ height: 34 }} aria-hidden>
          {[...Array(10)].map((_, i) => (
            <span
              key={i}
              className={`w-[5px] rounded-t ${["eq-bar1", "eq-bar2", "eq-bar3"][i % 3]} ${connected ? "bg-studio/80" : "bg-ink-600"}`}
              style={{ height: `${30 + ((i * 23) % 60)}%`, animationDelay: `${i * 0.07}s` }}
            />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono text-[42px] font-bold leading-none tabular-nums text-paper">{formatClock(now)}</p>
            <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.26em]" style={{ color: vMetaColor }}>
              Heure Antenne UTC+1
            </p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-label={isFullscreen ? "Quitter le plein écran" : "Passer en plein écran"}
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            className="rounded-lg border border-ink-600 bg-ink-800 p-2.5 text-mist transition-colors hover:border-balafon/60 hover:text-balafon"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Moniteur de régie (PGM = à l'antenne / PVW = preview).
   ============================================================ */
function RegieMonitor({
  kind,
  label,
  program,
  item,
  isLive,
  progress,
}: {
  kind: "pgm" | "pvw";
  label: string;
  program: Program | null;
  item: ScheduleItem | null;
  isLive: boolean;
  progress?: number;
}) {
  const isPgm = kind === "pgm";
  const accent = isPgm ? "#E31E24" : "#00F5A0";
  const backdrop = (program?.backdropUrl || program?.posterUrl || HERO_BACKDROP) as string;
  const synopsis = program ? synopsisDe(program.id) : null;
  const category = program ? CATEGORY_META[program.category] : null;

  return (
    <section className="flex flex-col" aria-label={label}>
      <p className="mb-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-mist-dark">{label}</p>

      {/* Châssis du moniteur */}
      <div
        className="rounded-xl border-2 bg-[#07090f] p-1.5 shadow-[0_18px_44px_rgba(2,4,9,0.6)]"
        style={{ borderColor: `${accent}66`, boxShadow: `0 0 0 1px ${accent}22, 0 18px 44px rgba(2,4,9,0.6)` }}
      >
        <div className="relative aspect-video overflow-hidden rounded-lg bg-ink-950">
          {program && program.category !== "off-air" ? (
            <>
              <img
                src={backdrop}
                alt=""
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                className={`h-full w-full object-cover opacity-60 ${isPgm ? "kenburns" : ""}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/25 to-ink-950/20" />
              {isPgm && <div className="scanline" aria-hidden />}
            </>
          ) : (
            <div className="glow-ocean flex h-full w-full items-center justify-center">
              <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-mist-dark">
                {isPgm ? "Hors antenne" : "Aucun programme suivant"}
              </p>
            </div>
          )}

          {/* Tally + bus technique */}
          <div className="absolute left-3 top-3 flex items-center gap-2">
            {isPgm ? (
              <span className="live-pulse flex items-center gap-1.5 rounded bg-balafon px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden /> En Direct (PGM)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded bg-studio px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-ink-950">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-950" aria-hidden /> À Suivre
              </span>
            )}
          </div>
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded bg-ink-950/75 px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-wider text-mist backdrop-blur">
            {isPgm ? (
              <>
                <span className="soft-blink h-1.5 w-1.5 rounded-full bg-balafon" aria-hidden /> 1080p60 • SDI OUT
              </>
            ) : (
              "Preview Bus"
            )}
          </span>

          {/* Lower-third OSD */}
          {program && program.category !== "off-air" && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/95 via-ink-950/70 to-transparent px-4 pb-3 pt-8">
              <div className="flex items-center gap-2">
                {item && (
                  <span className="rounded bg-balafon/15 px-2 py-0.5 font-mono text-[12px] font-bold tabular-nums text-balafon">
                    {item.startTime} - {item.endTime}
                  </span>
                )}
                {category && (
                  <span className="rounded px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest" style={{ background: category.soft, color: category.color }}>
                    {category.label}
                  </span>
                )}
              </div>
              <h3 className="font-display mt-1.5 truncate text-[30px] uppercase leading-none text-paper">{program.title}</h3>
              <p className="mt-1 line-clamp-2 max-w-xl text-[12px] leading-snug text-mist">{program.description}</p>
            </div>
          )}

          {/* Barre de progression (PGM) */}
          {isPgm && typeof progress === "number" && (
            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-ink-800" aria-hidden>
              <div className="h-full bg-balafon transition-[width] duration-700" style={{ width: `${Math.round(progress)}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* Générique + horodatage sous le moniteur */}
      <div className="mt-2.5 flex items-center justify-between gap-3 px-1">
        <p className="truncate text-[12px] font-semibold text-mist">
          {program && program.category !== "off-air"
            ? synopsis?.credits ?? (isPgm ? "À l'antenne : Balafon TV" : "Balafon TV")
            : "—"}
        </p>
        {isPgm && typeof progress === "number" && (
          <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums text-balafon">{Math.round(progress)} %</span>
        )}
      </div>
    </section>
  );
}

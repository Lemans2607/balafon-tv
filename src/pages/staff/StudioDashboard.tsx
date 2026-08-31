import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowRight, BarChart3, Bell, LayoutDashboard, MonitorPlay, Radio } from "lucide-react";
import { useScheduleStore } from "../../store/scheduleStore";
import { useAlertStore } from "../../store/alertStore";
import { useVmixStore, VMIX_STATUS_META } from "../../store/vmixStore";
import { useCurrentProgram, useNow } from "../../hooks/useNow";
import { dateKey } from "../../utils/time";
import { validateGridForPublish } from "../../utils/validation";
import { ADMIN_DAY_START, DAY_END } from "../../utils/time";
import { STATUS_META } from "../../types";
import { BalafonEpg } from "../../components/planby/BalafonEpg";
import { AlertCard } from "../../components/alerts/AlertCard";
import { GenreChart } from "../../components/charts/GenreChart";
import { ProgressBar, SimClock } from "../../components/ui";

type DashboardTab = "pilotage" | "analyse";

export function StudioDashboard() {
  const now = useNow(1000);
  const today = dateKey(now);
  const scheduleMap = useScheduleStore((s) => s.scheduleMap);
  const programs = useScheduleStore((s) => s.programs);
  const grids = useScheduleStore((s) => s.grids);
  const logs = useScheduleStore((s) => s.logs);
  const alerts = useAlertStore((s) => s.alerts);
  const acknowledge = useAlertStore((s) => s.acknowledge);
  const vmixStatus = useVmixStore((s) => s.status);

  const live = useCurrentProgram(today, now);
  const grid = grids[today];
  const items = scheduleMap[today] ?? [];
  const verdict = validateGridForPublish(items, programs, grid?.status ?? "draft", ADMIN_DAY_START, DAY_END);
  const unacked = alerts.filter((a) => !a.acknowledged);
  const vMeta = VMIX_STATUS_META[vmixStatus];
  const gridMeta = STATUS_META[grid?.status ?? "draft"];
  const [tab, setTab] = useState<DashboardTab>("pilotage");

  const stats = [
    {
      label: "Grille du jour",
      value: gridMeta.label,
      color: gridMeta.color,
      sub: `Couverture ${verdict.coverage} % · fenêtre 06:00–24:00`,
      to: "/studio/grilles",
    },
    {
      label: "Alertes actives",
      value: String(unacked.length),
      color: unacked.length > 0 ? "#EF4444" : "#00F5A0",
      sub: unacked.length > 0 ? "Acquittement requis en régie" : "Aucune action en attente",
      to: "/studio/alertes",
    },
    {
      label: "Liaison vMix",
      value: vMeta.label,
      color: vMeta.color,
      sub: "Mode démonstration — connexion simulée",
      to: "/studio/regie",
    },
    {
      label: "À l’antenne",
      value: live.currentProgram?.title ?? "Hors antenne",
      color: live.currentProgram && live.currentProgram.category !== "off-air" ? "#E31E24" : "#6B7280",
      sub: live.current ? `${live.current.startTime} – ${live.current.endTime}` : "Reprise à 06:00",
      to: "/tv",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to={s.to} className="block rounded-2xl border border-ink-700 bg-ink-800 p-4 transition-all hover:-translate-y-0.5 hover:border-ink-500">
              <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-mist-dark">{s.label}</p>
              <p className="mt-2 truncate font-display text-[19px] font-extrabold" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="mt-1 text-[11.5px] text-mist-dark">{s.sub}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Barre d'onglets — fondu Framer Motion au changement */}
      <div className="flex items-center gap-1 border-b border-ink-700" role="tablist" aria-label="Sections du tableau de bord">
        {(
          [
            { id: "pilotage", label: "Pilotage", icon: <LayoutDashboard size={15} /> },
            { id: "analyse", label: "Analyse des genres", icon: <BarChart3 size={15} /> },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-[13px] font-extrabold transition-colors ${
              tab === t.id ? "text-balafon" : "text-mist hover:text-paper"
            }`}
          >
            {t.icon}
            {t.label}
            {tab === t.id && (
              <motion.span
                layoutId="dash-tab-underline"
                className="absolute inset-x-2 -bottom-px h-[3px] rounded-t bg-balafon"
                aria-hidden
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "pilotage" && (
          <motion.div
            key="pilotage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-ink-700 bg-ink-800/70 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2 text-[16px] font-extrabold text-paper">
              <MonitorPlay size={16} className="text-balafon" aria-hidden /> Antenne du jour — {today}
            </h2>
            <Link to="/studio/regie" className="flex items-center gap-1 text-[12.5px] font-bold text-balafon hover:text-balafon-soft">
              Ouvrir la régie <ArrowRight size={13} aria-hidden />
            </Link>
          </div>
          <BalafonEpg date={today} mode="regie" now={now} showControls={false} heightPx={180} />
          {live.currentProgram && live.currentProgram.category !== "off-air" && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-ink-600 bg-ink-900 p-3">
              <span className="live-pulse rounded bg-balafon px-2 py-1 text-[9.5px] font-extrabold uppercase text-white">Direct</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-extrabold text-paper">{live.currentProgram.title}</p>
                <ProgressBar value={live.progress} />
              </div>
              <span className="font-mono text-[12px] tabular-nums text-mist">{Math.round(live.progress)} %</span>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-ink-700 bg-ink-800/70 p-5">
            <h2 className="font-display mb-3 flex items-center gap-2 text-[15px] font-extrabold text-paper">
              <Bell size={15} className="text-crit" aria-hidden /> Alertes récentes
            </h2>
            <div className="space-y-3">
              {unacked.slice(0, 2).map((a) => (
                <AlertCard key={a.id} alert={a} onAcknowledge={(id) => acknowledge(id, "Studio")} />
              ))}
              {unacked.length === 0 && (
                <p className="text-[12.5px] text-mist-dark">Aucune alerte active. La régie est nominale.</p>
              )}
              <Link to="/studio/alertes" className="inline-flex items-center gap-1 text-[12px] font-bold text-balafon hover:text-balafon-soft">
                Centre d’alertes <ArrowRight size={12} aria-hidden />
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-ink-700 bg-ink-800/70 p-5">
            <h2 className="font-display mb-3 flex items-center gap-2 text-[15px] font-extrabold text-paper">
              <Activity size={15} className="text-studio" aria-hidden /> Journal récent
            </h2>
            <ul className="space-y-2.5">
              {logs.slice(0, 5).map((l) => (
                <li key={l.id} className="border-l-2 pl-3" style={{ borderColor: l.severity === "critical" ? "#EF4444" : l.severity === "warning" ? "#FFB800" : "#2A3142" }}>
                  <p className="text-[12.5px] font-bold text-paper">{l.action}</p>
                  <p className="text-[11.5px] leading-snug text-mist">{l.details}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-mist-dark">{l.user} · {l.at.slice(0, 16).replace("T", " ")}</p>
                </li>
              ))}
              {logs.length === 0 && <p className="text-[12.5px] text-mist-dark">Aucune entrée.</p>}
            </ul>
          </section>

          <SimClock compact />
        </div>
            </div>
          </motion.div>
        )}

        {tab === "analyse" && (
          <motion.div
            key="analyse"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="grid gap-6 xl:grid-cols-[1fr_340px]"
          >
            <section className="rounded-2xl border border-ink-700 bg-ink-800/70 p-5">
              <h2 className="font-display flex items-center gap-2 text-[16px] font-extrabold text-paper">
                <BarChart3 size={16} className="text-ocean-soft" aria-hidden /> Répartition des genres — grilles validées
              </h2>
              <p className="mt-1 text-[12px] text-mist-dark">
                Nombre de diffusions par genre, calculé sur l’ensemble des grilles validées et publiées.
              </p>
              <div className="mt-4">
                <GenreChart />
              </div>
            </section>

            <div className="space-y-6">
              <section className="rounded-2xl border border-ink-700 bg-ink-800/70 p-5">
                <h2 className="font-display mb-3 text-[15px] font-extrabold text-paper">Lecture éditoriale</h2>
                <p className="text-[12.5px] leading-relaxed text-mist">
                  Cette vue agrège les grilles <strong className="text-studio">validées pour diffusion</strong>. Elle
                  aide la Direction d’Antenne à vérifier l’équilibre de la ligne éditoriale (information, talk, culture,
                  sport, musique) avant publication.
                </p>
                <Link
                  to="/studio/directeur"
                  className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-bold text-balafon hover:text-balafon-soft"
                >
                  Ouvrir la validation éditoriale <ArrowRight size={13} aria-hidden />
                </Link>
              </section>
              <SimClock compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="flex items-center gap-2 text-[11px] text-mist-dark">
        <Radio size={11} aria-hidden /> Balafon Studio pilote exclusivement l’antenne de Balafon TV (pas de radio). Fuseau Africa/Douala.
      </p>
    </div>
  );
}

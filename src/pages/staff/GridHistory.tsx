import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { motion } from "framer-motion";
import { useScheduleStore } from "../../store/scheduleStore";
import { useAlertStore } from "../../store/alertStore";
import { Badge, EmptyState } from "../../components/ui";
import { SEVERITY_META } from "../../types";

export function GridHistory() {
  const logs = useScheduleStore((s) => s.logs);
  const alerts = useAlertStore((s) => s.alerts);
  const [severity, setSeverity] = useState<"all" | "info" | "warning" | "critical">("all");
  const [view, setView] = useState<"logs" | "alerts">("logs");

  const filteredLogs = useMemo(
    () => logs.filter((l) => severity === "all" || l.severity === severity),
    [logs, severity]
  );
  const filteredAlerts = useMemo(
    () => alerts.filter((a) => severity === "all" || a.severity === severity),
    [alerts, severity]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-ink-600">
          {(
            [
              { id: "logs", label: "Journal d’audit" },
              { id: "alerts", label: "Historique des alertes" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
              className={`px-4 py-2 text-[12.5px] font-bold transition-colors ${
                view === v.id ? "bg-balafon/15 text-balafon" : "bg-ink-800 text-mist hover:text-paper"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as typeof severity)}
          aria-label="Filtrer par niveau"
          className="ml-auto rounded-lg border border-ink-600 bg-ink-800 px-2.5 py-2 text-[12px] font-semibold text-mist focus:outline-none"
        >
          <option value="all">Tous les niveaux</option>
          <option value="info">Info</option>
          <option value="warning">Attention</option>
          <option value="critical">Critique</option>
        </select>
      </div>

      {view === "logs" ? (
        filteredLogs.length === 0 ? (
          <EmptyState icon={<History size={32} />} title="Journal vide" hint="Chaque action sur les grilles (ajout, retrait, validation, publication) est tracée ici." />
        ) : (
          <ol className="space-y-2.5">
            {filteredLogs.map((l, i) => {
              const meta = SEVERITY_META[l.severity];
              return (
                <motion.li
                  key={l.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="flex gap-3 rounded-xl border border-ink-700 bg-ink-800/70 p-4"
                >
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-extrabold text-paper">{l.action}</p>
                      <Badge color={meta.color} soft={meta.soft}>{meta.label}</Badge>
                      {l.date && <span className="font-mono text-[10.5px] text-mist-dark">grille {l.date}</span>}
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-mist">{l.details}</p>
                    <p className="mt-1.5 font-mono text-[10.5px] text-mist-dark">
                      {l.user} · rôle {l.role} · {l.at.slice(0, 16).replace("T", " ")}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )
      ) : filteredAlerts.length === 0 ? (
        <EmptyState icon={<History size={32} />} title="Aucune alerte dans l’historique" hint="Les alertes acquittées et les notifications vMix simulées sont conservées ici." />
      ) : (
        <ol className="space-y-2.5">
          {filteredAlerts.map((a) => {
            const meta = SEVERITY_META[a.severity];
            return (
              <li key={a.id} className="rounded-xl border border-ink-700 bg-ink-800/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13.5px] font-extrabold text-paper">{a.title}</p>
                  <Badge color={meta.color} soft={meta.soft}>{meta.label}</Badge>
                  <Badge color={a.acknowledged ? "#00F5A0" : "#FFB800"} soft={a.acknowledged ? "rgba(0,245,160,0.12)" : "rgba(255,184,0,0.14)"}>
                    {a.acknowledged ? "Acquittée" : "Active"}
                  </Badge>
                </div>
                <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-mist">{a.message}</p>
                <p className="mt-1.5 font-mono text-[10.5px] text-mist-dark">
                  Créée {a.createdAt.slice(0, 16).replace("T", " ")}
                  {a.acknowledgedBy ? ` · acquittée par ${a.acknowledgedBy} ${a.acknowledgedAt?.slice(11, 16) ?? ""}` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

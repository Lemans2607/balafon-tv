import { useMemo, useState } from "react";
import { BellOff, CheckCheck, Siren } from "lucide-react";
import { useAlertStore } from "../../store/alertStore";
import { useAppStore } from "../../store/appStore";
import { AlertCard } from "../../components/alerts/AlertCard";
import { Button, EmptyState } from "../../components/ui";
import { SEVERITY_META, type Alert } from "../../types";
import { USERS } from "../../data/schedules";

export function AlertCenter() {
  const alerts = useAlertStore((s) => s.alerts);
  const acknowledge = useAlertStore((s) => s.acknowledge);
  const toast = useAppStore((s) => s.toast);
  const [tab, setTab] = useState<"active" | "acked" | "all">("active");
  const [severity, setSeverity] = useState<"all" | Alert["severity"]>("all");

  const filtered = useMemo(
    () =>
      alerts.filter((a) => {
        if (tab === "active" && a.acknowledged) return false;
        if (tab === "acked" && !a.acknowledged) return false;
        if (severity !== "all" && a.severity !== severity) return false;
        return true;
      }),
    [alerts, tab, severity]
  );

  const active = alerts.filter((a) => !a.acknowledged);

  const ackAll = () => {
    active.forEach((a) => acknowledge(a.id, USERS.regie.name));
    toast({ title: "Alertes acquittées", message: `${active.length} alerte(s) acquittée(s) — conservées dans l’historique.`, tone: "success" });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "active", label: `Actives (${active.length})` },
            { id: "acked", label: "Acquittées" },
            { id: "all", label: "Toutes" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-3.5 py-2 text-[12.5px] font-bold transition-all ${
              tab === t.id ? "border-balafon bg-balafon/12 text-balafon" : "border-ink-600 bg-ink-800 text-mist hover:text-paper"
            }`}
          >
            {t.label}
          </button>
        ))}
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as typeof severity)}
          aria-label="Filtrer par sévérité"
          className="ml-auto rounded-lg border border-ink-600 bg-ink-800 px-2.5 py-2 text-[12px] font-semibold text-mist focus:outline-none"
        >
          <option value="all">Toutes sévérités</option>
          {Object.entries(SEVERITY_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        {active.length > 0 && tab !== "acked" && (
          <Button variant="outline" size="sm" onClick={ackAll}>
            <CheckCheck size={13} aria-hidden /> Tout acquitter
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={tab === "acked" ? <BellOff size={32} /> : <Siren size={32} />}
          title={tab === "acked" ? "Aucune alerte acquittée" : "Aucune alerte active"}
          hint={tab === "acked" ? "Les alertes acquittées restent tracées ici pour l’audit." : "L’antenne est nominale. Les alertes critiques de la régie apparaîtront ici."}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <AlertCard key={a.id} alert={a} onAcknowledge={(id) => { acknowledge(id, USERS.regie.name); toast({ title: "Alerte acquittée", tone: "success" }); }} />
          ))}
        </div>
      )}
    </div>
  );
}

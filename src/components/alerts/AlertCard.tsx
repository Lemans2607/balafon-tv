import { motion } from "framer-motion";
import { format } from "date-fns";
import { BellRing, Check } from "lucide-react";
import type { Alert } from "../../types";
import { SEVERITY_META } from "../../types";
import { Badge } from "../ui";

const SOURCE_LABEL: Record<Alert["source"], string> = {
  director: "Directeur d’Antenne",
  admin: "Admin Antenne",
  vmix: "vMix (simulation)",
  system: "Système",
};

export function AlertCard({
  alert,
  onAcknowledge,
}: {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
}) {
  const meta = SEVERITY_META[alert.severity];
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-3.5 transition-opacity ${
        alert.acknowledged ? "border-ink-700 bg-ink-800/50 opacity-60" : "bg-ink-800"
      } ${!alert.acknowledged && alert.severity === "critical" ? "border-crit/70 shadow-[0_0_18px_rgba(239,68,68,0.15)]" : !alert.acknowledged ? "border-ink-600" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {!alert.acknowledged && alert.severity === "critical" && (
            <BellRing size={14} className="soft-blink text-crit" aria-hidden />
          )}
          <Badge color={meta.color} soft={meta.soft}>
            {alert.acknowledged ? "Acquittée" : meta.label}
          </Badge>
          <span className="font-mono text-[10.5px] tabular-nums text-mist-dark">
            {format(new Date(alert.createdAt), "dd/MM · HH:mm")}
          </span>
        </div>
      </div>
      <h3 className="mt-2 text-[13.5px] font-extrabold text-paper">{alert.title}</h3>
      <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-mist">{alert.message}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-mist-dark">
          Source · {SOURCE_LABEL[alert.source]}
          {alert.acknowledgedBy ? ` — acquittée par ${alert.acknowledgedBy}` : ""}
        </span>
        {!alert.acknowledged && onAcknowledge && (
          <button
            type="button"
            onClick={() => onAcknowledge(alert.id)}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-ink-500 bg-ink-700 px-2.5 py-1.5 text-[11.5px] font-bold text-paper transition-colors hover:border-studio hover:text-studio"
          >
            <Check size={12} aria-hidden /> Acquitter l’alerte
          </button>
        )}
      </div>
    </motion.article>
  );
}

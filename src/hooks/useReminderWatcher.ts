import { useEffect, useRef } from "react";
import { useReminderStore } from "../store/reminderStore";
import { useAppStore } from "../store/appStore";
import { useAlertStore } from "../store/alertStore";
import { useNow } from "./useNow";

/* ============================================================
   Déclenche les rappels téléspectateur :
   - à J-5 min : toast « commence bientôt » ;
   - au moment du direct : toast + alerte info dans l'alertStore.
   Les rappels déclenchés ne se re-déclenchent jamais.
   ============================================================ */
export function useReminderWatcher(): void {
  const now = useNow(1000);
  const reminders = useReminderStore((s) => s.list);
  const markFired = useReminderStore((s) => s.markFired);
  const toast = useAppStore((s) => s.toast);
  const addAlert = useAlertStore((s) => s.addAlert);
  const lastMinute = useRef("");

  useEffect(() => {
    const bucket = `${now.getFullYear()}${now.getMonth()}${now.getDate()}${now.getHours()}${now.getMinutes()}`;
    if (bucket === lastMinute.current) return;
    lastMinute.current = bucket;

    for (const r of reminders) {
      if (r.fired) continue;
      const start = new Date(`${r.date}T${r.startTime}:00`);
      if (Number.isNaN(start.getTime())) continue;
      const diffMs = start.getTime() - now.getTime();

      if (diffMs <= 5 * 60_000 && diffMs > -3 * 60_000) {
        markFired(r.id);
        if (diffMs > 0) {
          toast({
            title: `Rappel — ${r.title}`,
            message: `Démarre à ${r.startTime} sur Balafon TV (dans ${Math.max(1, Math.round(diffMs / 60_000))} min).`,
            tone: "info",
          });
        } else {
          toast({
            title: `${r.title} est à l’antenne`,
            message: "L’émission que vous avez rappelée est en direct sur Balafon TV.",
            tone: "success",
          });
          addAlert({
            severity: "info",
            title: `Rappel téléspectateur — ${r.title}`,
            message: `Émission en direct depuis ${r.startTime} (rappel programmé par un téléspectateur).`,
            source: "system",
          });
        }
      }
    }
  }, [now, reminders, markFired, toast, addAlert]);
}

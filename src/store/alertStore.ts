import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Alert } from "../types";
import { isoLocal } from "../utils/time";

interface AlertState {
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Omit<Alert, "id" | "createdAt" | "acknowledged">) => Alert;
  acknowledge: (id: string, by: string) => void;
}

let alertSeq = 0;

export const useAlertStore = create<AlertState>()(
  persist(
    (set, get) => ({
      alerts: [],
      setAlerts: (alerts) => set({ alerts }),
      addAlert: (a) => {
        alertSeq += 1;
        const alert: Alert = {
          ...a,
          id: `al-${alertSeq}-${Date.now()}`,
          createdAt: isoLocal(new Date()),
          acknowledged: false,
        };
        set({ alerts: [alert, ...get().alerts].slice(0, 60) });
        return alert;
      },
      acknowledge: (id, by) =>
        set({
          alerts: get().alerts.map((a) =>
            a.id === id
              ? { ...a, acknowledged: true, acknowledgedAt: isoLocal(new Date()), acknowledgedBy: by }
              : a
          ),
        }),
    }),
    { name: "balafon-alerts-v2" }
  )
);

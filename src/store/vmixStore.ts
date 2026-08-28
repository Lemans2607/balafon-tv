import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isoLocal } from "../utils/time";

/* ============================================================
   Service vMix SIMULÉ — mode démonstration.
   Aucune connexion réelle n'est établie. L'architecture prépare
   une future API REST / WebSocket (voir services/vmixService.ts).
   ============================================================ */

export type VmixStatus = "disconnected" | "connecting" | "syncing" | "synced" | "error";

export const VMIX_STATUS_META: Record<VmixStatus, { label: string; color: string }> = {
  disconnected: { label: "Déconnectée", color: "#6B7280" },
  connecting: { label: "Connexion en cours…", color: "#FFB800" },
  syncing: { label: "Synchronisation en cours…", color: "#3B82F6" },
  synced: { label: "Synchronisée", color: "#00F5A0" },
  error: { label: "Erreur de synchronisation", color: "#EF4444" },
};

interface VmixState {
  status: VmixStatus;
  lastSync: string | null;
  pendingChanges: string[];
  events: string[];
  connect: () => void;
  disconnect: () => void;
  syncSchedule: () => Promise<boolean>;
  sendChange: (description: string) => void;
  acknowledgeChange: (index: number) => void;
}

const timers: number[] = [];
function later(ms: number, fn: () => void) {
  timers.push(window.setTimeout(fn, ms));
}

let eventSeq = 0;
function ev(msg: string): string {
  eventSeq += 1;
  return `${isoLocal(new Date())} · ${msg}`;
}

export const useVmixStore = create<VmixState>()(
  persist(
    (set, get) => ({
      status: "disconnected",
      lastSync: null,
      pendingChanges: [],
      events: [],

      connect: () => {
        if (get().status === "connecting" || get().status === "syncing") return;
        set({ status: "connecting", events: [ev("Connexion simulée à vMix (API:8888)…"), ...get().events].slice(0, 40) });
        later(900, () =>
          set({ status: "synced", events: [ev("Connexion établie — liaison simulée opérationnelle."), ...get().events].slice(0, 40) })
        );
      },

      disconnect: () => {
        timers.forEach((t) => window.clearTimeout(t));
        set({ status: "disconnected", events: [ev("Liaison vMix fermée (simulation)."), ...get().events].slice(0, 40) });
      },

      syncSchedule: () =>
        new Promise((resolve) => {
          const { status } = get();
          if (status === "disconnected") {
            set({ events: [ev("Synchronisation refusée — liaison vMix non établie."), ...get().events].slice(0, 40) });
            resolve(false);
            return;
          }
          set({ status: "syncing", events: [ev("Envoi de la grille vers vMix (playlist simulée)…"), ...get().events].slice(0, 40) });
          later(1400, () => {
            const ok = Math.random() > 0.12;
            if (ok) {
              set({
                status: "synced",
                lastSync: isoLocal(new Date()),
                pendingChanges: [],
                events: [ev("Grille synchronisée avec vMix — 16 entrées playlist."), ...get().events].slice(0, 40),
              });
            } else {
              set({
                status: "error",
                events: [ev("Échec de synchronisation — nouvelle tentative recommandée."), ...get().events].slice(0, 40),
              });
              later(1600, () => set({ status: "synced" }));
            }
            resolve(ok);
          });
        }),

      sendChange: (description) =>
        set({
          pendingChanges: [...get().pendingChanges, description],
          events: [ev(`Modification transmise à vMix : ${description}`), ...get().events].slice(0, 40),
        }),

      acknowledgeChange: (index) =>
        set({ pendingChanges: get().pendingChanges.filter((_, i) => i !== index) }),
    }),
    {
      name: "balafon-vmix-v1",
      partialize: (s) => ({ lastSync: s.lastSync, events: s.events.slice(0, 20) }),
    }
  )
);

/* Façade service — futurs points d'intégration REST/WebSocket */
export const vmixService = {
  connectToVmix: () => useVmixStore.getState().connect(),
  getVmixStatus: () => useVmixStore.getState().status,
  syncScheduleWithVmix: () => useVmixStore.getState().syncSchedule(),
  sendScheduleChangeToVmix: (d: string) => useVmixStore.getState().sendChange(d),
  acknowledgeVmixAlert: (i: number) => useVmixStore.getState().acknowledgeChange(i),
};

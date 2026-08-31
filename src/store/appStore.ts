import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppRole } from "../types";
import { todayKey } from "../utils/time";

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  tone: "success" | "error" | "warning" | "info";
  action?: { label: string; onClick: () => void };
}

interface AppState {
  role: AppRole;
  selectedDate: string;
  simOffsetMin: number;
  toasts: ToastItem[];
  setRole: (role: AppRole) => void;
  setSelectedDate: (date: string) => void;
  setSimOffset: (minutes: number) => void;
  toast: (t: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
}

let toastSeq = 0;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      /* Site de production : le Directeur d'Antenne (super admin) est le
         compte initial — l'espace Studio s'ouvre directement en Direction.
         Le rôle réel est ensuite piloté par l'authentification JWT. */
      role: "directeur",
      selectedDate: todayKey(),
      simOffsetMin: 0,
      toasts: [],
      setRole: (role) => set({ role }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSimOffset: (minutes) => set({ simOffsetMin: minutes }),
      toast: (t) => {
        toastSeq += 1;
        const id = `toast-${toastSeq}-${Date.now()}`;
        set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
    }),
    {
      name: "balafon-app-v1",
      partialize: (s) => ({
        role: s.role,
        selectedDate: s.selectedDate,
        simOffsetMin: s.simOffsetMin,
      }),
    }
  )
);

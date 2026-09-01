import { create } from "zustand";
import { persist } from "zustand/middleware";
import { todayKey } from "../utils/time";

/* ============================================================
   État global UI — Balafon+ Guide.

   Le rôle actif N'EST PLUS stocké ici : il provient exclusivement
   de l'authentification JWT réelle (voir src/context/AuthContext).
   Ce store ne conserve que les préférences d'affichage.
   ============================================================ */

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  tone: "success" | "error" | "warning" | "info";
  action?: { label: string; onClick: () => void };
}

interface AppState {
  selectedDate: string;
  simOffsetMin: number;
  toasts: ToastItem[];
  setSelectedDate: (date: string) => void;
  setSimOffset: (minutes: number) => void;
  toast: (t: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
}

let toastSeq = 0;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      selectedDate: todayKey(),
      simOffsetMin: 0,
      toasts: [],
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
        selectedDate: s.selectedDate,
        simOffsetMin: s.simOffsetMin,
      }),
    }
  )
);

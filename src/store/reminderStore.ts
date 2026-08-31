import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isoLocal } from "../utils/time";

/* ============================================================
   Rappels téléspectateur — « Set Reminder » sur la fiche programme.
   Persistés en localStorage ; déclenchés par useReminderWatcher
   (toast + alerte) quand l'émission approche sur l'horloge simulée.
   ============================================================ */

export interface Reminder {
  id: string; // `${programId}|${date}|${startTime}`
  programId: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  createdAt: string;
  fired?: boolean;
}

interface ReminderState {
  list: Reminder[];
  add: (r: Omit<Reminder, "id" | "createdAt">) => Reminder;
  remove: (id: string) => void;
  has: (programId: string, date: string, startTime: string) => boolean;
  markFired: (id: string) => void;
}

const keyFor = (programId: string, date: string, startTime: string) =>
  `${programId}|${date}|${startTime}`;

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      list: [],
      add: (r) => {
        const id = keyFor(r.programId, r.date, r.startTime);
        if (get().list.some((x) => x.id === id)) return get().list.find((x) => x.id === id)!;
        const reminder: Reminder = { ...r, id, createdAt: isoLocal(new Date()) };
        set({ list: [...get().list, reminder].slice(0, 40) });
        return reminder;
      },
      remove: (id) => set({ list: get().list.filter((x) => x.id !== id) }),
      has: (programId, date, startTime) =>
        get().list.some((x) => x.id === keyFor(programId, date, startTime)),
      markFired: (id) =>
        set({ list: get().list.map((x) => (x.id === id ? { ...x, fired: true } : x)) }),
    }),
    { name: "balafon-reminders-v1" }
  )
);

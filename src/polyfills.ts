/* ============================================================
   Garde-fous d'environnement — importés EN PREMIER dans main.tsx,
   avant tous les modules applicatifs (stores Zustand, Planby…).

   Certains aperçus/iframes sandboxés bloquent l'accès à
   localStorage (SecurityError). Zustand persist lèverait alors
   une exception au montage des stores → écran noir. On installe
   un repli mémoire transparent si besoin.
   ============================================================ */

function storageWorks(storage: Storage): boolean {
  try {
    const key = "__balafon_probe__";
    storage.setItem(key, "1");
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function memoryStorage(): Storage {
  const mem = new Map<string, string>();
  return {
    get length() {
      return mem.size;
    },
    clear: () => mem.clear(),
    getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
    key: (i: number) => Array.from(mem.keys())[i] ?? null,
    removeItem: (k: string) => void mem.delete(k),
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
  };
}

if (typeof window !== "undefined") {
  try {
    if (!storageWorks(window.localStorage)) {
      Object.defineProperty(window, "localStorage", {
        value: memoryStorage(),
        configurable: true,
      });
    }
  } catch {
    try {
      Object.defineProperty(window, "localStorage", {
        value: memoryStorage(),
        configurable: true,
      });
    } catch {
      /* environnement extrêmement restreint — on continue sans persistance */
    }
  }

  try {
    if (!storageWorks(window.sessionStorage)) {
      Object.defineProperty(window, "sessionStorage", {
        value: memoryStorage(),
        configurable: true,
      });
    }
  } catch {
    /* idem */
  }
}

export {};

import { Component, useEffect, type ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { PublicNavbar } from "./components/layout/PublicNavbar";
import { PublicFooter } from "./components/layout/PublicFooter";
import { StaffShell } from "./components/layout/StaffShell";
import { PublicHome } from "./pages/public/PublicHome";
import { PublicGuide } from "./pages/public/PublicGuide";
import { PublicReplay } from "./pages/public/PublicReplay";
import { ProgramDetails } from "./pages/public/ProgramDetails";
import { DemoPage } from "./pages/DemoPage";
import { StudioDashboard } from "./pages/staff/StudioDashboard";
import { AdminBuilder } from "./pages/staff/AdminBuilder";
import { DirecteurKanban, GridsPage } from "./pages/staff/DirecteurKanban";
import { RegieControl } from "./pages/staff/RegieControl";
import { ComptesPage } from "./pages/staff/ComptesPage";
import { ProgramLibrary } from "./pages/staff/ProgramLibrary";
import { AlertCenter } from "./pages/staff/AlertCenter";
import { GridHistory } from "./pages/staff/GridHistory";
import { SettingsPage } from "./pages/staff/SettingsPage";
import { ToastHost } from "./components/ui";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { useScheduleStore } from "./store/scheduleStore";
import { useAlertStore } from "./store/alertStore";
import { useAppStore } from "./store/appStore";
import { useThemeStore } from "./store/themeStore";
import { buildSeedData } from "./data/schedules";
import { todayKey } from "./utils/time";
import { fetchGrillesValidees, isBackendConfigured } from "./services/backend";
import { connectAlertStream } from "./services/realtime";

/* ============================================================
   ErrorBoundary — aucun écran blanc : toute erreur runtime
   est affichée de façon lisible avec l’état de l’application.
   ============================================================ */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Visible en console pour le diagnostic
    console.error("[BALAFON + GUIDE] Erreur d’interface :", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#050505] p-6">
          <div className="w-full max-w-lg rounded-2xl border border-[#EF4444]/40 bg-[#111622] p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EF4444]/15">
                <AlertTriangle size={20} className="text-[#EF4444]" />
              </span>
              <div>
                <h1 className="font-black uppercase tracking-tight text-[#F7F8FA]">
                  Balafon <span className="text-balafon">+ Guide</span>
                </h1>
                <p className="text-[12px] font-semibold text-[#9CA3AF]">
                  Une erreur d’affichage est survenue
                </p>
              </div>
            </div>
            <pre className="mt-5 max-h-40 overflow-auto rounded-xl border border-[#2A3142] bg-[#0B0E14] p-4 font-mono text-[11.5px] leading-relaxed text-[#EF4444]">
              {this.state.error.message}
            </pre>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("balafon-schedule-v2");
                  localStorage.removeItem("balafon-app-v1");
                  window.location.reload();
                }}
                className="flex items-center gap-2 rounded-xl bg-balafon px-5 py-2.5 text-[13px] font-extrabold text-white transition-transform hover:scale-[1.02]"
              >
                <RotateCcw size={14} /> Réinitialiser et recharger
              </button>
              <button
                type="button"
                onClick={() => this.setState({ error: null })}
                className="rounded-xl border border-[#2A3142] px-5 py-2.5 text-[13px] font-bold text-[#9CA3AF] hover:text-[#F7F8FA]"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function PublicShell() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#F7F8FA]">
      <PublicNavbar />
      <main>
        <Routes>
          <Route index element={<PublicHome />} />
          <Route path="guide" element={<PublicGuide />} />
          <Route path="replay" element={<PublicReplay />} />
          <Route path="program/:id" element={<ProgramDetails />} />
          <Route path="*" element={<Navigate to="/tv" replace />} />
        </Routes>
      </main>
      <PublicFooter />
    </div>
  );
}

/* ============================================================
   Périmètre d'erreur par page : une page qui échoue affiche son
   diagnostic dans le shell, sans casser la navigation.
   ============================================================ */
class PageBoundary extends Component<{ label: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto my-10 max-w-lg rounded-2xl border border-[#EF4444]/40 bg-[#111622] p-6">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#9CA3AF]">
            {this.props.label} — erreur d’affichage
          </p>
          <pre className="mt-3 max-h-32 overflow-auto rounded-lg border border-[#2A3142] bg-[#0B0E14] p-3 font-mono text-[11px] text-[#EF4444]">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 rounded-lg bg-balafon px-4 py-2 text-[12.5px] font-extrabold text-white"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const page = (label: string, el: ReactNode) => (
  <PageBoundary label={label}>{el}</PageBoundary>
);

function AnimatedOutlet() {
  const location = useLocation();
  /* Transition simple (fondu d'entrée uniquement) : aucune animation de
     sortie bloquante — la navigation ne peut jamais rester en suspens. */
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <Routes location={location}>
        <Route path="/tv/*" element={<PublicShell />} />
        <Route path="/login" element={page("Connexion", <LoginPage />)} />
        <Route
          path="/studio"
          element={
            <ProtectedRoute>
              <StaffShell />
            </ProtectedRoute>
          }
        >
          <Route index element={page("Pilotage", <StudioDashboard />)} />
          <Route path="admin" element={page("Constructeur EPG", <AdminBuilder />)} />
          <Route path="directeur" element={page("Validation éditoriale", <DirecteurKanban />)} />
          <Route path="comptes" element={page("Comptes & équipe", <ComptesPage />)} />
          <Route path="regie" element={page("Régie", <RegieControl />)} />
          <Route path="programmes" element={page("Bibliothèque", <ProgramLibrary />)} />
          <Route path="grilles" element={page("Grilles", <GridsPage />)} />
          <Route path="alertes" element={page("Alertes", <AlertCenter />)} />
          <Route path="historique" element={page("Historique", <GridHistory />)} />
          <Route path="parametres" element={page("Paramètres", <SettingsPage />)} />
          <Route path="*" element={<Navigate to="/studio" replace />} />
        </Route>
        <Route path="/demo" element={page("Démo", <DemoPage />)} />
        <Route path="*" element={<Navigate to="/tv" replace />} />
      </Routes>
    </motion.div>
  );
}

function Root() {
  /* Synchronise le thème (sombre / clair) sur <html> */
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("theme-light", theme === "light");
    el.style.colorScheme = theme;
  }, [theme]);

  /* ============================================================
     Amorçage :
     1. démo locale (catalogue embarqué) — toujours disponible ;
     2. si VITE_API_URL répond → hydratation depuis Django
        (GET /api/grilles/?statut=validee, adaptateur Planby) ;
     3. si VITE_WS_URL est défini → flux d’alertes temps réel
        (Django Channels) injecté dans l’alertStore.
     ============================================================ */
  useEffect(() => {
    let stopStream: (() => void) | undefined;
    let cancelled = false;

    const boot = async () => {
      try {
        useScheduleStore.getState().ensureSeed();
        const alertState = useAlertStore.getState();
        if (alertState.alerts.length === 0) alertState.setAlerts(buildSeedData().alerts);
        /* Garde-fou : une date sélectionnée obsolète revient sur aujourd’hui */
        const app = useAppStore.getState();
        if (app.selectedDate < todayKey()) app.setSelectedDate(todayKey());

        if (isBackendConfigured()) {
          const grilles = await fetchGrillesValidees();
          if (!cancelled && grilles) {
            useScheduleStore.getState().hydrateFromApi(grilles);
            console.info("[BALAFON + GUIDE] EPG hydraté depuis l’API Django.");
          }
        }

        stopStream = connectAlertStream((payload) => {
          if (cancelled) return;
          useAlertStore.getState().addAlert({
            severity: payload.severite ?? "info",
            title: payload.titre ?? payload.title ?? "Alerte temps réel",
            message: payload.message ?? "Notification reçue du backend (WebSocket).",
            source: payload.source ?? "system",
            actionRequired: (payload.severite ?? "info") === "critical",
          });
        });
      } catch (e) {
        console.error("[BALAFON + GUIDE] Erreur d’amorçage des données :", e);
      }
    };

    void boot();
    return () => {
      cancelled = true;
      stopStream?.();
    };
  }, []);

  return (
    <HashRouter>
      <AnimatedOutlet />
      <ToastHost />
    </HashRouter>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      /* Stratégie de cache : données fraîches 5 min, conservées 30 min
         (la grille reste consultable hors-ligne par la régie). */
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      networkMode: "offlineFirst",
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

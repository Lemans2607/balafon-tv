import { Component, lazy, Suspense, useEffect, type ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { PublicNavbar } from "./components/layout/PublicNavbar";
import { PublicFooter } from "./components/layout/PublicFooter";
import { StaffShell } from "./components/layout/StaffShell";
import { PublicHome } from "./pages/public/PublicHome";
import { ToastHost } from "./components/ui";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { useScheduleStore } from "./store/scheduleStore";
import { useAlertStore } from "./store/alertStore";
import { useAppStore } from "./store/appStore";
import { useThemeStore } from "./store/themeStore";
import { buildSeedData } from "./data/schedules";
import { todayKey } from "./utils/time";
import { fetchGrillesValidees, isBackendConfigured } from "./services/backend";
import { connectAlertStream } from "./services/realtime";

/* ============================================================
   Chargement différé — le bundle initial ne contient que le
   portail d'accueil ; le Studio, l'EPG Planby et Recharts sont
   chargés à la demande (navigation plus rapide, moins de risques
   d'écran vide sur les connexions lentes).
   ============================================================ */
const PublicGuide = lazy(() => import("./pages/public/PublicGuide").then((m) => ({ default: m.PublicGuide })));
const PublicReplay = lazy(() => import("./pages/public/PublicReplay").then((m) => ({ default: m.PublicReplay })));
const ProgramDetails = lazy(() => import("./pages/public/ProgramDetails").then((m) => ({ default: m.ProgramDetails })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const StudioDashboard = lazy(() => import("./pages/staff/StudioDashboard").then((m) => ({ default: m.StudioDashboard })));
const AdminBuilder = lazy(() => import("./pages/staff/AdminBuilder").then((m) => ({ default: m.AdminBuilder })));
const DirecteurKanban = lazy(() => import("./pages/staff/DirecteurKanban").then((m) => ({ default: m.DirecteurKanban })));
const GridsPage = lazy(() => import("./pages/staff/DirecteurKanban").then((m) => ({ default: m.GridsPage })));
const RegieControl = lazy(() => import("./pages/staff/RegieControl").then((m) => ({ default: m.RegieControl })));
const ComptesPage = lazy(() => import("./pages/staff/ComptesPage").then((m) => ({ default: m.ComptesPage })));
const ProgramLibrary = lazy(() => import("./pages/staff/ProgramLibrary").then((m) => ({ default: m.ProgramLibrary })));
const AlertCenter = lazy(() => import("./pages/staff/AlertCenter").then((m) => ({ default: m.AlertCenter })));
const GridHistory = lazy(() => import("./pages/staff/GridHistory").then((m) => ({ default: m.GridHistory })));
const SettingsPage = lazy(() => import("./pages/staff/SettingsPage").then((m) => ({ default: m.SettingsPage })));

/* Écran de chargement Balafon — jamais d'écran noir. */
export function BootLoader({ label = "Chargement de l'antenne…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-5 py-16">
      <div className="flex items-end gap-1.5" aria-hidden>
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            className={`w-2.5 rounded-t bg-balafon ${["eq-bar1", "eq-bar2", "eq-bar3"][i % 3]}`}
            style={{ height: `${22 + ((i * 13) % 34)}px`, animationDelay: `${i * 0.09}s` }}
          />
        ))}
      </div>
      <p className="font-display text-[22px] uppercase tracking-[0.08em] text-paper">
        Balafon <span className="text-balafon">TV</span>
      </p>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-mist-dark">{label}</p>
    </div>
  );
}

/* ============================================================
   ErrorBoundary — aucun écran blanc : toute erreur runtime est
   affichée de façon lisible avec un chemin de sortie clair.
   ============================================================ */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[BALAFON + GUIDE] Erreur d'interface :", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#050505] p-6">
          <div className="w-full max-w-lg rounded-2xl border border-[#EF4444]/40 bg-[#111622] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EF4444]/15">
                <AlertTriangle size={20} className="text-[#EF4444]" />
              </span>
              <div>
                <h1 className="font-black uppercase tracking-tight text-[#F7F8FA]">
                  Balafon <span className="text-balafon">+ Guide</span>
                </h1>
                <p className="text-[12px] font-semibold text-[#9CA3AF]">
                  Une erreur d'affichage est survenue
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
                  localStorage.removeItem("balafon-schedule-v3");
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

/* Transition de vue façon application native (fondu + élévation). */
function AnimatedOutlet({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* Limite d'erreur propre à chaque page (le reste de l'app survit). */
class PageBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/5 p-6">
          <p className="text-[14px] font-extrabold text-[#EF4444]">Cette section a rencontré un problème.</p>
          <p className="mt-1 font-mono text-[11.5px] text-[#9CA3AF]">{this.state.error.message}</p>
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

function PublicShell() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <PublicNavbar />
      <main className="flex-1">
        <Routes>
          <Route index element={page("Accueil", <PublicHome />)} />
          <Route path="guide" element={page("Guide TV", <PublicGuide />)} />
          <Route path="replay" element={page("Replay", <PublicReplay />)} />
          <Route path="program/:id" element={page("Programme", <ProgramDetails />)} />
          <Route path="*" element={<Navigate to="/tv" replace />} />
        </Routes>
      </main>
      <PublicFooter />
    </div>
  );
}

function page(title: string, node: ReactNode) {
  return (
    <AnimatedOutlet>
      <PageBoundary>
        <Suspense fallback={<BootLoader />}>{node}</Suspense>
      </PageBoundary>
    </AnimatedOutlet>
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

  /* Garde-fou : tout rôle obsolète persisté (anciens "public" / "admin")
     bascule sur la Direction d'Antenne — le super admin du site. */
  useEffect(() => {
    const app = useAppStore.getState();
    if (app.role !== "directeur" && app.role !== "regie") {
      app.setRole("directeur");
    }
  }, []);

  /* ============================================================
     Amorçage :
     1. démo locale (catalogue embarqué) — toujours disponible ;
     2. si VITE_API_URL répond → hydratation depuis Django ;
     3. si VITE_WS_URL est défini → flux d'alertes temps réel.
     ============================================================ */
  useEffect(() => {
    let stopStream: (() => void) | undefined;
    let cancelled = false;

    const boot = async () => {
      try {
        useScheduleStore.getState().ensureSeed();
        const alertState = useAlertStore.getState();
        if (alertState.alerts.length === 0) alertState.setAlerts(buildSeedData().alerts);
        const app = useAppStore.getState();
        if (app.selectedDate < todayKey()) app.setSelectedDate(todayKey());

        if (isBackendConfigured()) {
          const grilles = await fetchGrillesValidees();
          if (!cancelled && grilles) {
            useScheduleStore.getState().hydrateFromApi(grilles);
            console.info("[BALAFON + GUIDE] EPG hydraté depuis l'API Django.");
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
        console.error("[BALAFON + GUIDE] Erreur d'amorçage des données :", e);
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
      <Routes>
        <Route index element={<Navigate to="/tv" replace />} />
        <Route path="/login" element={page("Connexion", <LoginPage />)} />
        <Route path="/tv/*" element={<PublicShell />} />
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
          <Route path="grilles" element={page("Grilles", <GridsPage />)} />
          <Route path="comptes" element={page("Comptes & équipe", <ComptesPage />)} />
          <Route path="regie" element={page("Régie", <RegieControl />)} />
          <Route path="programmes" element={page("Bibliothèque", <ProgramLibrary />)} />
          <Route path="alertes" element={page("Alertes", <AlertCenter />)} />
          <Route path="historique" element={page("Historique", <GridHistory />)} />
          <Route path="parametres" element={page("Paramètres", <SettingsPage />)} />
          <Route path="*" element={<Navigate to="/studio" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/tv" replace />} />
      </Routes>
      <ToastHost />
    </HashRouter>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60_000, // la grille reste fraîche 5 min
      gcTime: 30 * 60_000, // conservée 30 min en cache (consultation hors-ligne)
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

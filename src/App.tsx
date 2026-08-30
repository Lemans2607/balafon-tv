import { Component, useEffect, type ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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
import { ProgramLibrary } from "./pages/staff/ProgramLibrary";
import { AlertCenter } from "./pages/staff/AlertCenter";
import { GridHistory } from "./pages/staff/GridHistory";
import { SettingsPage } from "./pages/staff/SettingsPage";
import { ToastHost } from "./components/ui";
import { useScheduleStore } from "./store/scheduleStore";
import { useAlertStore } from "./store/alertStore";
import { useAppStore } from "./store/appStore";
import { buildSeedData } from "./data/schedules";
import { todayKey } from "./utils/time";

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
                  Balafon <span className="text-[#FF3D00]">+ Guide</span>
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
                className="flex items-center gap-2 rounded-xl bg-[#FF3D00] px-5 py-2.5 text-[13px] font-extrabold text-white transition-transform hover:scale-[1.02]"
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

function AnimatedOutlet() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <Routes location={location}>
          <Route path="/tv/*" element={<PublicShell />} />
          <Route path="/studio/*" element={<StaffShell />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="*" element={<Navigate to="/tv" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function Root() {
  /* Amorçage : données de démonstration + re-seed quotidien */
  useEffect(() => {
    try {
      useScheduleStore.getState().ensureSeed();
      const alertState = useAlertStore.getState();
      if (alertState.alerts.length === 0) alertState.setAlerts(buildSeedData().alerts);
      /* Garde-fou : une date sélectionnée obsolète revient sur aujourd’hui */
      const app = useAppStore.getState();
      if (app.selectedDate < todayKey()) app.setSelectedDate(todayKey());
    } catch (e) {
      console.error("[BALAFON + GUIDE] Erreur d’amorçage des données :", e);
    }
  }, []);

  return (
    <HashRouter>
      <AnimatedOutlet />
      <ToastHost />
    </HashRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  );
}

import { useEffect } from "react";
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { PublicNavbar } from "./components/layout/PublicNavbar";
import { PublicFooter } from "./components/layout/PublicFooter";
import { StaffShell } from "./components/layout/StaffShell";
import { ToastHost } from "./components/ui";
import { useScheduleStore } from "./store/scheduleStore";
import { useAlertStore } from "./store/alertStore";
import { useAppStore } from "./store/appStore";
import { buildSeedData } from "./data/schedules";
import { todayKey } from "./utils/time";
import { DemoPage } from "./pages/DemoPage";
import { PublicHome } from "./pages/public/PublicHome";
import { PublicGuide } from "./pages/public/PublicGuide";
import { PublicReplay } from "./pages/public/PublicReplay";
import { ProgramDetails } from "./pages/public/ProgramDetails";
import { StudioDashboard } from "./pages/staff/StudioDashboard";
import { AdminBuilder } from "./pages/staff/AdminBuilder";
import { DirecteurKanban, GridsPage } from "./pages/staff/DirecteurKanban";
import { RegieControl } from "./pages/staff/RegieControl";
import { ProgramLibrary } from "./pages/staff/ProgramLibrary";
import { AlertCenter } from "./pages/staff/AlertCenter";
import { GridHistory } from "./pages/staff/GridHistory";
import { SettingsPage } from "./pages/staff/SettingsPage";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function PublicLayout() {
  return (
    <div className="min-h-screen bg-ink-950">
      <PublicNavbar />
      <main>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}

export default function App() {
  /* Amorçage : données de démonstration + re-seed quotidien */
  useEffect(() => {
    useScheduleStore.getState().ensureSeed();
    const alertState = useAlertStore.getState();
    if (alertState.alerts.length === 0) alertState.setAlerts(buildSeedData().alerts);
    /* Garde-fou : une date sélectionnée obsolète revient sur aujourd’hui */
    const app = useAppStore.getState();
    if (app.selectedDate < todayKey()) app.setSelectedDate(todayKey());
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/demo" element={<DemoPage />} />

          {/* ===== Module A — Portail public Balafon TV ===== */}
          <Route path="/tv" element={<PublicLayout />}>
            <Route index element={<PublicHome />} />
            <Route path="guide" element={<PublicGuide />} />
            <Route path="replay" element={<PublicReplay />} />
            <Route path="program/:id" element={<ProgramDetails />} />
          </Route>

          {/* ===== Module B — Back-office Balafon Studio ===== */}
          <Route path="/studio" element={<StaffShell />}>
            <Route index element={<StudioDashboard />} />
            <Route path="admin" element={<AdminBuilder />} />
            <Route path="directeur" element={<DirecteurKanban />} />
            <Route path="regie" element={<RegieControl />} />
            <Route path="programmes" element={<ProgramLibrary />} />
            <Route path="grilles" element={<GridsPage />} />
            <Route path="alertes" element={<AlertCenter />} />
            <Route path="historique" element={<GridHistory />} />
            <Route path="parametres" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/demo" replace />} />
        </Routes>
        <ToastHost />
      </HashRouter>
    </MotionConfig>
  );
}

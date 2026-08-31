import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ClipboardCheck,
  History,
  KanbanSquare,
  LayoutDashboard,
  Library,
  Menu,
  MonitorPlay,
  Settings,
  CalendarRange,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { useAlertStore } from "../../store/alertStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useVmixStore, VMIX_STATUS_META } from "../../store/vmixStore";
import { useNow } from "../../hooks/useNow";
import { formatClock } from "../../utils/time";
import { USERS } from "../../data/schedules";
import { BALAFON_LOGO_URI } from "../planby/planbyMappers";
import { Button, Drawer } from "../ui";
import type { AppRole } from "../../types";

/* Le Directeur d'Antenne EST l'administrateur de la plateforme :
   il gère les comptes ET les grilles, et seul il valide. */
const NAV: Array<{ to: string; label: string; icon: React.ReactNode; roles: AppRole[]; end?: boolean }> = [
  { to: "/studio", label: "Pilotage", icon: <LayoutDashboard size={16} />, roles: ["admin", "directeur", "regie"], end: true },
  { to: "/studio/admin", label: "Constructeur EPG", icon: <CalendarRange size={16} />, roles: ["admin", "directeur"] },
  { to: "/studio/directeur", label: "Validation éditoriale", icon: <ClipboardCheck size={16} />, roles: ["admin", "directeur"] },
  { to: "/studio/comptes", label: "Comptes & équipe", icon: <Users size={16} />, roles: ["directeur"] },
  { to: "/studio/regie", label: "Régie · Mission Control", icon: <MonitorPlay size={16} />, roles: ["admin", "directeur", "regie"] },
  { to: "/studio/programmes", label: "Bibliothèque", icon: <Library size={16} />, roles: ["admin", "directeur"] },
  { to: "/studio/grilles", label: "Grilles", icon: <KanbanSquare size={16} />, roles: ["admin", "directeur"] },
  { to: "/studio/alertes", label: "Alertes", icon: <Bell size={16} />, roles: ["admin", "directeur", "regie"] },
  { to: "/studio/historique", label: "Historique", icon: <History size={16} />, roles: ["admin", "directeur", "regie"] },
  { to: "/studio/parametres", label: "Paramètres", icon: <Settings size={16} />, roles: ["admin", "directeur", "regie"] },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin Antenne",
  directeur: "Direction d’Antenne",
  regie: "Régie · Diffusion",
};

export function StaffShell() {
  const role = useAppStore((s) => s.role);
  const setRole = useAppStore((s) => s.setRole);
  const alerts = useAlertStore((s) => s.alerts);
  const vmixStatus = useVmixStore((s) => s.status);
  const dataSource = useScheduleStore((s) => s.source);
  const now = useNow(1000);
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (role === "public") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-900 bg-grid-faint p-6">
        <div className="w-full max-w-md rounded-2xl border border-ink-600 bg-ink-800 p-8 text-center">
          <img src={BALAFON_LOGO_URI} alt="" className="mx-auto h-14 w-14 rounded-xl" aria-hidden />
          <h1 className="mt-4 font-display text-[22px] font-black text-paper">Balafon Studio</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-mist">
            L’espace professionnel est réservé aux équipes. Choisissez un rôle de démonstration pour
            entrer sans rechargement.
          </p>
          <div className="mt-6 grid gap-2">
            {(["admin", "directeur", "regie"] as const).map((r) => (
              <Button
                key={r}
                variant="outline"
                onClick={() => {
                  setRole(r);
                  navigate("/studio");
                }}
              >
                Entrer en {ROLE_LABEL[r]}
              </Button>
            ))}
          </div>
          <Link to="/demo" className="mt-4 inline-block text-[12px] font-bold text-balafon hover:underline">
            Ouvrir la page des rôles (/demo)
          </Link>
        </div>
      </div>
    );
  }

  const user = USERS[role] ?? USERS.admin;
  const unacked = alerts.filter((a) => !a.acknowledged).length;
  const vMeta = VMIX_STATUS_META[vmixStatus];
  const currentNav = NAV.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/studio" className="flex items-center gap-2.5 px-5 py-5">
        <img src={BALAFON_LOGO_URI} alt="" className="h-9 w-9 rounded-[9px]" aria-hidden />
        <div>
          <p className="font-display text-[15px] font-black uppercase leading-none tracking-tight text-paper">
            Balafon <span className="text-balafon">Studio</span>
          </p>
          <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-mist-dark">
            Broadcast Control
          </p>
        </div>
      </Link>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Navigation studio">
        {NAV.filter((n) => n.roles.includes(role)).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-bold transition-colors ${
                isActive ? "bg-balafon/12 text-balafon" : "text-mist hover:bg-ink-800 hover:text-paper"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-balafon transition-opacity ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden
                />
                {n.icon}
                <span className="flex-1">{n.label}</span>
                {n.to === "/studio/alertes" && unacked > 0 && (
                  <span className="rounded-full bg-crit px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                    {unacked}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-ink-700 p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-balafon/20 text-[12px] font-extrabold text-balafon">
            {user.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-bold text-paper">{user.name}</p>
            <p className="truncate text-[10.5px] text-mist-dark">{user.roleLabel}</p>
          </div>
        </div>
        <Link
          to="/demo"
          className="mt-3 block rounded-lg border border-ink-600 px-3 py-2 text-center text-[11.5px] font-bold text-mist transition-colors hover:border-balafon hover:text-balafon"
        >
          Changer de rôle
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-900">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-[60] hidden w-60 border-r border-ink-700 bg-ink-850 lg:block">
        {sidebar}
      </aside>

      <div className="lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-[55] border-b border-ink-700 bg-ink-900/85 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              className="rounded-lg p-2 text-mist hover:bg-ink-800 hover:text-paper lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu studio"
            >
              <Menu size={18} />
            </button>
            <h1 className="font-display text-[15px] font-extrabold tracking-tight text-paper">
              {currentNav?.label ?? "Studio"}
            </h1>
            <span
              className="hidden rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider sm:inline"
              style={{ background: "rgba(242,121,15,0.14)", color: "#FFA14D" }}
            >
              {ROLE_LABEL[role]}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <span
                className="hidden items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-800 px-2.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-wide md:flex"
                style={{
                  color: dataSource === "api" ? "#00F5A0" : "#9CA3AF",
                  borderColor: dataSource === "api" ? "rgba(0,245,160,0.35)" : undefined,
                }}
                title={
                  dataSource === "api"
                    ? "Grilles chargées depuis l’API Django"
                    : "Mode démo — catalogue embarqué + localStorage"
                }
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${dataSource === "api" ? "bg-studio" : "bg-mist-dark"}`}
                  aria-hidden
                />
                {dataSource === "api" ? "API Django" : "Démo locale"}
              </span>
              <span
                className="hidden items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-800 px-2.5 py-1.5 text-[11px] font-bold sm:flex"
                style={{ color: vMeta.color }}
                title="Statut de la liaison vMix (simulation)"
              >
                {vmixStatus === "disconnected" ? <WifiOff size={12} aria-hidden /> : <Wifi size={12} aria-hidden />}
                vMix · {vMeta.label}
              </span>
              <span className="rounded-lg border border-ink-600 bg-ink-800 px-2.5 py-1.5 font-mono text-[12px] tabular-nums text-studio" aria-label="Heure studio">
                {formatClock(now)}
              </span>
              <Link
                to="/studio/alertes"
                className="relative rounded-lg p-2 text-mist transition-colors hover:bg-ink-800 hover:text-paper"
                aria-label={`Alertes — ${unacked} non acquittée(s)`}
              >
                <Bell size={17} />
                {unacked > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crit px-1 font-mono text-[9px] font-bold text-white">
                    {unacked}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>

        <main className="bg-grid-faint min-h-[calc(100vh-3.5rem)] p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Balafon Studio">
        <div className="-mx-4 -mt-4 h-full">{sidebar}</div>
      </Drawer>
    </div>
  );
}

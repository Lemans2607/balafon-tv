import { useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  KanbanSquare,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Radio,
  Users,
  X,
} from "lucide-react";
import type { Role } from "../types";
import { ROLES, ilYa, toHHMM } from "../utils/epg";
import { useNow, useStudio } from "../state/store";
import { LogoBalafon, ThemeToggle, useToast } from "../components/shared";

const NAV: { to: string; role: Role | null; label: string; Icon: typeof Radio; desc: string }[] = [
  { to: "/studio", role: null, label: "Tableau de bord", Icon: LayoutDashboard, desc: "Vue d'ensemble du Studio" },
  { to: "/studio/grilles", role: "admin", label: "Constructeur EPG", Icon: LayoutTemplate, desc: "Bibliothèque → Timeline 24h" },
  { to: "/studio/directeur", role: "directeur", label: "Validation Éditoriale", Icon: KanbanSquare, desc: "Kanban brouillons → antenne" },
  { to: "/studio/regie", role: "regie", label: "Régie Diffusion", Icon: Radio, desc: "Mission control live" },
  { to: "/studio/comptes", role: "directeur", label: "Comptes Studio", Icon: Users, desc: "Comptes back-office (API)" },
];

/** Route du rôle pour le switcheur (changement sans rechargement). */
export const ROUTE_ROLE: Record<Role, string> = {
  admin: "/studio/grilles",
  directeur: "/studio/directeur",
  regie: "/studio/regie",
};

/**
 * StaffShell — layout SaaS du back-office (sidebar + topbar).
 * La sidebar reste cinématographique (nuit) dans les deux thèmes ;
 * la zone de contenu suit le thème clair/sombre.
 */
export function StaffShell({ children }: { children: ReactNode }) {
  const { role, setRole, vmix, db, acquitter } = useStudio();
  const now = useNow(1000);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);

  const nbAlertes = db.alertes.filter((a) => !a.acquittee).length;

  const changerRole = (r: Role) => {
    setRole(r);
    navigate(ROUTE_ROLE[r]);
    toast.push({ type: "info", titre: `Vue ${ROLES[r].label}`, message: "Changement de rôle sans rechargement." });
  };

  return (
    <div className="min-h-screen bg-night text-ink">
      {/* Ambiance studio */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-studio-grid opacity-70" />
        <div className="absolute -top-40 right-[-120px] w-[520px] h-[520px] rounded-full bg-bred/[0.05] blur-[130px]" />
        <div className="absolute bottom-[-160px] left-[-120px] w-[460px] h-[460px] rounded-full bg-sgreen/[0.04] blur-[120px]" />
      </div>

      {/* ——— Sidebar (nuit, les deux thèmes) ——— */}
      <aside className="fixed inset-y-0 left-0 z-40 w-[236px] hidden lg:flex flex-col bg-[#0B0E14] border-r border-white/[0.06]">
        <div className="px-5 pt-6 pb-5 border-b border-white/[0.05]">
          <LogoBalafon compact clair />
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/30 mt-2.5">Studio · Broadcast Control</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto" aria-label="Navigation Studio">
          {NAV.map((n) => {
            const actif = n.to === "/studio" ? location.pathname === "/studio" : location.pathname.startsWith(n.to);
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/studio"}
                className={`group relative w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 ${
                  actif ? "bg-white/[0.06] shadow-card" : "hover:bg-white/[0.03]"
                }`}
              >
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full transition-all ${
                    actif ? "bg-bred" : "bg-transparent group-hover:bg-white/15"
                  }`}
                />
                <span className={`grid place-items-center w-9 h-9 rounded-lg flex-none transition-colors ${actif ? "bg-bred/15 text-bred" : "bg-white/[0.04] text-white/45 group-hover:text-white/75"}`}>
                  <n.Icon size={17} />
                </span>
                <span className="min-w-0">
                  <span className={`block text-[13px] font-bold truncate ${actif ? "text-white" : "text-white/60"}`}>{n.label}</span>
                  <span className="block text-[10px] text-white/30 truncate mt-0.5">{n.desc}</span>
                </span>
                {n.to === "/studio/regie" && nbAlertes > 0 && (
                  <span className="ml-auto flex-none font-mono text-[10px] font-bold bg-bred text-white rounded-full px-1.5 py-0.5 animate-blink-alert">
                    {nbAlertes}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.05] space-y-2">
          <Link
            to="/guide"
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[12px] font-bold text-white/55 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <ExternalLink size={15} /> Voir le Guide TV public
          </Link>
          <div className="rounded-xl border border-sgreen/20 bg-sgreen/[0.05] px-3.5 py-3">
            <p className="flex items-center gap-2 text-[11px] font-bold text-sgreen">
              <span className={`w-1.5 h-1.5 rounded-full ${vmix.syncing ? "bg-gold animate-blink-alert" : "bg-sgreen animate-pulse"}`} />
              API vMix : {vmix.syncing ? "Synchronisation…" : "Synchronisée"}
            </p>
            <p className="font-mono text-[9.5px] text-white/30 mt-1">
              dernière sync {vmix.lastSync ? toHHMM(new Date(vmix.lastSync).getHours() * 60 + new Date(vmix.lastSync).getMinutes()) : "—"} · mode démo
            </p>
          </div>
        </div>
      </aside>

      {/* ——— Colonne principale ——— */}
      <div className="lg:pl-[236px] relative">
        {/* Topbar (suit le thème) */}
        <header className="sticky top-0 z-30 glass-studio border-b border-line">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 sm:px-7 py-3">
            <div className="lg:hidden">
              <LogoBalafon compact />
            </div>

            {/* Switcheur de rôle (démo) */}
            <div className="flex items-center rounded-xl bg-night2 border border-line p-1" role="tablist" aria-label="Changement de rôle">
              {(["admin", "directeur", "regie"] as Role[]).map((r) => (
                <button
                  key={r}
                  role="tab"
                  aria-selected={role === r}
                  onClick={() => changerRole(r)}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-[11.5px] font-bold transition-all duration-200 ${
                    role === r ? "bg-bred text-white shadow-glow-red" : "text-inkfaint hover:text-ink"
                  }`}
                >
                  {ROLES[r].court}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Statut API vMix */}
            <button
              onClick={() => navigate("/studio/regie")}
              className={`hidden sm:inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                vmix.syncing ? "border-gold/40 text-gold bg-gold/[0.07]" : "border-sgreen/30 text-sgreen bg-sgreen/[0.06]"
              }`}
              title="Aller à la Régie"
            >
              <span className={`w-2 h-2 rounded-full ${vmix.syncing ? "bg-gold animate-blink-alert" : "bg-sgreen animate-pulse"}`} />
              API vMix : {vmix.syncing ? "Synchronisation…" : "Synchronisée"}
            </button>

            {/* Horloge temps réel (pas de contrôle de démo ici) */}
            <span className="hidden md:block font-mono text-[13px] font-semibold text-inksoft tabular-nums border border-line rounded-lg px-3 py-1.5 bg-night2">
              {toHHMM(now.getHours() * 60 + now.getMinutes())}
              <span className="text-inkfaint">:{String(now.getSeconds()).padStart(2, "0")}</span>
            </span>

            <ThemeToggle />

            <button
              onClick={() => setDrawer(true)}
              className="relative grid place-items-center w-9 h-9 rounded-lg border border-line text-inksoft hover:text-ink transition-colors"
              aria-label={`Alertes (${nbAlertes} actives)`}
            >
              <Bell size={16} />
              {nbAlertes > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-bred text-white text-[9px] font-black grid place-items-center animate-pulse-red">
                  {nbAlertes}
                </span>
              )}
            </button>

            <Link to="/login" className="grid place-items-center w-9 h-9 rounded-lg border border-line text-inksoft hover:text-bred hover:border-bred/40 transition-colors" title="Se déconnecter" aria-label="Se déconnecter">
              <LogOut size={16} />
            </Link>
          </div>

          {/* Nav mobile */}
          <nav className="lg:hidden flex gap-1.5 px-4 pb-2.5 overflow-x-auto no-scrollbar" aria-label="Navigation Studio mobile">
            {NAV.map((n) => {
              const actif = n.to === "/studio" ? location.pathname === "/studio" : location.pathname.startsWith(n.to);
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === "/studio"}
                  className={`flex-none inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-colors ${
                    actif ? "bg-bred text-white" : "bg-pane border border-line text-inksoft"
                  }`}
                >
                  <n.Icon size={13} /> {n.label}
                </NavLink>
              );
            })}
          </nav>
        </header>

        <main className="relative">{children}</main>

        <footer className="px-5 sm:px-7 py-6 text-[11px] text-inkfaint flex flex-wrap items-center justify-between gap-2">
          <span>Balafon+ Guide — Studio de gestion d'antenne · Balafon Media Group</span>
          <span>Dernière activité : {db.log[0] ? ilYa(db.log[0].ts) : "—"}</span>
        </footer>
      </div>

      {/* ——— Drawer alertes ——— */}
      {drawer && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/60 animate-fade" onClick={() => setDrawer(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-[min(380px,100vw)] glass-pane !border-y-0 !border-r-0 shadow-pop animate-rise overflow-y-auto" role="dialog" aria-label="Alertes temps réel">
            <header className="sticky top-0 glass-studio border-b border-line px-5 py-4 flex items-center gap-2.5">
              <Bell size={17} className="text-bred" />
              <h2 className="font-display font-bold text-[15px] tracking-tight">Alertes temps réel</h2>
              {nbAlertes > 0 && <span className="font-mono text-[10.5px] font-bold bg-bred text-white rounded-full px-2 py-0.5 animate-blink-alert">{nbAlertes}</span>}
              <button onClick={() => setDrawer(false)} className="ml-auto grid place-items-center w-8 h-8 rounded-lg text-inkfaint hover:text-ink hover:bg-pane2 transition-colors" aria-label="Fermer">
                <X size={16} />
              </button>
            </header>
            <div className="p-4 space-y-2.5">
              {db.alertes.length === 0 && <p className="text-center text-[12.5px] text-inkfaint py-10">Aucune alerte — antenne nominale.</p>}
              {db.alertes.map((a) => (
                <div key={a.id} className={`rounded-lg border p-3.5 ${a.acquittee ? "border-line bg-pane opacity-60" : "border-bred/40 bg-bred/[0.06]"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[10.5px] font-bold tabular-nums ${a.acquittee ? "text-inkfaint" : "text-bred"}`}>{a.heure}</span>
                    {a.acquittee ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-sgreen">
                        <CheckCheck size={10} /> Acquittée
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-wider text-bred bg-bred/15 border border-bred/35 rounded px-1.5 py-0.5">Action requise</span>
                    )}
                  </div>
                  <p className={`text-[12px] leading-snug mt-2 ${a.acquittee ? "text-inkfaint" : "text-inksoft"}`}>{a.texte}</p>
                  {!a.acquittee && (
                    <button
                      onClick={() => {
                        acquitter(a.id);
                        toast.push({ type: "succes", titre: "Alerte acquittée", message: "Action vMix confirmée." });
                      }}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-bred hover:bg-bred2 text-white text-[11.5px] font-bold px-3 py-1.5 transition-all active:scale-[0.97]"
                    >
                      <CheckCheck size={13} /> Acquitter
                    </button>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/** Compat ancien nom. */
export const BackOfficeShell = StaffShell;

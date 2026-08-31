import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, PlayCircle, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useScheduleStore } from "../../store/scheduleStore";
import { useCurrentProgram, useNow } from "../../hooks/useNow";
import { todayKey } from "../../utils/time";
import { CATEGORY_META } from "../../types";
import { BALAFON_LOGO_URI } from "../planby/planbyMappers";
import { Drawer } from "../ui";

export function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const navigate = useNavigate();
  const now = useNow(15000);
  const live = useCurrentProgram(todayKey(), now);
  const programs = useScheduleStore((s) => s.programs);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocus(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return programs
      .filter(
        (p) =>
          p.category !== "off-air" &&
          (p.title.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)))
      )
      .slice(0, 6);
  }, [query, programs]);

  const liveTitle =
    live.currentProgram && live.currentProgram.category !== "off-air"
      ? live.currentProgram.title
      : "Antenne en direct";

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-[13.5px] font-bold transition-colors ${
      isActive ? "text-balafon" : "text-mist hover:text-paper"
    }`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[70] border-b transition-all duration-300 ${
        scrolled
          ? "border-white/10 bg-ink-950/80 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          : "border-transparent bg-gradient-to-b from-black/70 to-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6" aria-label="Navigation principale">
        <Link to="/tv" className="flex items-center gap-2.5" aria-label="Balafon TV — Accueil">
          <img src={BALAFON_LOGO_URI} alt="" className="h-9 w-9 rounded-[9px]" aria-hidden />
          <span className="font-display text-[17px] font-black uppercase leading-none tracking-tight text-paper">
            Balafon <span className="text-balafon">TV</span>
            <span className="ml-1.5 rounded bg-balafon/15 px-1.5 py-0.5 align-middle text-[10px] font-extrabold tracking-widest text-balafon">
              +GUIDE
            </span>
          </span>
        </Link>

        <div className="ml-4 hidden items-center gap-1 md:flex">
          <NavLink to="/tv" end className={linkCls}>
            Accueil
          </NavLink>
          <NavLink to="/tv/guide" className={linkCls}>
            Guide TV
          </NavLink>
          <NavLink to="/tv/replay" className={linkCls}>
            Replay
          </NavLink>
        </div>

        <div ref={searchRef} className="relative ml-auto hidden md:block">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 transition-all focus-within:border-balafon/60 focus-within:bg-ink-800">
            <Search size={14} className="text-mist" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              placeholder="Rechercher une émission…"
              aria-label="Rechercher une émission"
              className="w-40 bg-transparent text-[13px] text-paper placeholder:text-mist-dark focus:w-56 focus:outline-none"
            />
          </div>
          <AnimatePresence>
            {searchFocus && results.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border border-ink-600 bg-ink-800 shadow-2xl"
              >
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setSearchFocus(false);
                        navigate(`/tv/program/${p.id}`);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-ink-700"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: CATEGORY_META[p.category].color }}
                        aria-hidden
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-bold text-paper">{p.title}</span>
                        <span className="text-[11px] uppercase tracking-wide text-mist-dark">
                          {CATEGORY_META[p.category].label} · {p.durationMinutes} min
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        <Link
          to="/tv"
          className="live-pulse ml-2 hidden items-center gap-1.5 rounded-lg bg-balafon px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-ink-950 sm:flex"
          aria-label={`En direct : ${liveTitle}`}
        >
          <PlayCircle size={13} aria-hidden />
          <span className="hidden lg:inline max-w-40 truncate">{liveTitle}</span>
          <span className="lg:hidden">Direct</span>
        </Link>

        <Link
          to="/demo"
          className="ml-1 hidden h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[11px] font-extrabold text-paper transition-colors hover:border-balafon sm:flex"
          aria-label="Espace Studio — changer de rôle"
          title="Espace Studio (démo)"
        >
          ST
        </Link>

        <button
          type="button"
          className="rounded-lg p-2 text-paper md:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>
      </nav>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Balafon TV">
        <div className="space-y-1">
          {[
            { to: "/tv", label: "Accueil" },
            { to: "/tv/guide", label: "Guide TV" },
            { to: "/tv/replay", label: "Replay" },
            { to: "/demo", label: "Espace Studio (démo)" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-3 text-[15px] font-bold text-paper transition-colors hover:bg-ink-700"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-mist-dark">
            <Search size={14} aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher une émission (mobile)"
              className="w-full bg-transparent text-[14px] text-paper placeholder:text-mist-dark focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche">
                <X size={14} />
              </button>
            )}
          </div>
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setQuery("");
                navigate(`/tv/program/${p.id}`);
              }}
              className="mt-1 block w-full rounded-lg px-3 py-2.5 text-left text-[13.5px] font-semibold text-mist hover:bg-ink-700 hover:text-paper"
            >
              {p.title}
              <span className="ml-2 text-[10.5px] uppercase text-mist-dark">{CATEGORY_META[p.category].label}</span>
            </button>
          ))}
        </div>
      </Drawer>
    </header>
  );
}

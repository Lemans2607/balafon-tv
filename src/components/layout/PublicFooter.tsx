import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { BALAFON_LOGO_URI } from "../planby/planbyMappers";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-ink-950">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <img src={BALAFON_LOGO_URI} alt="" className="h-9 w-9 rounded-[9px]" aria-hidden />
            <span className="font-display text-[16px] font-black uppercase tracking-tight text-paper">
              Balafon <span className="text-balafon">TV</span>
            </span>
          </div>
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-mist">
            La chaîne du Balafon Media Group, au cœur de Douala. Information, culture, sport et
            divertissement — en direct et en replay, 7 j/7.
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-mist-dark">
            <MapPin size={12} aria-hidden /> Rue Joss, Akwa — Douala, Cameroun · Fuseau Africa/Douala (WAT)
          </p>
        </div>
        <nav aria-label="Navigation pied de page">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-mist-dark">Regarder</p>
          <ul className="mt-3 space-y-2 text-[13px] font-semibold">
            <li><Link className="text-mist transition-colors hover:text-balafon" to="/tv">Le direct</Link></li>
            <li><Link className="text-mist transition-colors hover:text-balafon" to="/tv/guide">Guide TV (EPG)</Link></li>
            <li><Link className="text-mist transition-colors hover:text-balafon" to="/tv/replay">Replay</Link></li>
          </ul>
        </nav>
        <nav aria-label="Espace professionnel">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-mist-dark">Balafon Studio</p>
          <ul className="mt-3 space-y-2 text-[13px] font-semibold">
            <li><Link className="text-mist transition-colors hover:text-balafon" to="/demo">Accès Studio (démo)</Link></li>
            <li><Link className="text-mist transition-colors hover:text-balafon" to="/studio">Console de pilotage</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/5 py-4">
        <p className="mx-auto max-w-7xl px-4 text-[11.5px] text-mist-dark sm:px-6">
          © {new Date().getFullYear()} Balafon Media Group — Portail public dédié exclusivement à Balafon TV.
          Plateforme de démonstration : flux vidéo et liaison vMix simulés.
        </p>
      </div>
    </footer>
  );
}

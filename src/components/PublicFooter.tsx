import { Facebook, Instagram, Mail, MapPin, Phone, Satellite, Twitter, Youtube } from "lucide-react";
import { LogoBalafon, useToast } from "./shared";

/* ——— Réseaux de diffusion de Balafon TV (logos locaux stylisés) ——— */

const RESEAUX: { nom: string; canal: string; initiales: string; teinte: string }[] = [
  { nom: "Canal+", canal: "Canal 903", initiales: "C+", teinte: "#101010" },
  { nom: "StarTimes", canal: "Canal 747", initiales: "ST", teinte: "#C8102E" },
  { nom: "Creolink", canal: "Canal 301", initiales: "CR", teinte: "#0B7A3B" },
  { nom: "Swecom", canal: "Canal S43", initiales: "SW", teinte: "#1D4ED8" },
  { nom: "TV+", canal: "Canal 36", initiales: "T+", teinte: "#B45309" },
  { nom: "Amos 17", canal: "17° Est", initiales: "A17", teinte: "#374151" },
];

function LogoReseau({ r }: { r: (typeof RESEAUX)[number] }) {
  return (
    <svg width="40" height="26" viewBox="0 0 40 26" aria-hidden="true" className="flex-none rounded-md">
      <rect width="40" height="26" rx="6" fill={r.teinte} />
      <rect width="40" height="26" rx="6" fill="url(#none)" opacity="0" />
      <text x="20" y="17.5" fontFamily="Inter, Arial, sans-serif" fontSize="10.5" fontWeight="800" fill="#fff" textAnchor="middle">
        {r.initiales}
      </text>
      <rect x="6" y="21" width="12" height="1.6" rx="0.8" fill="#FF3D00" />
    </svg>
  );
}

/** Footer du portail public — Balafon TV uniquement. */
export function PublicFooter() {
  const toast = useToast();
  const lien = (label: string) => (
    <button
      key={label}
      onClick={() => toast.push({ type: "info", titre: label, message: "Section disponible prochainement sur Balafon+ Guide." })}
      className="block text-[13px] text-white/40 hover:text-white transition-colors py-1"
    >
      {label}
    </button>
  );

  return (
    <footer className="bg-black border-t border-white/[0.06] mt-20">
      {/* ——— Réseaux de diffusion ——— */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-5 lg:px-8 py-8">
          <p className="flex items-center gap-2.5 text-[10.5px] font-black uppercase tracking-[0.24em] text-white/30 mb-5">
            <Satellite size={14} className="text-bred" /> Retrouvez Balafon TV sur vos bouquets
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {RESEAUX.map((r) => (
              <div
                key={r.nom}
                className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05] hover:-translate-y-0.5"
              >
                <LogoReseau r={r} />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-white/85 truncate">{r.nom}</span>
                  <span className="block font-mono text-[10px] text-bred font-semibold tabular-nums">{r.canal}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-5 lg:px-8 pt-12 pb-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div>
            <LogoBalafon clair />
            <p className="text-[13px] text-white/40 leading-relaxed mt-4 max-w-[300px]">
              Balafon TV, la chaîne du groupe Balafon Media — information, divertissement, sport et culture, en direct de Douala.
            </p>
            <div className="flex gap-2 mt-5">
              {[Facebook, Twitter, Instagram, Youtube].map((I, i) => (
                <button
                  key={i}
                  onClick={() => toast.push({ type: "info", titre: "Réseaux sociaux", message: "Retrouvez Balafon TV sur tous les réseaux." })}
                  className="grid place-items-center w-8 h-8 rounded-full border border-white/10 text-white/50 hover:bg-bred hover:border-bred hover:text-white transition-all"
                  aria-label="Réseau social"
                >
                  <I size={14} />
                </button>
              ))}
            </div>
          </div>
          {[
            { t: "Navigation", items: ["Accueil", "Guide TV", "Replay", "Le direct"] },
            { t: "Légal", items: ["Conditions d'utilisation", "Confidentialité", "Cookies", "Mentions légales"] },
          ].map((col) => (
            <div key={col.t}>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30 mb-3">{col.t}</h4>
              {col.items.map(lien)}
            </div>
          ))}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30 mb-3">Contact</h4>
            <p className="flex items-center gap-2.5 text-[13px] text-white/40 py-1">
              <Mail size={14} className="text-bred" /> contact@balafon.cm
            </p>
            <p className="flex items-center gap-2.5 text-[13px] text-white/40 py-1">
              <Phone size={14} className="text-bred" /> +237 6 99 00 23 23
            </p>
            <p className="flex items-center gap-2.5 text-[13px] text-white/40 py-1">
              <MapPin size={14} className="text-bred" /> Rue Joss, Akwa — Douala
            </p>
          </div>
        </div>
        <div className="border-t border-white/[0.06] mt-10 pt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11.5px] text-white/30">© 2026 Balafon Media — Tous droits réservés.</p>
          <p className="text-[11.5px] text-white/30">
            BALAFON<span className="text-bred font-bold">+</span> GUIDE · conçu à Douala, Cameroun
          </p>
        </div>
      </div>
    </footer>
  );
}

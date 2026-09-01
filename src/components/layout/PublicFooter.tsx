import { Link } from "react-router-dom";
import { MapPin, Phone } from "lucide-react";
import { BALAFON_LOGO_URI } from "../planby/planbyMappers";

/* ============================================================
   Pied de page public — Balafon+ (Balafon Media Group)
   4 colonnes : Balafon+ (téléchargement) · Navigation · Contact · Suivez-nous
   + widget flottant WhatsApp / Appel (bas droite).

   Règle : aucun lien fictif — uniquement des URLs réelles.
   ============================================================ */

const NAVIGATION = [
  { label: "Accueil", to: "/tv" },
  { label: "Le direct", to: "/tv" },
  { label: "Guide TV", to: "/tv/guide" },
  { label: "Replay", to: "/tv/replay" },
  { label: "Balafon Studio", to: "/studio" },
];

const HOTLINE = "+237 650 25 25 50";
const HOTLINE_TEL = "+237650252550";
const WHATSAPP_URL = "https://wa.me/237650252550";

const STORES = [
  {
    label: "Télécharger sur l’App Store",
    small: "Télécharger sur l’",
    big: "App Store",
    href: "https://apps.apple.com/cm/app/balafon/id6762742157",
    icon: <AppleIcon />,
  },
  {
    label: "Disponible sur Google Play",
    small: "Disponible sur",
    big: "Google Play",
    href: "https://play.google.com/store/apps/details?id=com.balafon.media&pli=1",
    icon: <GooglePlayIcon />,
  },
];

const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/RadioBalafonOffciel/", icon: <FacebookIcon /> },
  { label: "X (Twitter)", href: "https://x.com/radio_balafon", icon: <XIcon /> },
  { label: "TikTok", href: "https://www.tiktok.com/@balafonmedia_903", icon: <TikTokIcon /> },
  { label: "YouTube", href: "https://www.youtube.com/channel/UCps1bAL4uyqH0W_pPynNQAA", icon: <YouTubeIcon /> },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/balafon-media-group", icon: <LinkedInIcon /> },
];

export function PublicFooter() {
  return (
    <>
      <footer className="border-t border-white/10 bg-ink-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* ---------------- Colonne 1 — Balafon+ (téléchargement) ---------------- */}
          <div>
            <div className="flex items-center gap-2.5">
              <img src={BALAFON_LOGO_URI} alt="" className="h-10 w-10 rounded-[10px]" aria-hidden />
              <span className="font-display text-[20px] font-black uppercase leading-none tracking-tight text-paper">
                Balafon<span className="text-balafon">+</span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-mist-dark">
              Balafon Media
            </p>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-mist">
              L’application officielle du Balafon Media Group. Retrouvez Balafon TV en direct, le
              replay et la grille des programmes — où que vous soyez, sur iOS et Android.
            </p>

            {/* Badges de téléchargement */}
            <div className="mt-5 flex flex-wrap gap-3">
              {STORES.map((s) => (
                <a
                  key={s.big}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="group flex items-center gap-2.5 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-balafon/60 hover:bg-white/[0.07]"
                >
                  <span className="text-paper transition-colors group-hover:text-balafon" aria-hidden>
                    {s.icon}
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[9.5px] font-semibold uppercase tracking-wider text-mist-dark">
                      {s.small}
                    </span>
                    <span className="block text-[14px] font-extrabold text-paper">{s.big}</span>
                  </span>
                </a>
              ))}
            </div>

            <a
              href="#telechargement"
              className="mt-4 inline-block text-[12.5px] font-bold text-balafon transition-colors hover:text-balafon-soft hover:underline"
            >
              Voir la page de téléchargement
            </a>
          </div>

          {/* ---------------- Colonne 2 — Navigation ---------------- */}
          <nav aria-label="Navigation pied de page">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-mist-dark">
              Navigation
            </p>
            <ul className="mt-4 space-y-2.5 text-[13.5px] font-semibold">
              {NAVIGATION.map((n) => (
                <li key={n.label}>
                  <Link
                    to={n.to}
                    className="text-mist transition-colors duration-150 hover:text-balafon"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* ---------------- Colonne 3 — Contact ---------------- */}
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-mist-dark">
              Contact
            </p>
            <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-mist">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-balafon" aria-hidden />
                <span>
                  Rue Joss, Akwa
                  <br />
                  Douala — Cameroun
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Phone size={14} className="mt-0.5 shrink-0 text-balafon" aria-hidden />
                <span>
                  Hotline{" "}
                  <a
                    href={`tel:${HOTLINE_TEL}`}
                    className="font-mono font-bold text-paper transition-colors hover:text-balafon"
                  >
                    {HOTLINE}
                  </a>
                </span>
              </li>
            </ul>
          </div>

          {/* ---------------- Colonne 4 — Suivez-nous ---------------- */}
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-mist-dark">
              Suivez-nous
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-mist transition-all duration-200 hover:-translate-y-1 hover:border-balafon/60 hover:bg-balafon hover:text-white"
                >
                  {s.icon}
                </a>
              ))}
            </div>
            <p className="mt-4 max-w-[220px] text-[12px] leading-relaxed text-mist-dark">
              Toute l’actualité du groupe, en continu, sur vos réseaux préférés.
            </p>
          </div>
        </div>

        {/* Barre de copyright — marges bas + droite réservées au widget flottant
            (positionné fixed en bas à droite, ~72×130 px) pour éviter tout chevauchement. */}
        <div className="border-t border-white/5 py-5 pb-32 md:pb-32">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 pr-24 sm:px-6 sm:pr-24 md:flex-row md:items-center md:justify-between md:pr-28">
            <p className="text-[11.5px] text-mist-dark">
              © {new Date().getFullYear()} Balafon Media Group — Tous droits réservés.
            </p>
            <p className="text-[11.5px] text-mist-dark">
              Balafon TV · Douala, Cameroun · Fuseau Africa/Douala (WAT)
            </p>
          </div>
        </div>
      </footer>

      {/* ---------------- Widget flottant WhatsApp + Appel ---------------- */}
      <FloatingContact />
    </>
  );
}

/* ============================================================
   Widget flottant — WhatsApp (vert) + Appel (brand), bas droite.
   z-index sous la navbar (z-70), au-dessus du contenu.
   ============================================================ */
function FloatingContact() {
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Discuter avec Balafon Media sur WhatsApp"
        title="Message en direct — WhatsApp"
        className="flex h-13 w-13 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.4)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(37,211,102,0.55)]"
      >
        <WhatsAppIcon />
      </a>
      <a
        href={`tel:${HOTLINE_TEL}`}
        aria-label={`Appeler Balafon Media au ${HOTLINE}`}
        title={`Appeler — ${HOTLINE}`}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-balafon text-white shadow-[0_8px_24px_rgba(227,30,36,0.4)] transition-all duration-200 hover:-translate-y-1 hover:bg-balafon-soft hover:shadow-[0_12px_30px_rgba(227,30,36,0.55)]"
      >
        <Phone size={18} aria-hidden />
      </a>
    </div>
  );
}

/* ============================================================
   Icônes de marques (SVG pleins, viewBox 24×24, currentColor)
   ============================================================ */
function SvgBase({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

const PATHS = {
  facebook:
    "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  tiktok:
    "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  youtube:
    "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z",
  whatsapp:
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
  apple:
    "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702",
  googleplay:
    "M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.25-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm3.35-4.31c.34.27.59.68.59 1.19s-.22.89-.57 1.16l-2.29 1.32-2.5-2.48 2.5-2.48 2.27 1.29zM6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z",
};

function FacebookIcon() {
  return <SvgBase d={PATHS.facebook} />;
}
function XIcon() {
  return <SvgBase d={PATHS.x} />;
}
function TikTokIcon() {
  return <SvgBase d={PATHS.tiktok} />;
}
function YouTubeIcon() {
  return <SvgBase d={PATHS.youtube} />;
}
function LinkedInIcon() {
  return <SvgBase d={PATHS.linkedin} />;
}
function WhatsAppIcon() {
  return <SvgBase d={PATHS.whatsapp} size={22} />;
}
function AppleIcon() {
  return <SvgBase d={PATHS.apple} size={22} />;
}
function GooglePlayIcon() {
  return <SvgBase d={PATHS.googleplay} size={20} />;
}

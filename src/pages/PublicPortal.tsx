import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  Moon,
  Play,
  Plus,
  Search,
  User,
} from "lucide-react";
import type { Programme } from "../types";
import { IMG, PROGRAMMES } from "../data/mock";
import { CATS, aSuivreAujourdhui, enDirectMaintenant, finBlocLabel, jourIdxAujourdhui, slotDebutMin, slotLabel, toHHMM } from "../utils/epg";
import { useNow, useStudio } from "../state/store";
import { LogoBalafon, ProgressBar, useToast } from "../components/shared";
import { PublicFooter } from "../components/PublicFooter";

const REPLAYS: { prog: Programme; badge: string }[] = [
  { prog: PROGRAMMES.find((p) => p.id === "p-makossa-live")!, badge: "REPLAY" },
  { prog: PROGRAMMES.find((p) => p.id === "p-elite-one")!, badge: "REPLAY" },
  { prog: PROGRAMMES.find((p) => p.id === "p-serie")!, badge: "NOUVEAU" },
  { prog: PROGRAMMES.find((p) => p.id === "p-debat")!, badge: "REPLAY" },
  { prog: PROGRAMMES.find((p) => p.id === "p-lions")!, badge: "EXCLUSIF" },
  { prog: PROGRAMMES.find((p) => p.id === "p-bikutsi")!, badge: "REPLAY" },
  { prog: PROGRAMMES.find((p) => p.id === "p-doc-terres")!, badge: "REPLAY" },
  { prog: PROGRAMMES.find((p) => p.id === "p-cuisine")!, badge: "REPLAY" },
];

export function PublicPortal() {
  const { grilleAntenne, role } = useStudio();
  const toast = useToast();
  const navigate = useNavigate();
  const now = useNow(15_000);

  const [scrolled, setScrolled] = useState(false);
  const [recherche, setRecherche] = useState("");
  const replRail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const live = useMemo(() => enDirectMaintenant(grilleAntenne, PROGRAMMES, now), [grilleAntenne, now]);
  const suivants = useMemo(() => aSuivreAujourdhui(grilleAntenne, PROGRAMMES, now).slice(0, 7), [grilleAntenne, now]);

  const resultats =
    recherche.trim().length > 1
      ? PROGRAMMES.filter((p) => p.titre.toLowerCase().includes(recherche.trim().toLowerCase())).slice(0, 6)
      : [];

  const liveMeta = live
    ? {
        titre: live.prog.titre,
        debut: slotLabel(live.bloc.slot),
        fin: finBlocLabel(live.bloc.slot, live.prog.duree),
        cat: live.prog.categorie,
        desc: live.prog.description,
        image: live.prog.image,
        enDirect: true,
        progres: live.progres,
      }
    : {
        titre: suivants[0]?.prog.titre ?? "L'antenne reprend à 06:00",
        debut: suivants[0] ? slotLabel(suivants[0].bloc.slot) : "06:00",
        fin: suivants[0] ? finBlocLabel(suivants[0].bloc.slot, suivants[0].prog.duree) : "",
        cat: suivants[0]?.prog.categorie ?? ("culture" as const),
        desc: suivants[0]?.prog.description ?? "Balafon TV vous retrouve dès 06:00 avec la Matinale.",
        image: suivants[0]?.prog.image,
        enDirect: false,
        progres: 0,
      };

  const regarder = () =>
    toast.push({
      type: liveMeta.enDirect ? "succes" : "info",
      titre: liveMeta.enDirect ? "Flux live lancé" : "Programme à venir",
      message: liveMeta.enDirect
        ? `« ${liveMeta.titre} » — lecture simulée du flux Balafon TV.`
        : `Rendez-vous à ${liveMeta.debut} sur Balafon TV.`,
    });

  return (
    <div className="min-h-screen bg-void text-white">
      {/* ——— Navbar glassmorphism ——— */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "glass border-b border-white/[0.06]" : "bg-gradient-to-b from-black/85 to-transparent"}`}>
        <div className="max-w-[1280px] mx-auto px-5 lg:px-8 h-[68px] flex items-center gap-8">
          <Link to="/" aria-label="Accueil Balafon TV">
            <LogoBalafon clair />
          </Link>
          <nav className="hidden md:flex items-center gap-7">
            <Link to="/" className="relative text-[13.5px] font-semibold text-white">
              Accueil
              <span className="absolute -bottom-[6px] left-0 right-0 h-[2.5px] rounded-full bg-bred" />
            </Link>
            <Link to="/guide" className="text-[13.5px] font-semibold text-white/55 hover:text-white transition-colors">
              Guide TV
            </Link>
            <button onClick={() => document.getElementById("replays")?.scrollIntoView({ behavior: "smooth" })} className="text-[13.5px] font-semibold text-white/55 hover:text-white transition-colors">
              Replay
            </button>
          </nav>
          <div className="flex-1" />

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher…"
              className={`rounded-full bg-white/[0.07] border border-white/10 pl-9 pr-3.5 py-1.5 text-[13px] font-medium placeholder:text-white/30 transition-all duration-300 focus:border-bred/60 outline-none ${
                recherche ? "w-[200px] sm:w-[240px]" : "w-[40px] sm:w-[150px] focus:w-[200px] sm:focus:w-[240px]"
              }`}
              aria-label="Rechercher un programme"
            />
            {resultats.length > 0 && (
              <div className="absolute top-[calc(100%+10px)] right-0 w-[min(330px,calc(100vw-2rem))] glass-pane rounded-xl shadow-pop p-2 animate-scale-in">
                {resultats.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setRecherche("");
                      navigate("/guide");
                    }}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.05] transition-colors text-left"
                  >
                    <span className="w-2 h-2 rounded-full flex-none" style={{ background: CATS[p.categorie].color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold truncate">{p.titre}</span>
                      <span className="block text-[10.5px] text-white/40">{CATS[p.categorie].label} · {p.duree >= 60 ? `${p.duree / 60} h` : `${p.duree} min`}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {role ? (
            <Link
              to="/studio"
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-bred hover:bg-bred2 px-4 py-1.5 text-[12.5px] font-bold shadow-glow-red transition-colors"
            >
              <User size={14} /> Studio
            </Link>
          ) : (
            <Link to="/login" className="hidden sm:grid place-items-center w-9 h-9 rounded-full border border-white/15 hover:border-white/45 transition-colors" aria-label="Espace staff">
              <User size={16} />
            </Link>
          )}
        </div>
      </header>

      {/* ——— Hero : Le Boulevard du Direct ——— */}
      <section className="relative h-[90vh] min-h-[560px] overflow-hidden">
        {/* Décor du lecteur simulé — couches non interactives, empilées sous le contenu */}
        <div className="absolute inset-0 z-[1] pointer-events-none" aria-hidden="true">
          <img src={IMG.billboard} alt="" className="w-full h-full object-cover animate-kenburns" />
          <div className="absolute inset-0 bg-gradient-to-r from-void via-void/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-void via-void/80 to-transparent" />
          <div className="absolute inset-0 bg-noise opacity-60" />
        </div>

        <div className="relative z-[2] max-w-[1280px] mx-auto px-5 lg:px-8 h-full flex flex-col justify-end pb-16">
          <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: "easeOut" }} className="max-w-[640px]">
            {liveMeta.enDirect ? (
              <span className="inline-flex items-center gap-2 bg-bred text-white text-[11px] font-black tracking-[0.14em] px-3 py-1.5 rounded shadow-glow-red">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse-red" /> EN DIRECT
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-white/80 text-[11px] font-black tracking-[0.14em] px-3 py-1.5 rounded">
                <Moon size={12} /> À VENIR
              </span>
            )}

            <h1 className="font-display font-black text-[44px] sm:text-[62px] leading-[1.02] tracking-tight mt-5 drop-shadow-[0_8px_30px_rgba(0,0,0,0.8)]">
              {liveMeta.titre}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 text-[13px] font-semibold text-white/75">
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <Clock3 size={14} className="text-bred" /> {liveMeta.debut}{liveMeta.fin ? ` – ${liveMeta.fin}` : ""}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: CATS[liveMeta.cat].color }} />
                {CATS[liveMeta.cat].label}
              </span>
              <span>Balafon TV</span>
              <span className="text-white/40">HD · Français</span>
            </div>

            <p className="text-[14.5px] text-white/60 leading-relaxed mt-4 max-w-[540px]">{liveMeta.desc}</p>

            {liveMeta.enDirect && (
              <div className="mt-5 max-w-[420px]">
                <ProgressBar value={liveMeta.progres} striped className="h-[6px]" />
                <p className="font-mono text-[11px] text-white/45 mt-1.5 tabular-nums">
                  {Math.round(liveMeta.progres)}% diffusé · fin à {liveMeta.fin}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3.5 mt-7">
              <button
                onClick={regarder}
                className="inline-flex items-center gap-2.5 bg-bred hover:bg-bred2 text-white font-bold text-[15px] px-7 py-3.5 rounded-xl shadow-glow-red transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              >
                <Play size={18} fill="currentColor" /> Regarder le Live
              </button>
              <Link
                to="/guide"
                className="inline-flex items-center gap-2.5 bg-white/[0.08] hover:bg-white/[0.14] border border-white/12 text-white font-bold text-[15px] px-6 py-3.5 rounded-xl backdrop-blur transition-all duration-200"
              >
                <CalendarDays size={17} /> Guide TV
              </Link>
            </div>
          </motion.div>

          {liveMeta.image && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="hidden lg:block absolute right-8 bottom-16 w-[220px]"
            >
              <img src={liveMeta.image} alt={liveMeta.titre} className="w-full aspect-[2/3] object-cover rounded-xl border border-white/15 shadow-pop" />
            </motion.div>
          )}
        </div>
      </section>

      {/* ——— Rail « En ce moment » ——— */}
      <section className="max-w-[1280px] mx-auto px-5 lg:px-8 -mt-6 relative z-10">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display font-extrabold text-[21px] tracking-tight flex items-center gap-2.5">
              <span className="w-[4px] h-[20px] rounded-full bg-bred" /> En ce moment
            </h2>
            <p className="text-[12px] text-white/35 mt-1 ml-[17px]">Le fil de l'antenne, minute par minute</p>
          </div>
          <Link to="/guide" className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] font-bold text-bred hover:underline underline-offset-4">
            Grille complète <ChevronRight size={14} />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {live && (
            <button onClick={regarder} className="group relative flex-none w-[320px] sm:w-[360px] rounded-xl overflow-hidden bg-[#101010] border border-bred/40 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-pop">
              <div className="relative aspect-video overflow-hidden">
                {live.prog.image ? (
                  <img src={live.prog.image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full transition-transform duration-500 group-hover:scale-105" style={{ background: `linear-gradient(140deg, ${CATS[live.prog.categorie].color}38, #0d0d0d 80%)` }}>
                    <div className="w-full h-full bg-noise" />
                  </div>
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 bg-bred text-white text-[9.5px] font-black px-2 py-1 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-blink-alert" /> EN DIRECT
                </span>
                <div className="absolute bottom-0 inset-x-0 p-3.5">
                  <p className="font-mono text-[10.5px] text-white/60 tabular-nums">{slotLabel(live.bloc.slot)} – {finBlocLabel(live.bloc.slot, live.prog.duree)}</p>
                  <p className="font-display font-bold text-[15px] leading-tight mt-1 truncate">{live.prog.titre}</p>
                  <div className="mt-2.5">
                    <ProgressBar value={live.progres} striped className="h-[4px]" />
                    <p className="font-mono text-[10px] text-bred font-bold mt-1 tabular-nums">{Math.round(live.progres)}%</p>
                  </div>
                </div>
              </div>
            </button>
          )}

          {suivants.map(({ bloc, prog }) => (
            <Link key={bloc.id} to="/guide" className="group relative flex-none w-[320px] sm:w-[360px] rounded-xl overflow-hidden bg-[#101010] border border-white/[0.07] hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-pop">
              <div className="relative aspect-video overflow-hidden">
                {prog.image ? (
                  <img src={prog.image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full transition-transform duration-500 group-hover:scale-105" style={{ background: `linear-gradient(140deg, ${CATS[prog.categorie].color}30, #0d0d0d 80%)` }}>
                    <div className="w-full h-full bg-noise" />
                  </div>
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                <span className="absolute top-2.5 left-2.5 text-[9.5px] font-black text-white/70 border border-white/15 bg-black/45 backdrop-blur px-2 py-1 rounded">
                  À SUIVRE
                </span>
                <div className="absolute bottom-0 inset-x-0 p-3.5">
                  <p className="font-mono text-[10.5px] text-bred font-bold tabular-nums">{slotLabel(bloc.slot)} · {toHHMM(slotDebutMin(bloc.slot))}</p>
                  <p className="font-display font-bold text-[15px] leading-tight mt-1 truncate">{prog.titre}</p>
                  <p className="text-[11px] text-white/40 mt-1">{CATS[prog.categorie].label} · {prog.duree >= 60 ? `${prog.duree / 60} h` : `${prog.duree} min`}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ——— Rail Replays & VOD ——— */}
      <section id="replays" className="max-w-[1280px] mx-auto px-5 lg:px-8 mt-14 scroll-mt-24">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display font-extrabold text-[21px] tracking-tight flex items-center gap-2.5">
              <span className="w-[4px] h-[20px] rounded-full bg-gold" /> Replays & VOD
            </h2>
            <p className="text-[12px] text-white/35 mt-1 ml-[17px]">Les émissions de Balafon TV, à la demande</p>
          </div>
          <div className="hidden md:flex gap-2">
            <button onClick={() => replRail.current?.scrollBy({ left: -600, behavior: "smooth" })} className="grid place-items-center w-9 h-9 rounded-full border border-white/10 hover:border-white/35 transition-colors" aria-label="Précédent">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => replRail.current?.scrollBy({ left: 600, behavior: "smooth" })} className="grid place-items-center w-9 h-9 rounded-full border border-white/10 hover:border-white/35 transition-colors" aria-label="Suivant">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div ref={replRail} className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {REPLAYS.map(({ prog, badge }) => (
            <div key={prog.id + badge} className="group relative flex-none w-[176px] sm:w-[196px]">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/[0.07] transition-all duration-300 group-hover:border-white/25 group-hover:shadow-pop">
                {prog.image ? (
                  <img src={prog.image} alt={prog.titre} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full transition-transform duration-300 group-hover:scale-105" style={{ background: `linear-gradient(165deg, ${CATS[prog.categorie].color}45 0%, #0c0c0c 90%)` }}>
                    <div className="w-full h-full bg-noise flex items-end p-3">
                      <History size={26} className="text-white/25" />
                    </div>
                  </div>
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25" />
                <span className="absolute top-2.5 left-2.5 bg-gold text-night text-[8.5px] font-black tracking-wide px-1.5 py-0.5 rounded">{badge}</span>

                {/* Overlay hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5">
                  <p className="font-display font-bold text-[14px] leading-tight">{prog.titre}</p>
                  <p className="text-[10.5px] text-white/50 mt-1">{CATS[prog.categorie].label} · {prog.duree >= 60 ? `${prog.duree / 60} h` : `${prog.duree} min`}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => toast.push({ type: "succes", titre: "Lecture lancée", message: `« ${prog.titre} » — replay simulé.` })}
                      className="grid place-items-center w-8 h-8 rounded-full bg-bred text-white shadow-glow-red hover:scale-110 transition-transform"
                      aria-label="Lire"
                    >
                      <Play size={13} fill="currentColor" />
                    </button>
                    <button
                      onClick={() => toast.push({ type: "info", titre: "Ajouté à ma liste", message: prog.titre })}
                      className="grid place-items-center w-8 h-8 rounded-full border border-white/25 text-white/80 hover:bg-white/10 transition-colors"
                      aria-label="Ajouter à ma liste"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[12px] font-semibold text-white/70 mt-2 truncate">{prog.titre}</p>
              <p className="text-[10.5px] text-white/35">{CATS[prog.categorie].label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ——— Footer (réseaux de diffusion + liens) ——— */}
      <PublicFooter />
    </div>
  );
}

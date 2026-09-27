import { useMemo, useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Info, 
  Clock, 
  Calendar, 
  ChevronRight, 
  Tv, 
  Radio, 
  Search,
  Filter,
  Star,
  TrendingUp,
  Zap
} from "lucide-react";

import { useAppStore } from "../../store/appStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useNow, useCurrentProgram } from "../../hooks/useNow";
import { CATEGORY_META, type ProgramCategory } from "../../types";
import { todayKey, toMinutes, durationLabel } from "../../utils/time";
import { ProgramPoster } from "../../components/media/ProgramPoster";
import type { PlanbyEpgData } from "../../components/planby/planbyMappers";

// ============================================
// VARIANTES D'ANIMATION
// ============================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2
    }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] }
  }
};

const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.23, 1, 0.32, 1] }
  }
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export function EPGExperience() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const grids = useScheduleStore((s) => s.grids);
  const programs = useScheduleStore((s) => s.programs);
  const scheduleMap = useScheduleStore((s) => s.scheduleMap);
  const now = useNow(1000);
  const today = todayKey();
  const navigate = useNavigate();

  const [category, setCategory] = useState<ProgramCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const live = useCurrentProgram(today, now);
  const grid = grids[selectedDate];
  const published = grid?.published === true;
  const publishedToday = grids[today]?.published === true;

  // Filtrer les programmes
  const filteredPrograms = useMemo(() => {
    let progs = programs.filter(p => p.category !== "off-air");
    
    if (category !== "all") {
      progs = progs.filter(p => p.category === category);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      progs = progs.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    return progs.slice(0, 20);
  }, [programs, category, searchQuery]);

  // Obtenir les programmes du jour
  const todaySchedule = useMemo(() => {
    const items = scheduleMap[today] ?? [];
    const byId = new Map(programs.map((p) => [p.id, p]));
    return items
      .map(item => ({
        ...item,
        program: byId.get(item.programId)
      }))
      .filter(item => item.program && item.program.category !== "off-air")
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  }, [scheduleMap, today, programs]);

  // Programme en cours et suivants
  const currentProgram = todaySchedule.find(item => {
    const startMin = toMinutes(item.startTime);
    const endMin = toMinutes(item.endTime);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return nowMin >= startMin && nowMin < endMin;
  });

  const upcomingPrograms = todaySchedule.filter(item => {
    const startMin = toMinutes(item.startTime);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return startMin > nowMin;
  }).slice(0, 8);

  // Programmes mis en avant (populaires/premium)
  const featuredPrograms = useMemo(() => {
    return programs
      .filter(p => p.category !== "off-air")
      .slice(0, 5);
  }, [programs]);

  const handleProgramClick = (programId: string) => {
    navigate(`/tv/program/${programId}`);
  };

  const scrollToNow = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const CATEGORIES = [
    { id: "all", label: "Tout", icon: Tv },
    { id: "news", label: "Info", icon: Radio },
    { id: "talk", label: "Talk", icon: Zap },
    { id: "entertainment", label: "Divertissement", icon: Star },
    { id: "culture", label: "Culture", icon: Calendar },
    { id: "sport", label: "Sport", icon: TrendingUp },
    { id: "documentary", label: "Documentaire", icon: Info },
    { id: "series", label: "Série & Cinéma", icon: Play },
    { id: "music", label: "Musique", icon: Radio },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950 text-paper overflow-x-hidden">
      
      {/* ================= HERO SECTION CINÉMATIQUE ================= */}
      <motion.header
        className="relative h-[85vh] w-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      >
        {/* Background animé avec gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-balafon/20 via-ink-950 to-studio/10" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
        
        {/* Particules flottantes */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-balafon/30"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                opacity: 0
              }}
              animate={{
                y: [null, Math.random() * -200],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-4xl"
          >
            {/* Badge En Direct */}
            {publishedToday && currentProgram && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-balafon/50 bg-balafon/20 px-4 py-2 backdrop-blur-md"
              >
                <span className="live-pulse flex items-center gap-2 rounded-full bg-balafon px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white">
                  <Radio size={10} /> EN DIRECT
                </span>
                <span className="text-[12px] font-semibold text-balafon">
                  {currentProgram.program?.title}
                </span>
              </motion.div>
            )}

            {/* Titre principal */}
            <motion.h1
              className="font-display text-[64px] font-black uppercase leading-none tracking-tighter sm:text-[88px] lg:text-[100px]"
              variants={fadeInUp}
            >
              Guide{" "}
              <span className="bg-gradient-to-r from-balafon via-orange-500 to-red-600 bg-clip-text text-transparent">
                TV
              </span>
            </motion.h1>

            {/* Sous-titre */}
            <motion.p
              className="mt-6 max-w-2xl text-[18px] font-medium leading-relaxed text-mist"
              variants={fadeInUp}
            >
              Découvrez la programmation de Balafon TV en temps réel. 
              Direct, replays et programmes à venir — une expérience immersive conçue pour les téléspectateurs exigeants.
            </motion.p>

            {/* Boutons d'action */}
            <motion.div
              className="mt-10 flex flex-wrap gap-4"
              variants={fadeInUp}
            >
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(227, 30, 36, 0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={scrollToNow}
                className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-balafon to-red-600 px-8 py-4 text-[14px] font-bold uppercase tracking-wide text-white shadow-2xl transition-all"
              >
                <Play size={18} className="fill-current" />
                Voir le direct
                <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-[14px] font-bold uppercase tracking-wide text-white backdrop-blur-md transition-all hover:border-white/40"
              >
                <Calendar size={18} />
                Programme complet
              </motion.button>
            </motion.div>

            {/* Stats rapides */}
            <motion.div
              className="mt-12 flex gap-8"
              variants={fadeInUp}
            >
              <div>
                <p className="text-[32px] font-black text-balafon">{todaySchedule.length}</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-mist">Émissions aujourd'hui</p>
              </div>
              <div>
                <p className="text-[32px] font-black text-studio">{upcomingPrograms.length}</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-mist">À venir</p>
              </div>
              <div>
                <p className="text-[32px] font-black text-ocean-soft">{programs.length}</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-mist">Programmes totaux</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-mist/60">Scroll</span>
            <div className="h-8 w-px bg-gradient-to-b from-balafon to-transparent" />
          </motion.div>
        </motion.div>
      </motion.header>

      {/* ================= BARRE DE RECHERCHE & FILTRES ================= */}
      <motion.section
        className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          {/* Barre de recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-mist/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une émission, un genre..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-[14px] text-paper placeholder:text-mist/50 focus:border-balafon/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-balafon/20"
            />
          </div>

          {/* Filtres rapides */}
          <div className="hidden items-center gap-2 lg:flex">
            <Filter className="h-4 w-4 text-mist/50" />
            <span className="text-[12px] font-semibold uppercase tracking-widest text-mist/70">Filtres:</span>
          </div>
        </div>

        {/* Catégories */}
        <div className="border-t border-white/5">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8 scrollbar-hide">
            {CATEGORIES.map((cat, index) => {
              const Icon = cat.icon;
              const isActive = category === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCategory(cat.id as ProgramCategory | "all")}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-bold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-balafon to-red-600 text-white shadow-lg shadow-balafon/30"
                      : "border border-white/10 bg-white/5 text-mist hover:border-white/30 hover:bg-white/10"
                  }`}
                >
                  <Icon size={14} />
                  {cat.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ================= CONTENU PRINCIPAL ================= */}
      <main ref={scrollRef} className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="space-y-16"
        >
          
          {/* Section: En ce moment */}
          {currentProgram && (
            <motion.section variants={slideInLeft}>
              <div className="mb-6 flex items-center gap-3">
                <div className="live-pulse flex h-10 w-10 items-center justify-center rounded-full bg-balafon/20">
                  <Radio size={18} className="text-balafon" />
                </div>
                <div>
                  <h2 className="font-display text-[28px] font-black uppercase tracking-tight">En ce moment</h2>
                  <p className="text-[13px] text-mist">Diffusion en cours · Fuseau Africa/Douala</p>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-800/50 to-ink-900/50 p-8 backdrop-blur-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-balafon/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                
                <div className="relative z-10 grid gap-8 lg:grid-cols-[400px_1fr]">
                  {/* Poster */}
                  <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                    <ProgramPoster
                      program={currentProgram.program!}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-transparent" />
                    
                    {/* Badge LIVE */}
                    <div className="absolute left-4 top-4">
                      <span className="live-pulse flex items-center gap-2 rounded-full bg-balafon px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-white">
                        <Radio size={12} /> EN DIRECT
                      </span>
                    </div>
                  </div>

                  {/* Infos */}
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-3">
                      <span
                        className="rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: CATEGORY_META[currentProgram.program!.category].color }}
                      >
                        {CATEGORY_META[currentProgram.program!.category].label}
                      </span>
                      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-mist">
                        <Clock size={14} />
                        {currentProgram.startTime} – {currentProgram.endTime}
                      </span>
                    </div>

                    <h3 className="mt-4 font-display text-[42px] font-black uppercase leading-none tracking-tight">
                      {currentProgram.program!.title}
                    </h3>

                    {currentProgram.program!.description && (
                      <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-mist">
                        {currentProgram.program!.description}
                      </p>
                    )}

                    {/* Progress bar */}
                    <div className="mt-6">
                      <div className="mb-2 flex justify-between text-[11px] font-semibold text-mist">
                        <span>Progression</span>
                        <span>{Math.round(((now.getHours() * 60 + now.getMinutes() - toMinutes(currentProgram.startTime)) / (toMinutes(currentProgram.endTime) - toMinutes(currentProgram.startTime))) * 100)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, ((now.getHours() * 60 + now.getMinutes() - toMinutes(currentProgram.startTime)) / (toMinutes(currentProgram.endTime) - toMinutes(currentProgram.startTime))) * 100)}%`
                          }}
                          transition={{ duration: 1 }}
                          className="h-full bg-gradient-to-r from-balafon to-red-600"
                        />
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleProgramClick(currentProgram.program!.id)}
                      className="mt-6 flex w-fit items-center gap-3 rounded-xl bg-balafon px-6 py-3 text-[13px] font-bold uppercase tracking-wide text-white transition-all hover:bg-balafon/90 hover:shadow-lg hover:shadow-balafon/30"
                    >
                      <Info size={16} />
                      Voir les détails
                      <ChevronRight size={16} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.section>
          )}

          {/* Section: À suivre */}
          <motion.section variants={fadeInUp}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-studio/20">
                  <Clock size={18} className="text-studio" />
                </div>
                <div>
                  <h2 className="font-display text-[28px] font-black uppercase tracking-tight">À suivre</h2>
                  <p className="text-[13px] text-mist">Les prochains programmes sur Balafon TV</p>
                </div>
              </div>
              <Link
                to="/tv"
                className="group flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-balafon transition-colors hover:text-balafon/80"
              >
                Voir tout
                <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AnimatePresence>
                {upcomingPrograms.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    onClick={() => handleProgramClick(item.program!.id)}
                    className="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-ink-800/50 to-ink-900/50 p-4 backdrop-blur-xl transition-all hover:border-white/20 hover:shadow-xl hover:shadow-balafon/10"
                  >
                    {/* Poster miniature */}
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10">
                      <ProgramPoster
                        program={item.program!}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-transparent" />
                      
                      {/* Heure */}
                      <div className="absolute right-2 top-2 rounded-md bg-ink-950/90 px-2 py-1 text-[10px] font-bold tabular-nums text-balafon backdrop-blur">
                        {item.startTime}
                      </div>
                    </div>

                    {/* Infos */}
                    <div className="mt-3">
                      <span
                        className="inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: CATEGORY_META[item.program!.category].color }}
                      >
                        {CATEGORY_META[item.program!.category].label}
                      </span>
                      <h4 className="mt-2 line-clamp-2 font-bold text-paper group-hover:text-balafon">
                        {item.program!.title}
                      </h4>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-mist">
                        <Clock size={11} />
                        {durationLabel(toMinutes(item.endTime) - toMinutes(item.startTime))}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* Section: Programmes populaires */}
          <motion.section variants={fadeInUp}>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20">
                <Star size={18} className="text-orange-500" />
              </div>
              <div>
                <h2 className="font-display text-[28px] font-black uppercase tracking-tight">Programmes phares</h2>
                <p className="text-[13px] text-mist">Les émissions incontournables de la semaine</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredPrograms.map((prog, index) => (
                <motion.div
                  key={prog.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -10, scale: 1.03 }}
                  onClick={() => handleProgramClick(prog.id)}
                  className="group cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-800/80 to-ink-900/80 backdrop-blur-xl transition-all hover:border-balafon/30 hover:shadow-2xl hover:shadow-balafon/20"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <ProgramPoster
                      program={prog}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent" />
                    
                    {/* Badge catégorie */}
                    <div className="absolute left-4 top-4">
                      <span
                        className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md"
                        style={{ backgroundColor: CATEGORY_META[prog.category].color + "CC" }}
                      >
                        {CATEGORY_META[prog.category].label}
                      </span>
                    </div>

                    {/* Durée */}
                    <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-ink-950/80 px-3 py-1.5 text-[11px] font-bold text-mist backdrop-blur-md">
                      <Clock size={12} />
                      {durationLabel(prog.durationMinutes)}
                    </div>

                    {/* Titre superposé */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="font-display text-[26px] font-black uppercase leading-none tracking-tight text-white drop-shadow-lg">
                        {prog.title}
                      </h3>
                      {prog.description && (
                        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-mist/90">
                          {prog.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer carte */}
                  <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-mist">
                      <Tv size={14} />
                      Balafon TV
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: 45 }}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-balafon/20 text-balafon transition-colors group-hover:bg-balafon group-hover:text-white"
                    >
                      <ChevronRight size={18} />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

        </motion.div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-white/5 bg-ink-950/50 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-widest text-mist/50">
            © {new Date().getFullYear()} Balafon TV · Tous droits réservés
          </p>
          <p className="mt-2 text-[11px] text-mist/30">
            Guide des programmes en temps réel · Fuseau horaire: Africa/Douala (WAT)
          </p>
        </div>
      </footer>
    </div>
  );
}

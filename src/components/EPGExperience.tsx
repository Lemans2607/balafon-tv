import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Info, Clock, Calendar, ChevronRight, Zap, TrendingUp, Volume2, Maximize } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { format, addMinutes, isSameDay, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

// --- Types ---
interface Program {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  category: string;
  imageUrl: string;
  rating?: string;
  isLive?: boolean;
}

interface Channel {
  id: string;
  name: string;
  logo: string;
  color: string;
  programs: Program[];
}

// --- Mock Data (À remplacer par vos données API) ---
const generateMockData = (): Channel[] => {
  const now = new Date();
  const startHour = now.getHours();
  
  const channels: Channel[] = [
    {
      id: 'c1',
      name: 'CinéMax',
      logo: 'CM',
      color: 'from-red-600 to-red-900',
      programs: [
        {
          id: 'p1',
          title: 'Inception',
          description: 'Un voleur qui s\'empare des secrets d\'entreprises à travers la technologie du partage de rêves se voit confier la tâche inverse : implanter une idée dans l\'esprit d\'un PDG.',
          startTime: addMinutes(startOfDay(now), (startHour - 1) * 60),
          endTime: addMinutes(startOfDay(now), (startHour + 1) * 60),
          category: 'Science-Fiction',
          imageUrl: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070&auto=format&fit=crop',
          rating: '9.8',
          isLive: true
        },
        {
          id: 'p2',
          title: 'Interstellar',
          description: 'Une équipe d\'explorateurs voyage à travers un trou de ver dans l\'espace dans une tentative d\'assurer la survie de l\'humanité.',
          startTime: addMinutes(startOfDay(now), (startHour + 1) * 60),
          endTime: addMinutes(startOfDay(now), (startHour + 4) * 60),
          category: 'Aventure',
          imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop',
          rating: '9.5'
        }
      ]
    },
    {
      id: 'c2',
      name: 'SportLive',
      logo: 'SL',
      color: 'from-blue-600 to-blue-900',
      programs: [
        {
          id: 'p3',
          title: 'Finale Champions League',
          description: 'Le match tant attendu oppose le Real Madrid à Manchester City. Une affiche de rêve pour cette finale européenne.',
          startTime: addMinutes(startOfDay(now), (startHour - 0.5) * 60),
          endTime: addMinutes(startOfDay(now), (startHour + 2) * 60),
          category: 'Football',
          imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=2070&auto=format&fit=crop',
          rating: 'Live',
          isLive: true
        },
        {
          id: 'p4',
          title: 'Magazine Foot',
          description: 'Retour sur les meilleurs buts de la semaine et analyses tactiques.',
          startTime: addMinutes(startOfDay(now), (startHour + 2) * 60),
          endTime: addMinutes(startOfDay(now), (startHour + 3) * 60),
          category: 'Magazine',
          imageUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1986&auto=format&fit=crop',
          rating: 'HD'
        }
      ]
    },
    {
      id: 'c3',
      name: 'DocuWorld',
      logo: 'DW',
      color: 'from-emerald-600 to-emerald-900',
      programs: [
        {
          id: 'p5',
          title: 'Planète Océan',
          description: 'Plongée au cœur des abysses pour découvrir des espèces jamais filmées auparavant.',
          startTime: addMinutes(startOfDay(now), (startHour - 2) * 60),
          endTime: addMinutes(startOfDay(now), startHour * 60),
          category: 'Nature',
          imageUrl: 'https://images.unsplash.com/photo-1582967788606-a171f1080ca8?q=80&w=2070&auto=format&fit=crop',
          rating: '4K'
        },
        {
          id: 'p6',
          title: 'Les Secrets des Pyramides',
          description: 'Une enquête archéologique pour comprendre comment ces monuments ont été construits.',
          startTime: addMinutes(startOfDay(now), startHour * 60),
          endTime: addMinutes(startOfDay(now), (startHour + 1.5) * 60),
          category: 'Histoire',
          imageUrl: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?q=80&w=2070&auto=format&fit=crop',
          rating: 'HD',
          isLive: true
        }
      ]
    }
  ];
  return channels;
};

// --- Components ---

const LiveBadge = () => (
  <motion.div 
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    className="flex items-center gap-1.5 px-3 py-1 bg-red-600/90 backdrop-blur-md rounded-full text-xs font-bold text-white shadow-[0_0_15px_rgba(220,38,38,0.6)] border border-red-400/30 z-20"
  >
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
    </span>
    EN DIRECT
  </motion.div>
);

const ProgressBar = ({ start, end }: { start: Date; end: Date }) => {
  const now = new Date();
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const percent = Math.min(Math.max((elapsed / total) * 100, 0), 100);

  if (now > end || now < start) return null;

  return (
    <div className="w-full h-1 bg-white/20 rounded-full mt-3 overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 1, ease: "easeInOut" }}
        className="h-full bg-gradient-to-r from-red-500 to-orange-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
      />
    </div>
  );
};

const ProgramCard = ({ program, channelColor, onClick }: { program: Program; channelColor: string; onClick: () => void }) => {
  const isLive = program.isLive || (new Date() >= program.startTime && new Date() <= program.endTime);
  
  return (
    <motion.div
      layoutId={`program-${program.id}`}
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative flex-shrink-0 w-[320px] h-[200px] rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 border border-white/10 bg-gray-900"
    >
      {/* Background Image with Parallax-like feel */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
        style={{ backgroundImage: `url(${program.imageUrl})` }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90 group-hover:opacity-80 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="absolute inset-0 p-5 flex flex-col justify-end">
        <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold tracking-wider text-white/80 uppercase bg-white/10 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10">
              {program.category}
            </span>
            {isLive && <LiveBadge />}
          </div>
          
          <h3 className="text-xl font-bold text-white mb-1 line-clamp-1 drop-shadow-md">{program.title}</h3>
          
          <div className="flex items-center gap-3 text-xs text-gray-300 mb-2">
            <span className="flex items-center gap-1"><Clock size={12} /> {format(program.startTime, 'HH:mm')} - {format(program.endTime, 'HH:mm')}</span>
            {program.rating && (
              <span className="flex items-center gap-1 text-yellow-400"><Zap size={12} fill="currentColor" /> {program.rating}</span>
            )}
          </div>

          {isLive && <ProgressBar start={program.startTime} end={program.endTime} />}
          
          <p className="text-sm text-gray-400 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 h-0 group-hover:h-auto overflow-hidden">
            {program.description}
          </p>
        </div>
      </div>

      {/* Hover Glow Effect */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br ${channelColor} pointer-events-none`} />
    </motion.div>
  );
};

const ChannelRow = ({ channel, onProgramClick }: { channel: Channel; onProgramClick: (p: Program) => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="mb-12 relative group"
    >
      {/* Channel Header (Sticky on Scroll within section) */}
      <div className="sticky top-24 z-10 flex items-center gap-4 mb-6 pl-4">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${channel.color} flex items-center justify-center text-white font-bold text-xl shadow-lg border border-white/20`}>
          {channel.logo}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{channel.name}</h2>
          <p className="text-sm text-gray-400">En direct & À venir</p>
        </div>
        <div className="ml-auto pr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors">
             <ChevronRight size={20} />
           </button>
        </div>
      </div>

      {/* Programs Scroll Container */}
      <div className="flex gap-6 overflow-x-auto pb-8 px-4 scrollbar-hide snap-x">
        {channel.programs.map((program) => (
          <ProgramCard 
            key={program.id} 
            program={program} 
            channelColor={channel.color}
            onClick={() => onProgramClick(program)}
          />
        ))}
        {/* Add placeholder for future content */}
        <div className="w-[320px] flex-shrink-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-white/10 text-white/20">
          <span className="text-sm">Plus de programmes bientôt</span>
        </div>
      </div>
    </motion.div>
  );
};

const HeroSection = ({ livePrograms }: { livePrograms: Program[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Auto-rotate featured live programs
  useEffect(() => {
    if (livePrograms.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % livePrograms.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [livePrograms]);

  const program = livePrograms[currentIndex];
  if (!program) return null;

  return (
    <div className="relative h-[85vh] w-full overflow-hidden">
      {/* Dynamic Background */}
      <motion.div
        key={program.id}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className="absolute inset-0"
      >
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${program.imageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 h-full container mx-auto px-6 flex flex-col justify-center pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={program.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: 'auto' }}
              className="inline-flex items-center gap-2 mb-6 overflow-hidden"
            >
              <LiveBadge />
              <span className="text-red-400 font-medium tracking-widest text-sm uppercase ml-2">À la une maintenant</span>
            </motion.div>

            <h1 className="text-6xl md:text-8xl font-black text-white mb-6 leading-tight tracking-tighter drop-shadow-2xl">
              {program.title}
            </h1>

            <div className="flex items-center gap-6 text-gray-300 mb-8 text-lg">
              <span className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10">{program.category}</span>
              <span className="flex items-center gap-2"><Clock size={20} /> {format(program.startTime, 'HH:mm')} - {format(program.endTime, 'HH:mm')}</span>
              <span className="flex items-center gap-2 text-yellow-400"><TrendingUp size={20} /> Tendance #1</span>
            </div>

            <p className="text-xl text-gray-300 mb-10 leading-relaxed max-w-2xl line-clamp-3 drop-shadow-md">
              {program.description}
            </p>

            <div className="flex gap-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              >
                <Play fill="black" size={24} />
                Regarder Maintenant
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-full font-bold text-lg border border-white/20 hover:border-white/40 transition-all"
              >
                <Info size={24} />
                Détails
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-10 right-10 z-20 flex gap-2">
        {livePrograms.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-white' : 'w-4 bg-white/30 hover:bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
};

const TimeRuler = () => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const currentHour = new Date().getHours();

  return (
    <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10 py-4 shadow-2xl">
      <div className="container mx-auto px-6 flex items-center justify-between overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 text-white mr-8">
          <Calendar size={20} className="text-red-500" />
          <span className="font-bold text-lg">{format(new Date(), 'EEEE d MMMM', { locale: fr })}</span>
        </div>
        
        <div className="flex gap-8 min-w-max px-4">
          {hours.map((hour) => {
            const isActive = hour === currentHour;
            const isPast = hour < currentHour;
            return (
              <div key={hour} className="flex flex-col items-center gap-2 cursor-pointer group">
                <span className={`text-xs font-medium transition-colors ${isActive ? 'text-red-500' : isPast ? 'text-gray-600' : 'text-gray-400 group-hover:text-white'}`}>
                  {isActive ? 'MAINTENANT' : `${hour.toString().padStart(2, '0')}:00`}
                </span>
                <div className={`h-1 w-full rounded-full transition-all duration-300 ${isActive ? 'w-8 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'w-4 bg-gray-800 group-hover:bg-gray-600'}`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

export default function EPGExperience() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simuler chargement API
    setTimeout(() => {
      setChannels(generateMockData());
      setLoading(false);
    }, 1000);
  }, []);

  const livePrograms = useMemo(() => {
    const now = new Date();
    const lives: Program[] = [];
    channels.forEach(ch => {
      ch.programs.forEach(p => {
        if (now >= p.startTime && now <= p.endTime) lives.push(p);
      });
    });
    return lives;
  }, [channels]);

  const handleProgramClick = (program: Program) => {
    console.log("Opening program details:", program.title);
    // Logique d'ouverture modal ou navigation
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-red-500 selection:text-white overflow-x-hidden">
      {/* Navigation Temporelle */}
      <TimeRuler />

      {/* Hero Section Immersive */}
      <HeroSection livePrograms={livePrograms} />

      {/* Grille des Chaînes */}
      <div className="container mx-auto px-6 py-12 -mt-20 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="h-1 w-12 bg-red-600 rounded-full" />
            <h2 className="text-3xl font-bold">Grille des Programmes</h2>
          </div>
          
          <div className="space-y-4">
            {channels.map((channel) => (
              <ChannelRow 
                key={channel.id} 
                channel={channel} 
                onProgramClick={handleProgramClick}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer Decorative */}
      <footer className="py-20 text-center text-gray-600 text-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        <p>© 2024 Votre Guide TV. L'expérience ultime.</p>
      </footer>
    </div>
  );
}
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Tv, Radio, CalendarDays } from "lucide-react";
import { BALAFON_LOGO_URI } from "../components/planby/planbyMappers";

/* ============================================================
   Composant d'introduction animé — Interface Publique Balafon TV
   S'affiche au premier chargement de l'application publique
   ============================================================ */

interface IntroProps {
  onComplete: () => void;
}

export function Intro({ onComplete }: IntroProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Séquence d'animation automatique
    const timers = [
      setTimeout(() => setStep(1), 400),   // Logo apparaît
      setTimeout(() => setStep(2), 1200),  // Tagline apparaît
      setTimeout(() => setStep(3), 2200),  // Icônes apparaissent
      setTimeout(() => setStep(4), 3400),  // Bouton apparaît
      setTimeout(() => onComplete(), 5000), // Auto-completion après 5s
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const handleSkip = () => {
    onComplete();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Arrière-plan animé */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-balafon/10 via-transparent to-studio/10" />
          <div className="glow-balafon absolute inset-0" />
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-balafon/30"
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 10,
                opacity: 0,
              }}
              animate={{
                y: -10,
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}
        </div>

        {/* Contenu principal */}
        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          {/* Logo Balafon TV */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={step >= 1 ? { scale: 1, opacity: 1, rotate: 0 } : {}}
            transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
            className="mb-6"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-balafon/20 blur-2xl" />
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-2 border-balafon/30 bg-ink-900/80 backdrop-blur-md shadow-[0_0_40px_rgba(227,30,36,0.4)]">
                <img
                  src={BALAFON_LOGO_URI}
                  alt="Balafon TV"
                  className="h-16 w-16 object-contain"
                />
              </div>
            </div>
          </motion.div>

          {/* Titre principal */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={step >= 1 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="font-display text-4xl font-black uppercase tracking-tight text-white sm:text-5xl md:text-6xl">
              Balafon{" "}
              <span className="text-balafon">TV</span>
            </h1>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={step >= 2 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-4 max-w-md text-lg font-medium text-mist sm:text-xl"
          >
            La télévision de référence au Cameroun
          </motion.p>

          {/* Icônes de fonctionnalités */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={step >= 3 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 flex items-center gap-6 sm:gap-10"
          >
            <FeatureIcon
              icon={<Tv size={28} />}
              label="Direct"
              delay={0}
              visible={step >= 3}
            />
            <FeatureIcon
              icon={<CalendarDays size={28} />}
              label="Guide TV"
              delay={0.15}
              visible={step >= 3}
            />
            <FeatureIcon
              icon={<Radio size={28} />}
              label="Replay"
              delay={0.3}
              visible={step >= 3}
            />
          </motion.div>

          {/* Bouton d'accès */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={step >= 4 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12"
          >
            <button
              onClick={handleSkip}
              className="group relative flex items-center gap-3 overflow-hidden rounded-full bg-balafon px-10 py-4 text-lg font-bold text-white shadow-[0_14px_40px_rgba(227,30,36,0.45)] transition-all duration-300 hover:-translate-y-1 hover:bg-balafon-soft hover:shadow-[0_20px_50px_rgba(227,30,36,0.55)] active:translate-y-0"
            >
              <motion.span
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Explorer
              </motion.span>
              <motion.div
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <Play size={20} className="transition-transform duration-300 group-hover:scale-110" />
              </motion.div>
              
              {/* Effet sheen */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.5, delay: 0.8, repeat: Infinity, repeatDelay: 2 }}
              />
            </button>
          </motion.div>

          {/* Indicateur de progression */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={step >= 1 ? { opacity: 1 } : {}}
            transition={{ delay: 1 }}
            className="mt-8 flex items-center gap-2"
          >
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step > i ? "w-6 bg-balafon" : step === i ? "w-4 bg-balafon/60" : "w-2 bg-ink-700"
                }`}
                initial={false}
                animate={{
                  width: step > i ? 24 : step === i ? 16 : 8,
                  backgroundColor: step > i ? "#E31E24" : step === i ? "rgba(227,30,36,0.6)" : "#1f2937",
                }}
              />
            ))}
          </motion.div>

          {/* Skip button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={step >= 2 ? { opacity: 1 } : {}}
            transition={{ delay: 1.5 }}
            onClick={handleSkip}
            className="mt-6 text-sm font-semibold uppercase tracking-widest text-mist-dark transition-colors hover:text-mist"
          >
            Passer
          </motion.button>
        </div>

        {/* Scanline effect */}
        <div className="scanline pointer-events-none absolute inset-0" />
      </motion.div>
    </AnimatePresence>
  );
}

function FeatureIcon({
  icon,
  label,
  delay,
  visible,
}: {
  icon: React.ReactNode;
  label: string;
  delay: number;
  visible: boolean;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ y: 20, opacity: 0, scale: 0.8 }}
      animate={visible ? { y: 0, opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.4, delay, type: "spring", stiffness: 300 }}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-balafon/30 bg-ink-900/60 text-balafon backdrop-blur-md shadow-lg">
        {icon}
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-mist">{label}</span>
    </motion.div>
  );
}

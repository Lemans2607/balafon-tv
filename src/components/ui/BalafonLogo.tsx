import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface BalafonLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  mode?: 'light' | 'dark';
  animated?: boolean;
}

export const BalafonLogo: React.FC<BalafonLogoProps> = ({ 
  className = '', 
  size = 'md',
  mode = 'dark',
  animated = false
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'h-8 w-auto',
    md: 'h-10 w-auto',
    lg: 'h-16 w-auto',
    xl: 'h-24 w-auto',
  };

  // Composant SVG Fallback (Dessin vectoriel du logo Balafon)
  const SvgLogo = () => (
    <motion.svg
      viewBox="0 0 200 60"
      className={`${sizeClasses[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      initial={animated ? { opacity: 0, scale: 0.9 } : {}}
      animate={animated ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5 }}
    >
      <defs>
        <linearGradient id="balafon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF3B30" />
          <stop offset="100%" stopColor="#FF6B00" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Symbole Balafon Stylisé */}
      <g transform="translate(10, 5)">
        <path
          d="M15,5 C8,5 5,10 5,20 C5,35 15,45 25,45 C35,45 40,35 40,25 C40,15 30,10 20,10 C15,10 12,12 12,15 C12,10 18,5 25,5 C35,5 45,15 45,25 C45,40 30,50 25,50 C10,50 0,35 0,20 C0,5 10,0 20,0"
          fill="url(#balafon-gradient)"
          stroke={mode === 'dark' ? '#ffffff' : '#1e293b'}
          strokeWidth="1.5"
          filter="url(#glow)"
        />
        {/* Cordes du Balafon */}
        <path
          d="M22,15 L22,35 M28,20 L28,30 M34,22 L34,28"
          stroke={mode === 'dark' ? '#0f172a' : '#ffffff'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Typographie */}
      <text
        x="65"
        y="38"
        fontFamily="'Inter', system-ui, sans-serif"
        fontWeight="800"
        fontSize="24"
        letterSpacing="1"
        fill={mode === 'dark' ? '#ffffff' : '#1e293b'}
      >
        BALAFON
        <tspan fontWeight="400" fontSize="20" fill={mode === 'dark' ? '#94a3b8' : '#64748b'}>TV</tspan>
      </text>
    </motion.svg>
  );

  if (imageError) {
    return <SvgLogo />;
  }

  return (
    <img
      src="/logo-balafon.png"
      alt="Balafon TV"
      className={`${sizeClasses[size]} ${className} object-contain`}
      onError={() => setImageError(true)}
      loading="eager"
    />
  );
};

export default BalafonLogo;
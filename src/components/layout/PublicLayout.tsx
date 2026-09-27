import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Menu, X, User } from 'lucide-react';
import BalafonLogo from '../ui/BalafonLogo';

export default function PublicLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/guide', label: 'Guide TV' },
    { to: '/replay', label: 'Replay' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white font-sans selection:bg-[#FF3B30] selection:text-white">
      
      {/* NAVBAR FIXE */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 bg-[#0B0E14]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          
          {/* GAUCHE: Logo Unique */}
          <Link to="/" className="flex items-center gap-3 group">
            <BalafonLogo size="md" mode="dark" animated />
            <span className="hidden sm:block text-[10px] font-bold tracking-[0.2em] text-[#FF3B30] uppercase bg-[#FF3B30]/10 px-2 py-0.5 rounded">
              +GUIDE
            </span>
          </Link>

          {/* CENTRE: Liens Navigation (Desktop) */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-medium transition-colors relative py-2 ${
                    isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF3B30]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* DROITE: Recherche & Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center bg-white/5 rounded-full px-4 py-2 border border-white/10 focus-within:border-[#FF3B30]/50 transition-colors">
              <Search className="w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Rechercher une émission..." 
                className="bg-transparent border-none outline-none text-sm ml-2 w-48 text-white placeholder-gray-500"
              />
            </div>
            
            <Link 
              to="/login"
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Espace Pro</span>
            </Link>

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="md:hidden bg-[#111827] border-b border-white/10 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block text-lg font-medium text-gray-300 hover:text-white"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </nav>

      {/* CONTENU DE LA PAGE */}
      <main className="pt-20 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
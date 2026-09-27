import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import BalafonLogo from '../../components/ui/BalafonLogo';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulation de connexion - À remplacer par votre logique d'auth réelle
    if (email && password) {
      navigate('/studio');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a1f2e,transparent_70%)]" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1586899028174-e7098604235b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-5 mix-blend-overlay" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-[#111827]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          
          {/* Logo Header */}
          <div className="flex justify-center mb-8">
            <BalafonLogo size="lg" mode="dark" animated />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Accès Régie</h1>
            <p className="text-gray-400 text-sm">Connectez-vous pour accéder au studio de diffusion</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Identifiant
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF3B30] focus:ring-1 focus:ring-[#FF3B30] transition-all"
                  placeholder="votre.email@balafon.tv"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF3B30] focus:ring-1 focus:ring-[#FF3B30] transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#FF3B30] hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg shadow-red-500/20"
            >
              Se connecter
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => navigate('/')}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              ← Retour à l'accueil
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
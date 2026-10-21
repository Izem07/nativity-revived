import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookMarked } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export function SplashScreen({ onComplete, durationMs = 2400 }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(onComplete, 400);
    }, durationMs);

    return () => window.clearTimeout(timeout);
  }, [durationMs, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden transition-colors ${
            isDark ? 'bg-zinc-950 text-white' : 'bg-slate-100 text-zinc-900'
          }`}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Atmospheric Ambient Glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full blur-[140px] ${
                isDark ? 'bg-brand-600/15' : 'bg-brand-400/25'
              }`}
            />
            <div
              className={`absolute top-1/3 left-1/3 h-[400px] w-[400px] rounded-full blur-[140px] ${
                isDark ? 'bg-violet-600/10' : 'bg-rose-400/20'
              }`}
            />
          </div>

          <motion.div
            className={`relative flex flex-col items-center gap-6 rounded-[2.5rem] px-14 py-12 text-center max-w-sm w-full mx-4 border backdrop-blur-2xl ${
              isDark
                ? 'bg-zinc-900/70 border-white/[0.08] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)_inset]'
                : 'bg-white/95 border-slate-200/90 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.06)_inset]'
            }`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Elegant Logo Emblem */}
            <motion.div
              className={`flex h-20 w-20 items-center justify-center rounded-3xl border shadow-sm ${
                isDark
                  ? 'bg-brand-500/10 border-brand-500/30'
                  : 'bg-brand-50 border-brand-200'
              }`}
              initial={{ rotate: -8, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 140, damping: 14 }}
            >
              <BookMarked className={`h-10 w-10 ${isDark ? 'text-brand-300' : 'text-brand-600'}`} />
            </motion.div>

            <div className="space-y-1.5">
              <motion.h1
                className={`font-serif text-3xl font-bold tracking-tight ${
                  isDark ? 'text-white' : 'text-zinc-900'
                }`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                Nativity
              </motion.h1>
              <motion.p
                className={`font-mono text-[10px] uppercase tracking-[0.25em] font-semibold ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                AP Lang Academic Engine
              </motion.p>
            </div>

            {/* Precision Progress Bar */}
            <div className={`h-1 w-44 overflow-hidden rounded-full ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200'}`}>
              <motion.div
                className="h-full bg-gradient-to-r from-brand-500 via-violet-500 to-cyan-400"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: durationMs / 1000, ease: 'easeInOut' }}
              />
            </div>

            <motion.p
              className={`text-[10px] leading-relaxed font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Pyintel · High School Academic Service
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SplashScreen;

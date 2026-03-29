import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { haptics } from '../lib/haptics';
import { cn } from '../lib/utils';

interface ChronoWaveProps {
  isActive?: boolean;
  type?: 'Mechanical Tension' | 'Metabolic Stress';
  compact?: boolean;
}

export const ChronoWave: React.FC<ChronoWaveProps> = ({ 
  isActive: externalActive, 
  type = 'Mechanical Tension',
  compact = false 
}) => {
  const [internalActive, setInternalActive] = useState(false);
  const isActive = externalActive !== undefined ? externalActive : internalActive;
  const [phase, setPhase] = useState<'descent' | 'ascent'>('descent');

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setPhase(p => {
          const nextPhase = p === 'descent' ? 'ascent' : 'descent';
          if (nextPhase === 'descent') {
            haptics.pulse(); // Eccentric pulse
          } else {
            haptics.sharpTap(); // Concentric sharp tap
          }
          return nextPhase;
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  if (compact) {
    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-full bg-black/40 border border-white/5">
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: phase === 'descent' ? "0%" : "100%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className={cn(
                "absolute inset-0",
                type === 'Mechanical Tension' ? "bg-tension-blue/20" : "bg-stress-red/20"
              )}
            />
          )}
        </AnimatePresence>
        <div className="z-10 text-xl font-bold">
          {isActive ? (phase === 'descent' ? '↓' : '↑') : '—'}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 flex flex-col items-center gap-6">
      <div className="text-center">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Rep Tempo Guide</h3>
        <div className="text-2xl font-mono font-bold">
          {isActive ? (phase === 'descent' ? '2s DESCENT' : '2s ASCENT') : 'IDLE'}
        </div>
      </div>

      <div className="relative w-full h-32 flex items-center justify-center overflow-hidden rounded-xl bg-black/40 border border-white/5">
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: phase === 'descent' ? "0%" : "100%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className={cn(
                "absolute inset-0",
                type === 'Mechanical Tension' ? "bg-tension-blue/20" : "bg-stress-red/20"
              )}
            />
          )}
        </AnimatePresence>
        
        <div className="z-10 flex flex-col items-center">
          <div className="text-4xl font-bold drop-shadow-lg">
            {isActive ? (phase === 'descent' ? '↓' : '↑') : '—'}
          </div>
          {isActive && (
            <div className="text-[10px] font-mono text-white/40 mt-2 tracking-widest">
              {phase === 'descent' ? 'TENSION LOADING' : 'FORCE RELEASE'}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setInternalActive(!internalActive)}
        className={cn(
          "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
          isActive ? "bg-stress-red text-white" : "bg-tension-blue text-white"
        )}
      >
        {isActive ? <RotateCcw size={20} /> : <Play size={20} />}
        {isActive ? 'STOP TIMER' : 'START CHRONO-WAVE'}
      </button>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, X, Play, Pause, RotateCcw, AlertCircle } from 'lucide-react';
import { haptics } from '../lib/haptics';
import { cn } from '../lib/utils';

import { useTimer } from '../contexts/TimerContext';

interface RestTimerProps {
  formRating?: number;
  recoveryDeficit?: boolean;
  inline?: boolean;
}

export const RestTimer: React.FC<RestTimerProps> = ({ 
  formRating = 5,
  recoveryDeficit = false,
  inline = false
}) => {
  const { timeLeft, timerDuration, isActive, toggleTimer, resetTimer, stopTimer } = useTimer();
  
  const adjustedDuration = recoveryDeficit ? timerDuration + 60 : timerDuration;

  useEffect(() => {
    if (timeLeft === 0) {
      haptics.success();
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / adjustedDuration) * 100;

  const content = (
    <div className={cn(
      "glass-panel p-6 border-tension-blue/30 shadow-2xl",
      inline ? "w-full bg-tension-blue/5" : "fixed inset-x-4 top-24 z-[500]"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Timer className="text-tension-blue" size={20} />
          <span className="text-xs font-bold uppercase tracking-widest">
            {recoveryDeficit ? 'CNS RECOVERY AUTO-ADJUST' : 'Rest Protocol Active'}
          </span>
        </div>
        {!inline && (
          <button 
            onClick={() => {
              haptics.light();
              stopTimer();
            }} 
            className="text-white/40 hover:text-white"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {formRating <= 2 && (
        <div className="mb-4 p-3 bg-stress-red/10 border border-stress-red/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="text-stress-red" size={16} />
          <div className="text-[10px] font-bold text-stress-red uppercase">Mandatory Form Tip: Scapular Retraction Required</div>
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="60"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              r="60"
              fill="none"
              stroke="#007AFF"
              strokeWidth="8"
              strokeDasharray={377}
              strokeDashoffset={377 - (377 * progress) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <span className="text-3xl font-mono font-bold">{formatTime(timeLeft)}</span>
        </div>

        <div className="flex gap-4 w-full">
          <button
            onClick={() => {
              haptics.light();
              toggleTimer();
            }}
            className="flex-1 py-3 bg-white/10 rounded-xl flex items-center justify-center"
          >
            {isActive ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={() => {
              haptics.medium();
              resetTimer();
            }}
            className="flex-1 py-3 bg-white/10 rounded-xl flex items-center justify-center"
          >
            <RotateCcw size={20} />
          </button>
          {inline && (
            <button
              onClick={() => {
                haptics.medium();
                stopTimer();
              }}
              className="flex-1 py-3 bg-white/10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white/60"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (inline) return content;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="contents"
    >
      {content}
    </motion.div>
  );
};

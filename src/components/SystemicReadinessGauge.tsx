import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface Props {
  readinessScore: number; // 0-100
  mpsWindowHours: number; // 0-72
}

export const SystemicReadinessGauge: React.FC<Props> = ({ readinessScore, mpsWindowHours }) => {
  const isPeakWindow = mpsWindowHours >= 24 && mpsWindowHours <= 48;
  const isFatigued = readinessScore < 60;

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      {/* Outer Ring (MPS Window) */}
      <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-white/5"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={isPeakWindow ? "#007AFF" : "currentColor"}
          strokeWidth="8"
          strokeDasharray="283"
          initial={{ strokeDashoffset: 283 }}
          animate={{ strokeDashoffset: 283 - (mpsWindowHours / 72) * 283 }}
          className={cn("transition-colors duration-500", isPeakWindow ? "text-tension-blue" : "text-white/20")}
        />
      </svg>

      {/* Center Score */}
      <div className={cn(
        "flex flex-col items-center justify-center w-36 h-36 rounded-full bg-[#1a1a1a] border border-white/10 transition-all duration-500",
        isFatigued ? "shadow-[0_0_20px_rgba(255,193,7,0.3)]" : "shadow-[0_0_20px_rgba(0,0,0,0.5)]"
      )}>
        <span className="text-4xl font-black tracking-tighter">{Math.round(readinessScore)}%</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Readiness</span>
      </div>
    </div>
  );
};

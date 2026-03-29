import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { WorkoutType } from '../types';

interface AnatomyEngineProps {
  primaryMuscles: string[];
  secondaryMuscles: string[];
  muscleHeads?: string[];
  type: WorkoutType;
  skeletalOverlay?: 'Shoulder Girdle' | 'Spine Alignment' | 'None';
  className?: string;
}

// Detailed muscle path mapping (Simplified for this environment, but structured for high-res)
const MUSCLE_PATHS: Record<string, { anterior?: string; posterior?: string }> = {
  'Chest': {
    anterior: 'M 85,45 Q 100,40 115,45 L 115,65 Q 100,70 85,65 Z', // Sternal
  },
  'Pectoralis Major': {
    anterior: 'M 85,40 Q 100,35 115,40 L 115,70 Q 100,75 85,70 Z', // Entire chest
  },
  'Clavicular Head': {
    anterior: 'M 85,40 Q 100,35 115,40 L 115,45 Q 100,45 85,45 Z',
  },
  'Front Delts': {
    anterior: 'M 75,40 Q 80,45 85,55 L 70,55 Q 65,45 75,40 Z M 125,40 Q 120,45 115,55 L 130,55 Q 135,45 125,40 Z',
  },
  'Lateral Delts': {
    anterior: 'M 65,45 Q 60,55 65,70 L 75,70 Q 75,55 70,45 Z M 135,45 Q 140,55 135,70 L 125,70 Q 125,55 130,45 Z',
  },
  'Rear Delts': {
    posterior: 'M 70,45 Q 65,55 70,70 L 80,70 Q 80,55 75,45 Z M 130,45 Q 135,55 130,70 L 120,70 Q 120,55 125,45 Z',
  },
  'Traps': {
    posterior: 'M 90,25 Q 100,20 110,25 L 120,45 Q 100,40 80,45 Z',
  },
  'Lats': {
    posterior: 'M 85,60 Q 100,55 115,60 L 120,90 Q 100,100 80,90 Z',
  },
  'Hamstrings': {
    posterior: 'M 85,130 Q 90,150 90,170 L 80,170 Q 80,150 85,130 Z M 115,130 Q 110,150 110,170 L 120,170 Q 120,150 115,130 Z',
  },
  'Quads': {
    anterior: 'M 85,120 Q 95,150 95,180 L 75,180 Q 75,150 85,120 Z M 115,120 Q 105,150 105,180 L 125,180 Q 125,150 115,120 Z',
  },
  'Vastus Lateralis': {
    anterior: 'M 75,130 Q 70,150 70,170 L 80,170 Q 80,150 75,130 Z M 125,130 Q 130,150 130,170 L 120,170 Q 120,150 125,130 Z',
  },
  'Triceps': {
    posterior: 'M 70,55 Q 65,70 70,85 L 80,85 Q 85,70 80,55 Z M 130,55 Q 135,70 130,85 L 120,85 Q 115,70 120,55 Z',
  },
  'Biceps': {
    anterior: 'M 70,60 Q 65,75 70,90 L 80,90 Q 85,75 80,60 Z M 130,60 Q 135,75 130,90 L 120,90 Q 115,75 120,60 Z',
  },
  'Abs': {
    anterior: 'M 90,75 Q 100,75 110,75 L 110,110 Q 100,115 90,110 Z',
  },
  'Glutes': {
    posterior: 'M 80,110 Q 100,105 120,110 L 125,135 Q 100,145 75,135 Z',
  },
  'Calves': {
    posterior: 'M 85,185 Q 90,200 90,215 L 80,215 Q 80,200 85,185 Z M 115,185 Q 110,200 110,215 L 120,215 Q 120,200 115,185 Z',
  }
};

const SKELETAL_OVERLAYS = {
  'Shoulder Girdle': (
    <g className="stroke-white/20 fill-none" strokeWidth="0.5">
      <path d="M 80,35 L 120,35 M 80,35 L 75,45 M 120,35 L 125,45" />
      <circle cx="80" cy="35" r="1" className="fill-white/20" />
      <circle cx="120" cy="35" r="1" className="fill-white/20" />
    </g>
  ),
  'Spine Alignment': (
    <g className="stroke-white/20 fill-none" strokeWidth="0.5" strokeDasharray="2 2">
      <path d="M 100,20 L 100,120" />
      <circle cx="100" cy="25" r="1.5" className="fill-white/20" />
      <circle cx="100" cy="115" r="1.5" className="fill-white/20" />
    </g>
  )
};

export const AnatomyEngine: React.FC<AnatomyEngineProps> = ({ 
  primaryMuscles, 
  secondaryMuscles, 
  muscleHeads = [],
  type,
  skeletalOverlay = 'None',
  className 
}) => {
  const highlightColor = type === 'Mechanical Tension' ? '#007AFF' : '#FF3B30';
  const glowClass = type === 'Mechanical Tension' ? 'shadow-[0_0_15px_rgba(0,122,255,0.8)]' : 'shadow-[0_0_15px_rgba(255,59,48,0.8)]';

  const renderView = (view: 'anterior' | 'posterior') => (
    <div className="relative flex-1 aspect-[1/2] max-h-[300px]">
      <svg viewBox="0 0 200 250" className="w-full h-full">
        {/* Base Body Silhouette */}
        <path 
          d="M 100,10 Q 115,10 120,25 L 125,35 Q 140,40 145,60 L 140,100 Q 135,110 125,110 L 125,230 Q 115,240 100,240 Q 85,240 75,230 L 75,110 Q 65,110 60,100 L 55,60 Q 60,40 75,35 L 80,25 Q 85,10 100,10" 
          className="fill-white/5 stroke-white/10" 
          strokeWidth="1"
        />

        {/* Skeletal Overlay */}
        {skeletalOverlay !== 'None' && SKELETAL_OVERLAYS[skeletalOverlay]}

        {/* Muscle Highlights */}
        {Object.entries(MUSCLE_PATHS).map(([name, paths]) => {
          const isPrimary = primaryMuscles.includes(name) || muscleHeads.includes(name);
          const isSecondary = secondaryMuscles.includes(name);
          const path = paths[view];

          if (!path || (!isPrimary && !isSecondary)) return null;

          return (
            <motion.path
              key={name}
              d={path}
              initial={{ opacity: 0 }}
              animate={{ opacity: isPrimary ? 1 : 0.4 }}
              fill={highlightColor}
              filter={`blur(${isPrimary ? '4px' : '2px'})`}
              className={cn(isPrimary && "drop-shadow-[0_0_8px_var(--highlight)]")}
              style={{ '--highlight': highlightColor } as any}
            />
          );
        })}
      </svg>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest text-white/20">
        {view}
      </div>
    </div>
  );

  return (
    <div className={cn("flex gap-8 justify-center items-center", className)}>
      {renderView('anterior')}
      {renderView('posterior')}
    </div>
  );
};

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { haptics } from '../lib/haptics';

interface StepperProps {
  value: number;
  onChange: (val: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  label: string;
}

export const Stepper: React.FC<StepperProps> = ({ 
  value, 
  onChange, 
  step = 1, 
  min = 0, 
  max = 500, 
  unit = '',
  label 
}) => {
  const handleLongPress = (direction: 'up' | 'down') => {
    haptics.medium();
    onChange(direction === 'up' ? value + step * 5 : Math.max(min, value - step * 5));
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">{label}</span>
      <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
        <button
          onClick={() => {
            haptics.light();
            onChange(Math.max(min, value - step));
          }}
          onContextMenu={(e) => { e.preventDefault(); handleLongPress('down'); }}
          className="p-2 text-white/60 hover:text-white active:scale-90 transition-transform"
        >
          <Minus size={16} />
        </button>
        <div className="w-16 text-center font-mono font-bold text-sm">
          {value}{unit}
        </div>
        <button
          onClick={() => {
            haptics.light();
            onChange(Math.min(max, value + step));
          }}
          onContextMenu={(e) => { e.preventDefault(); handleLongPress('up'); }}
          className="p-2 text-white/60 hover:text-white active:scale-90 transition-transform"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

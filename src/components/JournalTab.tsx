import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../lib/db';
import { WorkoutLog, ExerciseLog } from '../types';
import { Calendar, Zap, Activity, Repeat, Waves, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

// Helper to calculate Anabolic Score
const calculateAnabolicScore = (workout: WorkoutLog): number => {
  const baseScore = workout.type === 'Mechanical Tension' ? 80 : 60;
  const exerciseBonus = workout.exercises.length * 5;
  return Math.min(100, baseScore + exerciseBonus);
};

// Helper to get progress delta
const getProgressDelta = (current: ExerciseLog, previous?: ExerciseLog) => {
  if (!previous) return null;
  const weightDiff = current.targetWeight - previous.targetWeight;
  const repsDiff = current.targetReps - previous.targetReps;
  
  if (weightDiff > 0 || repsDiff > 0) return { type: 'up', value: `+${weightDiff}kg / +${repsDiff}r` };
  if (weightDiff < 0 || repsDiff < 0) return { type: 'down', value: `${weightDiff}kg / ${repsDiff}r` };
  return { type: 'same', value: '0' };
};

export const JournalTab: React.FC = () => {
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkouts = async () => {
      const allWorkouts = await dbService.getWorkouts();
      // Sort by date descending
      allWorkouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setWorkouts(allWorkouts);
      if (allWorkouts.length > 0) setSelectedDate(allWorkouts[0].date);
    };
    loadWorkouts();
  }, []);

  const dateStrip = useMemo(() => {
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });
    return dates;
  }, []);

  const selectedWorkout = useMemo(() => 
    workouts.find(w => w.date.startsWith(selectedDate || '')), 
    [workouts, selectedDate]
  );

  const getPreviousExercise = (exerciseId: string, currentIndex: number) => {
    // Find the last workout that contained this exercise
    for (let i = currentIndex + 1; i < workouts.length; i++) {
      const prev = workouts[i].exercises.find(e => e.exerciseId === exerciseId);
      if (prev) return prev;
    }
    return undefined;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-3 pb-24 space-y-4">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/30">Clinical Timeline</h2>
      
      {/* Horizontal Date Strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {dateStrip.map(date => {
          const hasWorkout = workouts.some(w => w.date.startsWith(date));
          const workout = workouts.find(w => w.date.startsWith(date));
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={cn(
                "flex-shrink-0 w-14 h-16 flex flex-col items-center justify-center rounded-lg border transition-all",
                selectedDate === date ? "bg-white/10 border-white/20" : "bg-white/5 border-transparent",
                hasWorkout ? (workout?.type === 'Mechanical Tension' ? "ring-1 ring-tension-blue" : "ring-1 ring-stress-red") : ""
              )}
            >
              <span className="text-[9px] uppercase text-white/40">{new Date(date).toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <span className="text-sm font-bold">{new Date(date).getDate()}</span>
              {hasWorkout && <div className="w-1 h-1 rounded-full bg-white/50 mt-1" />}
            </button>
          );
        })}
      </div>

      {/* Session Dossier */}
      {selectedWorkout ? (
        <div className="glass-panel p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold">{new Date(selectedWorkout.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</h3>
              <p className={cn("text-[10px] uppercase tracking-widest", selectedWorkout.type === 'Mechanical Tension' ? "text-tension-blue" : "text-stress-red")}>
                {selectedWorkout.type} • Score: {calculateAnabolicScore(selectedWorkout)}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>

          <div className="space-y-2">
            {selectedWorkout.exercises.map((ex, i) => {
              const prevEx = getPreviousExercise(ex.exerciseId, workouts.findIndex(w => w.id === selectedWorkout.id));
              const delta = getProgressDelta(ex, prevEx);
              return (
                <div key={i} className="flex justify-between items-center text-xs border-b border-white/5 pb-1.5">
                  <span className="text-white/60">Exercise {i + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono">{ex.targetWeight}kg x {ex.targetReps}</span>
                    {delta && (
                      <span className={cn("text-[9px] flex items-center", delta.type === 'up' ? "text-green-500" : delta.type === 'down' ? "text-red-500" : "text-white/40")}>
                        {delta.type === 'up' ? <TrendingUp size={10} className="mr-0.5" /> : delta.type === 'down' ? <TrendingDown size={10} className="mr-0.5" /> : <Minus size={10} className="mr-0.5" />}
                        {delta.value}
                      </span>
                    )}
                    {ex.tempoAdherence && ex.tempoAdherence >= 90 && <Waves size={12} className="text-tension-blue" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <button className="w-full py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[10px] font-bold uppercase tracking-widest transition-colors">
              Load Weights
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-white/20 py-8 text-xs">No session recorded for this date.</div>
      )}
    </div>
  );
};

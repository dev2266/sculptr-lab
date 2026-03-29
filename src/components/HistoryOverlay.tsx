import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, TrendingUp, TrendingDown, Star, Zap, ChevronDown, ChevronUp, Play, Calendar, Trash2 } from 'lucide-react';
import { dbService } from '../lib/db';
import { WorkoutLog, ExerciseLog, SetLog, WorkoutType } from '../types';
import { EXERCISES } from '../lib/exercises';
import { cn } from '../lib/utils';
import { haptics } from '../lib/haptics';

interface HistoryOverlayProps {
  onClose: () => void;
  onLoadSession: (workout: WorkoutLog) => void;
}

export const HistoryOverlay: React.FC<HistoryOverlayProps> = ({ onClose, onLoadSession }) => {
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null); // workoutId-exerciseId
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const loadWorkouts = async () => {
      const allWorkouts = await dbService.getWorkouts();
      // Sort by date descending
      setWorkouts(allWorkouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };
    loadWorkouts();
  }, []);

  const weekDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      days.push({
        date: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        dayNum: d.getDate()
      });
    }
    return days;
  }, []);

  const getWorkoutForDate = (date: string) => {
    return workouts.find(w => w.date.split('T')[0] === date);
  };

  const calculateDelta = (workout: WorkoutLog, exerciseLog: ExerciseLog) => {
    // Find the previous time this exercise was done
    const previousWorkouts = workouts.filter(w => 
      new Date(w.date).getTime() < new Date(workout.date).getTime()
    );
    
    let prevLog: ExerciseLog | undefined;
    for (const pw of previousWorkouts) {
      prevLog = pw.exercises.find(e => e.exerciseId === exerciseLog.exerciseId);
      if (prevLog) break;
    }

    if (!prevLog) return null;

    const currentMaxWeight = Math.max(...exerciseLog.sets.map(s => s.weight));
    const currentMaxReps = Math.max(...exerciseLog.sets.map(s => s.reps));
    const prevMaxWeight = Math.max(...prevLog.sets.map(s => s.weight));
    const prevMaxReps = Math.max(...prevLog.sets.map(s => s.reps));

    if (currentMaxWeight > prevMaxWeight) return { type: 'weight', value: `+${currentMaxWeight - prevMaxWeight}kg` };
    if (currentMaxReps > prevMaxReps) return { type: 'reps', value: `+${currentMaxReps - prevMaxReps} Reps` };
    
    return null;
  };

  const checkPlateau = (exerciseId: string, currentWorkoutDate: string) => {
    const relevantWorkouts = workouts
      .filter(w => new Date(w.date).getTime() <= new Date(currentWorkoutDate).getTime())
      .slice(0, 4); // Current + 3 previous
    
    if (relevantWorkouts.length < 4) return false;

    const logs = relevantWorkouts.map(w => w.exercises.find(e => e.exerciseId === exerciseId)).filter(Boolean) as ExerciseLog[];
    if (logs.length < 4) return false;

    const weights = logs.map(l => Math.max(...l.sets.map(s => s.weight)));
    const reps = logs.map(l => Math.max(...l.sets.map(s => s.reps)));

    // If weight and reps haven't increased for 3 sessions
    const noWeightIncrease = weights[0] <= weights[1] && weights[1] <= weights[2] && weights[2] <= weights[3];
    const noRepIncrease = reps[0] <= reps[1] && reps[1] <= reps[2] && reps[2] <= reps[3];

    return noWeightIncrease && noRepIncrease;
  };

  const getTonnage = (exerciseLog: ExerciseLog) => {
    return exerciseLog.sets.reduce((acc, s) => acc + (s.weight * s.reps), 0);
  };

  const getAvgRating = (exerciseLog: ExerciseLog) => {
    const sum = exerciseLog.sets.reduce((acc, s) => acc + s.rating, 0);
    return (sum / exerciseLog.sets.length).toFixed(1);
  };

  const getProtocolLabel = (workout: WorkoutLog) => {
    const allReps = workout.exercises.flatMap(e => e.sets.map(s => s.reps));
    if (allReps.length === 0) return workout.type;
    const avgReps = allReps.reduce((a, b) => a + b, 0) / allReps.length;
    if (avgReps < 8) return 'Mechanical Tension';
    if (avgReps > 10) return 'Metabolic Stress';
    return workout.type;
  };

  const handleDeleteWorkout = async (id: string) => {
    haptics.warning();
    // Simple confirmation could be added here if needed, but for now direct delete as requested
    await dbService.deleteWorkout(id);
    setWorkouts(prev => prev.filter(w => w.id !== id));
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[300] bg-[#050505] flex flex-col"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg">
            <Clock size={20} className="text-white/40" />
          </div>
          <h2 className="text-xl font-black tracking-tighter uppercase">Biometric Audit</h2>
        </div>
        <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Week-at-a-Glance */}
      <div className="px-6 py-4 flex justify-between border-b border-white/5">
        {weekDays.map(day => {
          const workout = getWorkoutForDate(day.date);
          const isActive = selectedDate === day.date;
          return (
            <button 
              key={day.date}
              onClick={() => { haptics.light(); setSelectedDate(day.date); }}
              className="flex flex-col items-center gap-2 group"
            >
              <span className="text-[10px] font-black text-white/20 uppercase group-hover:text-white/40 transition-colors">{day.label}</span>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all border",
                isActive ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/10"
              )}>
                {day.dayNum}
              </div>
              {workout && (
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  getProtocolLabel(workout) === 'Mechanical Tension' ? "bg-tension-blue shadow-[0_0_8px_rgba(0,122,255,0.5)]" : "bg-stress-red shadow-[0_0_8px_rgba(255,59,48,0.5)]"
                )} />
              )}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {workouts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
            <Calendar size={64} />
            <p className="text-sm font-bold uppercase tracking-widest">No Audit Data Found</p>
          </div>
        ) : (
          workouts.map((workout, idx) => (
            <motion.div 
              key={workout.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4">
                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                  {new Date(workout.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              <div className="glass-panel p-6 space-y-6 border-white/5 relative overflow-hidden">
                {/* Protocol Label */}
                <div className={cn(
                  "absolute top-0 right-0 px-4 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-xl",
                  getProtocolLabel(workout) === 'Mechanical Tension' ? "bg-tension-blue text-white" : "bg-stress-red text-white"
                )}>
                  {getProtocolLabel(workout)}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Session Audit</h3>
                    <div className="text-[10px] font-bold text-white/40 uppercase mt-1">
                      Anabolic Score: <span className="text-white">{workout.readinessScore || 100}%</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteWorkout(workout.id)}
                    className="p-3 bg-white/5 rounded-2xl text-white/20 hover:text-stress-red hover:bg-stress-red/10 transition-all border border-white/5 hover:border-stress-red/20"
                    title="Delete Session"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="space-y-3">
                  {workout.exercises.map(exLog => {
                    const exercise = EXERCISES.find(e => e.id === exLog.exerciseId);
                    const delta = calculateDelta(workout, exLog);
                    const isPlateau = checkPlateau(exLog.exerciseId, workout.date);
                    const isExpanded = expandedExercise === `${workout.id}-${exLog.exerciseId}`;

                    return (
                      <div key={exLog.exerciseId} className="space-y-2">
                        <button 
                          onClick={() => { haptics.light(); setExpandedExercise(isExpanded ? null : `${workout.id}-${exLog.exerciseId}`); }}
                          className="w-full flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-bold group-hover:translate-x-1 transition-transform">{exercise?.name || 'Unknown'}</div>
                            {delta && (
                              <div className={cn(
                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1",
                                delta.type === 'weight' ? "bg-tension-blue/20 text-tension-blue" : "bg-green-500/20 text-green-500"
                              )}>
                                <TrendingUp size={8} />
                                {delta.value}
                              </div>
                            )}
                            {isPlateau && (
                              <div className="px-2 py-0.5 rounded-full bg-stress-red/20 text-stress-red text-[8px] font-black uppercase flex items-center gap-1">
                                <Zap size={8} />
                                Change Rule Suggested
                              </div>
                            )}
                          </div>
                          {isExpanded ? <ChevronUp size={16} className="text-white/20" /> : <ChevronDown size={16} className="text-white/20" />}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-white/5 rounded-xl p-4 mt-2 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">Volume Load</div>
                                    <div className="text-sm font-bold">{getTonnage(exLog)}kg</div>
                                  </div>
                                  <div>
                                    <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">Form Integrity</div>
                                    <div className="flex items-center gap-1">
                                      <Star size={10} className="text-tension-blue fill-tension-blue" />
                                      <span className="text-sm font-bold">{getAvgRating(exLog)}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">Tempo Adherence</div>
                                    <div className="text-sm font-bold">{exLog.tempoAdherence || 100}%</div>
                                  </div>
                                  <div>
                                    <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">CNS Status</div>
                                    <div className="text-sm font-bold">{workout.readinessScore || 100}%</div>
                                  </div>
                                </div>

                                <div className="space-y-2 border-t border-white/5 pt-4">
                                  {exLog.sets.map((set, sIdx) => (
                                    <div key={sIdx} className="flex items-center justify-between text-[10px]">
                                      <span className="text-white/40 font-bold uppercase">Set {sIdx + 1}</span>
                                      <div className="flex gap-4">
                                        <span className="font-black">{set.weight}kg × {set.reps}</span>
                                        <span className={cn(
                                          "font-black",
                                          set.velocityState === 'High' ? "text-green-500" : set.velocityState === 'Medium' ? "text-tension-blue" : "text-stress-red"
                                        )}>
                                          {set.velocityState} Velocity
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-white/5">
                  <button 
                    onClick={() => { haptics.medium(); onLoadSession(workout); }}
                    className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={12} fill="currentColor" />
                    Load This Session
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

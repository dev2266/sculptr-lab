import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EXERCISES } from '../lib/exercises';
import { TimerProvider, useTimer } from '../contexts/TimerContext';
import { WorkoutType, ExerciseLog, SetLog, SplitPlan, SplitDay, Exercise, WorkoutLog } from '../types';
import { ChronoWave } from './ChronoWave';
import { RestTimer } from './RestTimer';
import { Stepper } from './Stepper';
import { cn } from '../lib/utils';
import { ChevronRight, Star, CheckCircle2, AlertCircle, Zap, RefreshCw, Plus, Search, X, Play, Clock, Moon } from 'lucide-react';
import { haptics } from '../lib/haptics';
import { dbService } from '../lib/db';
import { HistoryOverlay } from './HistoryOverlay';

const PLANS: SplitPlan[] = ['4-Day Elite Growth', '3-Day Full Body', '6-Day PPL', '5-Day Bro Split'];
const DAYS: SplitDay[] = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

export const TrainingTab: React.FC = () => {
  const [activePlan, setActivePlan] = useState<SplitPlan>('4-Day Elite Growth');
  const [activeDay, setActiveDay] = useState<SplitDay>('Day 1');
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [showProgression, setShowProgression] = useState(false);
  const [readinessScore, setReadinessScore] = useState(100);
  const [isDeloadRequired, setIsDeloadRequired] = useState(false);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const { startTimer, stopTimer, toggleTimer, resetTimer, showRestTimer, timeLeft, isActive, setIsLoggingActive } = useTimer();

  useEffect(() => {
    setIsLoggingActive(!!activeExercise);
  }, [activeExercise, setIsLoggingActive]);
  const [targets, setTargets] = useState<Record<string, { weight: number, reps: number }>>({});
  const [logs, setLogs] = useState<Record<string, { weight: number, reps: number, rating: number, velocityLoss: boolean }>>({});
  const [rotationStates, setRotationStates] = useState<Record<string, { lastRotated: number }>>({});
  const [isChronoActive, setIsChronoActive] = useState(false);
  const [chronoPhase, setChronoPhase] = useState<'descent' | 'ascent'>('descent');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customSplits, setCustomSplits] = useState<Record<string, string[]>>({}); // Plan-Day -> Exercise IDs
  const [currentSession, setCurrentSession] = useState<WorkoutLog | null>(null);
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [customAssets, setCustomAssets] = useState<Record<string, { customAnatomyImage?: string }>>({});

  // Load custom assets (images)
  const loadAssets = async () => {
    const assets = await dbService.getAllCustomAssets();
    setCustomAssets(assets);
  };

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    if (isWorkoutActive) {
      loadAssets();
    }
  }, [isWorkoutActive]);

  // Load custom splits from settings
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await dbService.getSettings();
      if (settings?.customSplits) {
        setCustomSplits(settings.customSplits);
      }
    };
    loadSettings();
  }, []);

  // Save custom splits when they change
  useEffect(() => {
    const saveCustomSplits = async () => {
      if (Object.keys(customSplits).length > 0) {
        const settings = await dbService.getSettings();
        if (settings) {
          await dbService.saveSettings({ ...settings, customSplits });
        }
      }
    };
    saveCustomSplits();
  }, [customSplits]);

  // Chrono-Wave Logic
  useEffect(() => {
    let interval: any;
    if (isChronoActive && isWorkoutActive) {
      interval = setInterval(() => {
        setChronoPhase(p => {
          const nextPhase = p === 'descent' ? 'ascent' : 'descent';
          if (nextPhase === 'descent') {
            haptics.pulse();
          } else {
            haptics.sharpTap();
          }
          return nextPhase;
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isChronoActive, isWorkoutActive]);

  // CNS Fatigue & Velocity Trend Algorithm
  useEffect(() => {
    const calculateReadiness = async () => {
      const today = new Date().toISOString().split('T')[0];
      const recovery = await dbService.getRecovery(today);
      const workouts = await dbService.getWorkouts();
      
      const sleepScore = (recovery?.sleepHours || 8) / 8;
      const proteinScore = (recovery?.proteinGrams || 160) / (80 * 2); 
      
      let velocityTrend = 1;
      let deloadNeeded = false;

      if (workouts.length > 0) {
        const last14Days = workouts.filter(w => (Date.now() - new Date(w.date).getTime()) < (14 * 24 * 60 * 60 * 1000));
        const mechanicalTensionWorkouts = last14Days.filter(w => w.type === 'Mechanical Tension');
        
        const totalSets = mechanicalTensionWorkouts.reduce((acc, w) => acc + w.exercises.reduce((a, e) => a + e.sets.length, 0), 0);
        const lowVelocitySets = mechanicalTensionWorkouts.reduce((acc, w) => acc + w.exercises.reduce((a, e) => a + e.sets.filter(s => s.velocityState === 'Low').length, 0), 0);
        
        velocityTrend = totalSets > 0 ? 1 - (lowVelocitySets / totalSets) : 1;
        
        if (totalSets > 5 && (lowVelocitySets / totalSets) > 0.3) {
          deloadNeeded = true;
        }
      }

      const score = (sleepScore * 40) + (proteinScore * 40) + (velocityTrend * 20);
      setReadinessScore(Math.round(score));
      setIsDeloadRequired(deloadNeeded);
    };
    calculateReadiness();
  }, []);

  // Load targets and pre-fill weights
  useEffect(() => {
    if (activeExercise) {
      dbService.getTarget(activeExercise).then(target => {
        if (target) {
          setRotationStates(prev => ({ ...prev, [activeExercise]: { lastRotated: target.lastRotated } }));
          let weight = target.targetWeight;
          
          if (readinessScore < 60 && getWorkoutTypeForDay(activeDay) === 'Mechanical Tension') {
            weight = Math.round((weight * 0.9) / 2.5) * 2.5;
          }

          if (isDeloadRequired) {
            weight = Math.round((weight * 0.8) / 2.5) * 2.5;
          }

          setTargets(prev => ({ ...prev, [activeExercise]: { weight: target.targetWeight, reps: target.targetReps } }));
          setLogs(prev => ({
            ...prev,
            [activeExercise]: { 
              ...(prev[activeExercise] || { rating: 5, velocityLoss: false }), 
              weight: weight, 
              reps: target.targetReps 
            }
          }));

          // Set active set index based on current session
          const exLog = currentSession?.exercises.find(e => e.exerciseId === activeExercise);
          setActiveSetIndex(exLog ? Math.min(exLog.sets.length, 3) : 0);
        }
      });
    }
  }, [activeExercise, readinessScore, activeDay, isDeloadRequired, currentSession]);

  const getWorkoutTypeForDay = (day: SplitDay): WorkoutType => {
    if (activePlan === '4-Day Elite Growth') {
      return (day === 'Day 1' || day === 'Day 2') ? 'Mechanical Tension' : 'Metabolic Stress';
    }
    if (activePlan === '3-Day Full Body') {
      return (day === 'Day 1' || day === 'Day 3') ? 'Mechanical Tension' : 'Metabolic Stress';
    }
    if (activePlan === '6-Day PPL') {
      return (day === 'Day 1' || day === 'Day 2' || day === 'Day 3') ? 'Mechanical Tension' : 'Metabolic Stress';
    }
    if (activePlan === '5-Day Bro Split') {
      return (day === 'Day 2' || day === 'Day 4') ? 'Mechanical Tension' : 'Metabolic Stress';
    }
    return 'Mechanical Tension';
  };

  const getExercisesForDay = (day: SplitDay): Exercise[] => {
    const key = `${activePlan}-${day}`;
    if (customSplits[key]) {
      return EXERCISES.filter(e => customSplits[key].includes(e.id));
    }

    if (activePlan === '4-Day Elite Growth') {
      switch (day) {
        case 'Day 1': return EXERCISES.filter(e => ['bench-press', 'weighted-pullups', 'overhead-press', 'barbell-rows', 'close-grip-bench', 'heavy-barbell-curls'].includes(e.id));
        case 'Day 2': return EXERCISES.filter(e => ['squat', 'rdl', 'bulgarian-split-squat', 'standing-calf-raise', 'weighted-plank'].includes(e.id));
        case 'Day 4': return EXERCISES.filter(e => ['incline-db-press', 'lateral-raise', 'single-arm-db-row', 'preacher-curl', 'hammer-curl', 'rope-pushdowns', 'overhead-cable-extension'].includes(e.id));
        case 'Day 5': return EXERCISES.filter(e => ['leg-extensions', 'leg-curls', 'seated-calf-raise', 'cable-crunch', 'hanging-leg-raises'].includes(e.id));
        default: return [];
      }
    }

    if (activePlan === '3-Day Full Body') {
      switch (day) {
        case 'Day 1': return EXERCISES.filter(e => ['squat', 'bench-press', 'barbell-rows', 'overhead-press'].includes(e.id));
        case 'Day 3': return EXERCISES.filter(e => ['deadlift', 'dips', 'weighted-pullups', 'heavy-barbell-curls'].includes(e.id));
        case 'Day 5': return EXERCISES.filter(e => ['goblet-squat', 'cable-flyes', 'lateral-raise', 'rope-pushdowns'].includes(e.id));
        default: return [];
      }
    }

    if (activePlan === '6-Day PPL') {
      switch (day) {
        case 'Day 1': return EXERCISES.filter(e => ['bench-press', 'overhead-press', 'skullcrushers'].includes(e.id));
        case 'Day 2': return EXERCISES.filter(e => ['weighted-pullups', 'barbell-rows', 'heavy-barbell-curls'].includes(e.id));
        case 'Day 3': return EXERCISES.filter(e => ['squat', 'rdl', 'standing-calf-raise'].includes(e.id));
        case 'Day 4': return EXERCISES.filter(e => ['db-bench-press', 'lateral-raise', 'rope-pushdowns'].includes(e.id));
        case 'Day 5': return EXERCISES.filter(e => ['lat-pulldown', 'cable-rows', 'face-pulls'].includes(e.id));
        case 'Day 6': return EXERCISES.filter(e => ['hack-squat', 'leg-curls', 'seated-calf-raise'].includes(e.id));
        default: return [];
      }
    }

    if (activePlan === '5-Day Bro Split') {
      switch (day) {
        case 'Day 1': return EXERCISES.filter(e => ['bench-press', 'incline-db-press', 'cable-flyes-low-to-high', 'dips'].includes(e.id));
        case 'Day 2': return EXERCISES.filter(e => ['deadlift', 'weighted-pullups', 'barbell-rows', 'cable-rows'].includes(e.id));
        case 'Day 3': return EXERCISES.filter(e => ['overhead-press', 'lateral-raise', 'face-pulls', 'db-shrugs'].includes(e.id));
        case 'Day 4': return EXERCISES.filter(e => ['squat', 'rdl', 'leg-extensions', 'standing-calf-raise'].includes(e.id));
        case 'Day 5': return EXERCISES.filter(e => ['heavy-barbell-curls', 'skullcrushers', 'preacher-curl', 'rope-pushdowns', 'hammer-curl'].includes(e.id));
        default: return [];
      }
    }

    return [];
  };

  const isRestDay = (day: SplitDay) => {
    if (activePlan === '4-Day Elite Growth') {
      return day === 'Day 3' || day === 'Day 6' || day === 'Day 7';
    }
    if (activePlan === '3-Day Full Body') {
      return day === 'Day 2' || day === 'Day 4' || day === 'Day 6' || day === 'Day 7';
    }
    if (activePlan === '6-Day PPL') {
      return day === 'Day 7';
    }
    if (activePlan === '5-Day Bro Split') {
      return day === 'Day 6' || day === 'Day 7';
    }
    return false;
  };

  const getRestTime = (exerciseId: string): number => {
    const exercise = EXERCISES.find(e => e.id === exerciseId);
    const type = getWorkoutTypeForDay(activeDay);
    
    if (!exercise) return type === 'Mechanical Tension' ? 180 : 60;

    const largeMuscles = ['Legs', 'Back', 'Chest'];
    const isLarge = largeMuscles.includes(exercise.category);

    if (type === 'Mechanical Tension') {
      return isLarge ? 180 : 120;
    } else {
      return isLarge ? 90 : 60;
    }
  };

  const handleLog = async (exerciseId: string) => {
    const log = logs[exerciseId] || { weight: 60, reps: 8, rating: 5, velocityLoss: false };
    const target = targets[exerciseId] || { weight: 60, reps: 8 };
    
    // Check if this set is already logged
    const exLog = currentSession?.exercises.find(e => e.exerciseId === exerciseId);
    if (exLog && exLog.sets.length > activeSetIndex) {
      haptics.warning();
      return;
    }

    if (log.rating <= 3) {
      haptics.warning();
      alert("Clinical Warning: Form Breakdown renders a rep biologically invalid. Double Progression blocked.");
      return;
    }

    // Update session data
    const newSet: SetLog = {
      reps: log.reps,
      weight: log.weight,
      rating: log.rating,
      velocityState: log.reps >= target.reps ? 'Low' : 'High',
      timestamp: Date.now()
    };

    setCurrentSession(prev => {
      if (!prev) {
        return {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          type: getWorkoutTypeForDay(activeDay),
          exercises: [{
            exerciseId,
            targetWeight: target.weight,
            targetReps: target.reps,
            lastRotated: rotationStates[exerciseId]?.lastRotated || Date.now(),
            sets: [newSet],
            tempoAdherence: 100
          }],
          readinessScore
        };
      }

      const existingEx = prev.exercises.find(e => e.exerciseId === exerciseId);
      if (existingEx) {
        // Ensure we don't add duplicate sets if user clicks fast
        if (existingEx.sets.length <= activeSetIndex) {
          existingEx.sets.push(newSet);
        }
        return { ...prev };
      } else {
        prev.exercises.push({
          exerciseId,
          targetWeight: target.weight,
          targetReps: target.reps,
          lastRotated: rotationStates[exerciseId]?.lastRotated || Date.now(),
          sets: [newSet],
          tempoAdherence: 100
        });
        return { ...prev };
      }
    });

    if (log.reps >= target.reps && log.rating >= 4) {
      haptics.success();
      const nextWeight = log.weight + 2.5;
      await dbService.updateTargetWeight(exerciseId, nextWeight, target.reps);
      setTargets(prev => ({ ...prev, [exerciseId]: { ...target, weight: nextWeight } }));
      setShowProgression(true);
      setTimeout(() => setShowProgression(false), 4000);
    } else {
      haptics.medium();
    }

    const ex = EXERCISES.find(e => e.id === exerciseId);
    startTimer(getRestTime(exerciseId), ex?.name);
  };

  const finishWorkout = async () => {
    if (currentSession && currentSession.exercises.length > 0) {
      await dbService.saveWorkout(currentSession);
      haptics.success();
      setCurrentSession(null);
      setIsWorkoutActive(false);
      setActiveExercise(null);
    } else {
      setIsWorkoutActive(false);
      setActiveExercise(null);
    }
  };

  const loadPastSession = (workout: WorkoutLog) => {
    // Pre-fill logs with past session data
    const newLogs: Record<string, any> = {};
    workout.exercises.forEach(ex => {
      const lastSet = ex.sets[ex.sets.length - 1];
      newLogs[ex.exerciseId] = {
        weight: lastSet.weight,
        reps: lastSet.reps,
        rating: 5,
        velocityLoss: false
      };
    });
    setLogs(prev => ({ ...prev, ...newLogs }));
    setShowHistory(false);
    haptics.success();
  };

  const updateLog = (exerciseId: string, field: string, value: any) => {
    setLogs(prev => ({
      ...prev,
      [exerciseId]: { ...(prev[exerciseId] || { weight: 60, reps: 8, rating: 5, velocityLoss: false }), [field]: value }
    }));
  };

  const addExerciseToSplit = (exerciseId: string) => {
    const key = `${activePlan}-${activeDay}`;
    const currentExercises = getExercisesForDay(activeDay).map(e => e.id);
    if (!currentExercises.includes(exerciseId)) {
      const newSplit = [...currentExercises, exerciseId];
      setCustomSplits(prev => ({ ...prev, [key]: newSplit }));
      haptics.success();
    }
    setShowAddModal(false);
  };

  const getFilteredAlternatives = () => {
    const currentDayExercises = getExercisesForDay(activeDay);
    if (currentDayExercises.length === 0) return [];
    
    // For smart filtering, we look at the category of the first exercise or just show relevant ones
    const currentType = getWorkoutTypeForDay(activeDay);

    return EXERCISES.filter(e => 
      e.type === currentType &&
      !currentDayExercises.some(ce => ce.id === e.id) &&
      (e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const themeColor = getWorkoutTypeForDay(activeDay) === 'Mechanical Tension' ? 'text-tension-blue' : 'text-stress-red';
  const themeBg = getWorkoutTypeForDay(activeDay) === 'Mechanical Tension' ? 'bg-tension-blue' : 'bg-stress-red';
  const themeBorder = getWorkoutTypeForDay(activeDay) === 'Mechanical Tension' ? 'border-tension-blue' : 'border-stress-red';

  return (
    <div className="space-y-6 relative min-h-screen pb-24 bg-[#050505]">
      {/* Header with History Icon */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Elite Growth</span>
          <h1 className="text-2xl font-black tracking-tighter uppercase">Training Lab</h1>
        </div>
        <button 
          onClick={() => { haptics.medium(); setShowHistory(true); }}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <Clock size={20} className="text-white/60" />
        </button>
      </div>

      {/* Plan Carousel */}
      <div className="px-4 overflow-x-auto no-scrollbar flex gap-4 py-2">
        {PLANS.map(plan => (
          <button
            key={plan}
            onClick={() => { haptics.light(); setActivePlan(plan); setActiveDay('Day 1'); }}
            className={cn(
              "whitespace-nowrap px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border",
              activePlan === plan ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/10"
            )}
          >
            {plan}
          </button>
        ))}
      </div>

      {/* Day Selector */}
      <div className="px-4 flex justify-between gap-2">
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => { haptics.light(); setActiveDay(day); }}
            className={cn(
              "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border",
              activeDay === day ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/10"
            )}
          >
            {day.split(' ')[1]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {isRestDay(activeDay) ? (
          <motion.div 
            key="rest-day"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="px-4 py-12 flex flex-col items-center justify-center text-center space-y-8"
          >
            <div className="p-8 bg-white/5 rounded-full border border-white/10 relative">
              <RefreshCw size={64} className="text-white/20 animate-spin-slow" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap size={24} className="text-tension-blue animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tighter uppercase">Systemic Rest</h2>
              <p className="text-sm text-white/40">Active recovery protocol active. Heavy inputs blocked.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 w-full">
              <div className="glass-panel p-6 text-left border-white/5">
                <div className="text-[10px] font-black text-tension-blue uppercase tracking-widest mb-1">Protocol 01</div>
                <div className="font-bold">LISS Cardio (20-30m)</div>
                <div className="text-xs text-white/40 mt-1">Maintain HR Zone 2 to facilitate blood flow and nutrient delivery.</div>
              </div>
              <div className="glass-panel p-6 text-left border-white/5">
                <div className="text-[10px] font-black text-tension-blue uppercase tracking-widest mb-1">Protocol 02</div>
                <div className="font-bold">Myofascial Release</div>
                <div className="text-xs text-white/40 mt-1">Focus on tissue quality. 10m foam rolling or dynamic stretching.</div>
              </div>
              <div className="glass-panel p-6 text-left border-white/5">
                <div className="text-[10px] font-black text-tension-blue uppercase tracking-widest mb-1">Protocol 03</div>
                <div className="font-bold">Parasympathetic Shift</div>
                <div className="text-xs text-white/40 mt-1">Prioritize 8.5h+ sleep. Growth occurs during deep recovery.</div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="workout-day"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 space-y-4"
          >
            <div className="flex items-center justify-between px-2">
              <h3 className={cn("text-xs font-black uppercase tracking-[0.3em]", themeColor)}>
                {getWorkoutTypeForDay(activeDay)} Protocol
              </h3>
              <div className="text-[10px] font-bold text-white/20 uppercase">
                {getExercisesForDay(activeDay).length} Exercises
              </div>
            </div>

            {getExercisesForDay(activeDay).map((exercise, idx) => {
              const rotation = rotationStates[exercise.id];
              const isOld = rotation ? (Date.now() - rotation.lastRotated) > (28 * 24 * 60 * 60 * 1000) : false;
              
              return (
                <motion.button
                  key={exercise.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => { haptics.medium(); setActiveExercise(exercise.id); setIsWorkoutActive(true); }}
                  className={cn(
                    "w-full glass-panel p-6 flex items-center justify-between group relative overflow-hidden",
                    isOld && "border-stress-red/50"
                  )}
                >
                  {/* Background Image Preview if exists */}
                  {customAssets[exercise.id]?.customAnatomyImage && (
                    <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                      <img 
                        src={customAssets[exercise.id].customAnatomyImage} 
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    </div>
                  )}

                  <div className="text-left relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                        {exercise.category}
                        {exercise.muscleHeads && exercise.muscleHeads.length > 0 && ` (${exercise.muscleHeads.join(', ')})`}
                      </span>
                      {isOld && <span className="text-[8px] bg-stress-red/20 text-stress-red px-1 rounded font-black">ROTATION DUE</span>}
                    </div>
                    <div className="text-xl font-black tracking-tight group-hover:translate-x-1 transition-transform">{exercise.name}</div>
                  </div>
                  <ChevronRight size={20} className="text-white/20 group-hover:text-white transition-colors" />
                </motion.button>
              );
            })}

            <button 
              onClick={() => setShowAddModal(true)}
              className="w-full py-6 glass-panel border-dashed border-white/10 flex items-center justify-center gap-2 text-white/20 hover:text-white hover:border-white/30 transition-all"
            >
              <Plus size={18} />
              <span className="text-xs font-black uppercase tracking-widest">Add Alternative</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Exercise Input Overlay */}
      <AnimatePresence>
        {isWorkoutActive && activeExercise && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col"
          >
            <div className="p-6 flex items-center justify-between border-b border-white/5">
              <button onClick={() => setIsWorkoutActive(false)} className="p-2 bg-white/5 rounded-full">
                <X size={20} />
              </button>
              <div className="text-center">
                <div className={cn("text-[10px] font-black uppercase tracking-[0.4em]", themeColor)}>
                  {EXERCISES.find(e => e.id === activeExercise)?.category}
                  {(() => {
                    const ex = EXERCISES.find(e => e.id === activeExercise);
                    return ex?.muscleHeads && ex.muscleHeads.length > 0 ? ` (${ex.muscleHeads.join(', ')})` : '';
                  })()}
                </div>
                <div className="text-lg font-black tracking-tight">{EXERCISES.find(e => e.id === activeExercise)?.name}</div>
              </div>
              <button 
                onClick={() => { 
                  haptics.medium(); 
                  const ex = EXERCISES.find(e => e.id === activeExercise);
                  startTimer(activeExercise ? getRestTime(activeExercise) : 60, ex?.name); 
                }}
                className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white"
              >
                <Clock size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-12 no-scrollbar">
              {/* Custom Anatomy Image Sync */}
              {activeExercise && customAssets[activeExercise]?.customAnatomyImage && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full aspect-video rounded-3xl overflow-hidden border border-white/10 bg-white/5 relative group"
                >
                  <img 
                    src={customAssets[activeExercise].customAnatomyImage} 
                    alt="Custom Anatomy"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Custom Anatomical Mapping</span>
                  </div>
                </motion.div>
              )}

              {/* Zone A: Target Intelligence */}
              <div className="space-y-4">
                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Target Intelligence</div>
                <div className="glass-panel p-6 space-y-4 border-white/10">
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2 rounded-lg text-white", themeBg)}>
                      <Zap size={16} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-white/40 uppercase">Focus</div>
                      <div className="text-sm font-bold">
                        {getWorkoutTypeForDay(activeDay) === 'Mechanical Tension' 
                          ? "High Load / Low Reps (5-8 reps)" 
                          : "Moderate Load / High Reps (10-15+ reps)"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2 rounded-lg text-white", themeBg)}>
                      <Play size={16} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-white/40 uppercase">Execution</div>
                      <div className="text-sm font-bold">
                        {getWorkoutTypeForDay(activeDay) === 'Mechanical Tension' 
                          ? "Longer rest intervals, explosive concentric force" 
                          : "Short rest intervals, continuous time under tension"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Zone B: Data Input Steppers */}
              <div className="space-y-8">
                <div className="flex flex-col items-center gap-8">
                  <div className="w-full">
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4 text-center">Load Protocol</div>
                    <div className="flex items-center justify-center gap-6">
                      <button 
                        onClick={() => updateLog(activeExercise, 'weight', (logs[activeExercise]?.weight || 60) - 2.5)}
                        className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-light active:scale-90 transition-all"
                      >
                        -
                      </button>
                      <div className="text-center min-w-[140px]">
                        <div className="text-6xl font-black tracking-tighter">{logs[activeExercise]?.weight || 60}</div>
                        <div className="text-xs font-black text-white/20 uppercase tracking-widest">Kilograms</div>
                      </div>
                      <button 
                        onClick={() => updateLog(activeExercise, 'weight', (logs[activeExercise]?.weight || 60) + 2.5)}
                        className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-light active:scale-90 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="w-full">
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4 text-center">Repetition Count</div>
                    <div className="flex items-center justify-center gap-6">
                      <button 
                        onClick={() => updateLog(activeExercise, 'reps', (logs[activeExercise]?.reps || 8) - 1)}
                        className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-light active:scale-90 transition-all"
                      >
                        -
                      </button>
                      <div className="text-center min-w-[140px]">
                        <div className="text-6xl font-black tracking-tighter">{logs[activeExercise]?.reps || 8}</div>
                        <div className="text-xs font-black text-white/20 uppercase tracking-widest">Reps</div>
                      </div>
                      <button 
                        onClick={() => updateLog(activeExercise, 'reps', (logs[activeExercise]?.reps || 8) + 1)}
                        className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-light active:scale-90 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black text-white/20 uppercase tracking-widest text-center">Technical Integrity</div>
                  <div className="flex justify-center gap-4">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button 
                        key={star}
                        onClick={() => { haptics.light(); updateLog(activeExercise, 'rating', star); }}
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                          star <= (logs[activeExercise]?.rating || 5) ? themeBg + " text-white shadow-lg" : "bg-white/5 text-white/20"
                        )}
                      >
                        <Star size={20} fill={star <= (logs[activeExercise]?.rating || 5) ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Set Selection Row */}
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-white/20 uppercase tracking-widest text-center">Set Selection</div>
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2, 3].map(idx => {
                      const exLog = currentSession?.exercises.find(e => e.exerciseId === activeExercise);
                      const isCompleted = exLog ? exLog.sets.length > idx : false;
                      return (
                        <button
                          key={idx}
                          disabled={isCompleted}
                          onClick={() => { haptics.light(); setActiveSetIndex(idx); }}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border",
                            activeSetIndex === idx ? "bg-white text-black border-white" : 
                            isCompleted ? "bg-white/5 text-white/10 border-white/5 cursor-not-allowed" :
                            "bg-white/5 text-white/40 border-white/10"
                          )}
                        >
                          Set {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            {/* Zone C: Rest Timer Module */}
            <div className="pt-8 pb-24 space-y-4">
              {showRestTimer ? (
                <RestTimer 
                  inline 
                  formRating={activeExercise ? (logs[activeExercise]?.rating || 5) : 5}
                  recoveryDeficit={readinessScore < 60}
                />
              ) : (
                <button 
                  onClick={() => {
                    const ex = EXERCISES.find(e => e.id === activeExercise);
                    startTimer(activeExercise ? getRestTime(activeExercise) : 60, ex?.name);
                    haptics.light();
                  }}
                  className="w-full py-5 rounded-3xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-[0.2em] text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Clock size={16} />
                  START REST
                </button>
              )}

              <button 
                onClick={() => handleLog(activeExercise)}
                className={cn("w-full py-6 rounded-3xl text-xl font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all text-white", themeBg)}
              >
                Save Set
              </button>
              
              <button 
                onClick={finishWorkout}
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
              >
                Finish Session
              </button>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Overlay */}
      <AnimatePresence>
        {showHistory && (
          <HistoryOverlay 
            onClose={() => setShowHistory(false)} 
            onLoadSession={loadPastSession}
          />
        )}
      </AnimatePresence>

      {/* Add Alternative Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex flex-col justify-end"
          >
            <div className="h-[80vh] bg-[#0A0A0A] rounded-t-[40px] border-t border-white/10 flex flex-col p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black tracking-tight">Add Alternative</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 bg-white/5 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="text" 
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-tension-blue transition-all"
                />
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Smart Filtered for {getWorkoutTypeForDay(activeDay)}</div>
                {getFilteredAlternatives().map(exercise => (
                  <button 
                    key={exercise.id}
                    onClick={() => addExerciseToSplit(exercise.id)}
                    className="w-full glass-panel p-4 flex items-center justify-between group"
                  >
                    <div className="text-left">
                      <div className="text-[10px] font-black text-white/30 uppercase">{exercise.category}</div>
                      <div className="font-bold">{exercise.name}</div>
                    </div>
                    <Plus size={18} className="text-white/20 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double Progression Alert */}
      <AnimatePresence>
        {showProgression && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-12 left-4 right-4 z-[110] glass-panel p-6 border-tension-blue bg-tension-blue/20 shadow-2xl"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-tension-blue rounded-full text-white">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="font-bold text-lg">Target Met!</h4>
                <p className="text-xs text-white/80">Double Progression triggered. Add precisely 2.5kg next week.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

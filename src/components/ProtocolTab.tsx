import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/db';
import { cn } from '../lib/utils';
import { Activity, Zap, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnabolicNutrientTracker } from './AnabolicNutrientTracker';
import { SystemicReadinessGauge } from './SystemicReadinessGauge';
import { VelocityTrendChart } from './VelocityTrendChart';

export const ProtocolTab: React.FC = () => {
  const [recoveryPercent, setRecoveryPercent] = useState(0);
  const [fatigueData, setFatigueData] = useState<any[]>([]);
  const [lastWorkout, setLastWorkout] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const workouts = await dbService.getWorkouts();
      
      if (workouts.length > 0) {
        setLastWorkout(workouts[0]);
        const lastWorkoutTime = new Date(workouts[0].date).getTime();
        const now = Date.now();
        const hoursSince = (now - lastWorkoutTime) / (1000 * 60 * 60);
        setRecoveryPercent(Math.min(100, Math.round((hoursSince / 72) * 100)));
      }

      const trend = workouts.slice(0, 10).reverse().map(w => {
        const totalSets = w.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
        const velocityLossSets = w.exercises.reduce((acc, ex) => 
          acc + ex.sets.filter(s => s.velocityState === 'Low').length, 0
        );
        return {
          date: new Date(w.date).toLocaleDateString(),
          fatigue: totalSets > 0 ? (velocityLossSets / totalSets) * 100 : 0
        };
      });
      setFatigueData(trend);
    };
    loadData();
  }, []);

  const latestFatigue = fatigueData.length > 0 ? fatigueData[fatigueData.length - 1].fatigue : 0;
  const hoursSinceLastWorkout = lastWorkout ? (Date.now() - new Date(lastWorkout.date).getTime()) / (1000 * 60 * 60) : 0;

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Bento Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Hero Header: Systemic Readiness */}
        <section className="col-span-2 glass-panel p-6 flex flex-col items-center justify-center gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Systemic Readiness</h2>
          <SystemicReadinessGauge readinessScore={recoveryPercent} mpsWindowHours={hoursSinceLastWorkout} />
          <div className="text-center">
            <p className="text-xl font-black tracking-tighter">{recoveryPercent < 60 ? "Recovery Prioritized" : "Growth Peak"}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Status</p>
          </div>
        </section>

        {/* Middle Tier: Predictive Analytics */}
        <section className="col-span-2 glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-stress-red" size={16} />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Predictive Velocity Trend</h2>
          </div>
          <VelocityTrendChart data={fatigueData} />
        </section>

        {/* Nutrition Delta Engine */}
        <section className="col-span-2">
          <AnabolicNutrientTracker 
            velocityTrend={latestFatigue} 
            lastWorkout={lastWorkout}
          />
        </section>
      </div>
    </div>
  );
};

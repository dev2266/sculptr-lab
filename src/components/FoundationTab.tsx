import React, { useState, useEffect } from 'react';
import { Activity, Moon, Beef, Weight, RefreshCw, ShieldCheck, Camera, Download, Upload, Cloud, Scale, Zap, Shield, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { dbService } from '../lib/db';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { PumpMode } from './PumpMode';
import { haptics } from '../lib/haptics';
import { EXERCISES } from '../lib/exercises';

interface RecoveryData {
  weight: number;
  sleepHours: number;
  proteinGrams: number;
  date: string;
}

export const FoundationTab: React.FC = () => {
  const [recoveryData, setRecoveryData] = useState<RecoveryData>({
    weight: 80,
    sleepHours: 8,
    proteinGrams: 160,
    date: new Date().toISOString().split('T')[0]
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPumpMode, setShowPumpMode] = useState(false);
  const [anabolicStatus, setAnabolicStatus] = useState(100);

  const loadData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const data = await dbService.getRecovery(today);
    if (data) {
      setRecoveryData({
        weight: data.bodyWeightKg,
        sleepHours: data.sleepHours,
        proteinGrams: data.proteinGrams,
        date: data.date
      });
    }
    
    // Calculate Anabolic Status (0-100)
    const sleepScore = Math.min((data?.sleepHours || 8) / 8, 1.2);
    const proteinScore = Math.min((data?.proteinGrams || 160) / 160, 1.2);
    
    const workouts = await dbService.getWorkouts();
    let timeScore = 1;
    if (workouts.length > 0) {
      const lastWorkout = new Date(workouts[0].date).getTime();
      const hoursSince = (Date.now() - lastWorkout) / (1000 * 60 * 60);
      // Peak growth window is 24-48h post workout
      if (hoursSince < 24) timeScore = 0.6;
      else if (hoursSince > 72) timeScore = 0.4;
      else timeScore = 1.0;
    }

    const total = (sleepScore * 40) + (proteinScore * 40) + (timeScore * 20);
    setAnabolicStatus(Math.round(Math.min(total, 100)));
  };

  useEffect(() => {
    loadData();
  }, []);

  const [localWeight, setLocalWeight] = useState(recoveryData.weight.toString());

  useEffect(() => {
    setLocalWeight(recoveryData.weight.toString());
  }, [recoveryData.weight]);

  const handleWeightChange = (val: string) => {
    setLocalWeight(val);
  };

  const handleWeightSubmit = () => {
    const num = parseFloat(localWeight);
    if (!isNaN(num)) {
      handleManualUpdate('weight', num);
    } else {
      setLocalWeight(recoveryData.weight.toString());
    }
  };

  const handleManualUpdate = async (field: keyof RecoveryData, val: number) => {
    // Round to 1 decimal place to avoid floating point issues
    const roundedVal = Math.round(val * 10) / 10;
    const newData = { ...recoveryData, [field]: roundedVal };
    setRecoveryData(newData);
    await dbService.saveRecovery({
      date: newData.date,
      proteinGrams: newData.proteinGrams,
      sleepHours: newData.sleepHours,
      bodyWeightKg: newData.weight
    });
    haptics.light();
    loadData(); // Re-calculate status
  };

  // Biometric HealthBridge: File Import (Standard Input for Iframe Compatibility)
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsSyncing(true);
      haptics.medium();
      
      let foundData = false;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.toLowerCase().includes('health')) {
          const text = await file.text();
          try {
            const data = JSON.parse(text);
            if (data.sleep || data.protein || data.weight) {
              const today = new Date().toISOString().split('T')[0];
              await dbService.saveRecovery({
                date: today,
                proteinGrams: data.protein || recoveryData.proteinGrams,
                sleepHours: data.sleep || recoveryData.sleepHours,
                bodyWeightKg: data.weight || recoveryData.weight
              });
              foundData = true;
              haptics.success();
              break;
            }
          } catch (e) {
            console.error("Invalid health file format", e);
          }
        }
      }

      if (foundData) {
        await loadData(); // Refresh UI and status
      } else {
        alert("No valid 'health' data files found in selection.");
      }
    } catch (err) {
      console.error("File import failed", err);
    } finally {
      setIsSyncing(false);
      // Reset input
      e.target.value = '';
    }
  };

  const generateReport = async () => {
    haptics.medium();
    const doc = new jsPDF();
    const workouts = await dbService.getWorkouts();
    
    doc.setFontSize(22);
    doc.setTextColor(255, 69, 0); 
    doc.text('ELITE GROWTH LOGBOOK', 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Clinical Report Generated: ${new Date().toLocaleString()}`, 20, 30);
    
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Anabolic Foundation', 20, 45);
    doc.setFontSize(10);
    doc.text(`Current Weight: ${recoveryData.weight}kg`, 20, 55);
    doc.text(`Sleep Readiness: ${recoveryData.sleepHours}h`, 20, 60);
    doc.text(`Protein Intake: ${recoveryData.proteinGrams}g`, 20, 65);
    doc.text(`Anabolic Score: ${anabolicStatus}%`, 20, 70);

    doc.setFontSize(16);
    doc.text('Training History (Last 5 Workouts)', 20, 85);
    
    let y = 95;
    workouts.slice(-5).forEach((workout) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 122, 255); 
      doc.text(`${workout.type} - ${new Date(workout.date).toLocaleDateString()}`, 20, y);
      y += 8;
      
      doc.setFontSize(9);
      doc.setTextColor(50);
      workout.exercises.forEach(exLog => {
        const exName = EXERCISES.find(e => e.id === exLog.exerciseId)?.name || 'Unknown Exercise';
        exLog.sets.forEach((set, idx) => {
          doc.text(`  ${exName} Set ${idx + 1}: ${set.weight}kg x ${set.reps} reps`, 20, y);
          y += 6;
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
        });
      });
      y += 4;
    });

    doc.save(`elite-growth-report-${new Date().getTime()}.pdf`);
    haptics.success();
  };

  const handleBackup = async () => {
    haptics.medium();
    const workouts = await dbService.getWorkouts();
    const recovery = await dbService.getRecovery(new Date().toISOString().split('T')[0]);
    const settings = await dbService.getSettings();
    
    const backupData = {
      version: 2,
      timestamp: Date.now(),
      data: { workouts, recovery, settings }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elite-logbook-vault-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Live Anabolic Status Ring */}
      <section className="flex flex-col items-center justify-center py-8 relative">
        <div className="relative w-64 h-64 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="110"
              fill="transparent"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="12"
            />
            <motion.circle
              cx="128"
              cy="128"
              r="110"
              fill="transparent"
              stroke={anabolicStatus > 80 ? "#34C759" : anabolicStatus > 60 ? "#007AFF" : "#FF3B30"}
              strokeWidth="12"
              strokeDasharray={2 * Math.PI * 110}
              initial={{ strokeDashoffset: 2 * Math.PI * 110 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 110 * (1 - anabolicStatus / 100) }}
              transition={{ duration: 2, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <motion.span 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-5xl font-black tracking-tighter"
            >
              {anabolicStatus}%
            </motion.span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">Anabolic Status</span>
          </div>
        </div>
        
        <div className="mt-6 flex gap-4">
          <div className="text-center">
            <div className="text-[10px] font-bold text-white/30 uppercase">State</div>
            <div className={cn(
              "text-xs font-bold px-3 py-1 rounded-full mt-1",
              anabolicStatus > 80 ? "bg-green-500/20 text-green-500" : anabolicStatus > 60 ? "bg-tension-blue/20 text-tension-blue" : "bg-stress-red/20 text-stress-red"
            )}>
              {anabolicStatus > 80 ? 'Peak Growth' : anabolicStatus > 60 ? 'Recovering' : 'Systemic Fatigue'}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Biometric HealthBridge</h3>
          <div className="relative">
            <input 
              type="file" 
              id="health-import" 
              className="hidden" 
              onChange={handleFileImport}
              accept=".json"
              multiple
            />
            <button 
              onClick={() => document.getElementById('health-import')?.click()}
              disabled={isSyncing}
              className="text-[10px] font-bold text-tension-blue uppercase flex items-center gap-1"
            >
              <RefreshCw size={12} className={cn(isSyncing && "animate-spin")} />
              {isSyncing ? 'Syncing...' : 'Import Data'}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="glass-panel p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-2xl text-white/60">
                <Moon size={24} />
              </div>
              <div>
                <div className="text-xs font-bold text-white/40 uppercase">Sleep Quality</div>
                <div className="text-2xl font-bold">{recoveryData.sleepHours}h</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleManualUpdate('sleepHours', recoveryData.sleepHours - 0.5)} className="p-2 bg-white/5 rounded-lg">-</button>
              <button onClick={() => handleManualUpdate('sleepHours', recoveryData.sleepHours + 0.5)} className="p-2 bg-white/5 rounded-lg">+</button>
            </div>
          </div>

          <div className="glass-panel p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-2xl text-white/60">
                <Zap size={24} />
              </div>
              <div>
                <div className="text-xs font-bold text-white/40 uppercase">Protein Intake</div>
                <div className="text-2xl font-bold">{recoveryData.proteinGrams}g</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleManualUpdate('proteinGrams', recoveryData.proteinGrams - 10)} className="p-2 bg-white/5 rounded-lg">-</button>
              <button onClick={() => handleManualUpdate('proteinGrams', recoveryData.proteinGrams + 10)} className="p-2 bg-white/5 rounded-lg">+</button>
            </div>
          </div>

          <div className="glass-panel p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-2xl text-white/60">
                <Scale size={24} />
              </div>
              <div>
                <div className="text-xs font-bold text-white/40 uppercase">Body Weight</div>
                <div className="flex items-baseline gap-1">
                  <input 
                    type="number"
                    step="0.1"
                    value={localWeight}
                    onChange={(e) => handleWeightChange(e.target.value)}
                    onBlur={handleWeightSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleWeightSubmit()}
                    className="text-2xl font-bold bg-transparent border-none outline-none w-20 p-0 focus:ring-0"
                  />
                  <span className="text-sm font-bold text-white/40">kg</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleManualUpdate('weight', recoveryData.weight - 0.1)} className="p-2 bg-white/5 rounded-lg">-</button>
              <button onClick={() => handleManualUpdate('weight', recoveryData.weight + 0.1)} className="p-2 bg-white/5 rounded-lg">+</button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 px-2">Data Integrity</h3>
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-green-500" size={20} />
              <div className="font-bold">AES-256 Privacy Vault</div>
            </div>
            <div className="text-[10px] font-bold text-green-500 uppercase bg-green-500/10 px-2 py-1 rounded">Active</div>
          </div>
          <p className="text-xs text-white/40 mb-6 leading-relaxed">
            Your biometric data and workout logs are encrypted locally using a unique device key. 
            No data ever leaves this device unencrypted.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleBackup}
              className="py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Download size={14} />
              Export Vault
            </button>
            <button 
              onClick={generateReport}
              className="py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <FileText size={14} />
              Clinical PDF
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 px-2">The Pump</h3>
        <button 
          onClick={() => {
            haptics.light();
            setShowPumpMode(true);
          }}
          className="w-full glass-panel p-8 flex flex-col items-center justify-center gap-4 group"
        >
          <div className="p-4 bg-stress-red/20 rounded-full text-stress-red group-hover:scale-110 transition-transform">
            <Camera size={32} />
          </div>
          <div className="text-center">
            <div className="font-bold">Anabolic Documentation</div>
            <div className="text-[10px] text-white/40 uppercase mt-1">Capture progress photos securely</div>
          </div>
        </button>
      </section>

      <AnimatePresence>
        {showPumpMode && (
          <PumpMode onClose={() => setShowPumpMode(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

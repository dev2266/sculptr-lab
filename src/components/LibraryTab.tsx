import React, { useState, useEffect, useRef } from 'react';
import { EXERCISES as STATIC_EXERCISES } from '../lib/exercises';
import { TimerProvider, useTimer } from '../contexts/TimerContext';
import { Search, Info, AlertTriangle, ChevronRight, Filter, Zap, Shield, Ruler, Activity, Camera, Trash2, Settings, X, Play, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AnatomyEngine } from './AnatomyEngine';
import { ChronoWave } from './ChronoWave';
import { Exercise } from '../types';
import { haptics } from '../lib/haptics';
import { dbService } from '../lib/db';
import { RestTimer } from './RestTimer';

export const LibraryTab: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isChronoActive, setIsChronoActive] = useState(false);
  const { startTimer } = useTimer();

  // Sync Chrono-Wave with exercise selection
  useEffect(() => {
    if (selectedExercise) {
      setIsChronoActive(true);
    } else {
      setIsChronoActive(false);
    }
  }, [selectedExercise]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>(STATIC_EXERCISES);
  const [categoryAssets, setCategoryAssets] = useState<Record<string, { customAnatomyImage?: string }>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCustomAssets();
  }, []);

  const loadCustomAssets = async () => {
    const customAssets = await dbService.getAllCustomAssets();
    
    // Separate category assets from exercise assets
    const catAssets: Record<string, { customAnatomyImage?: string }> = {};
    const exAssets: Record<string, { customAnatomyImage?: string }> = {};
    
    Object.entries(customAssets).forEach(([id, asset]) => {
      if (id.startsWith('category:')) {
        catAssets[id.replace('category:', '')] = asset;
      } else {
        exAssets[id] = asset;
      }
    });

    setCategoryAssets(catAssets);

    const merged = STATIC_EXERCISES.map(ex => ({
      ...ex,
      customAnatomyImage: exAssets[ex.id]?.customAnatomyImage || ex.customAnatomyImage
    }));
    setExercises(merged);
    
    // Update selected exercise if it's open
    if (selectedExercise) {
      const updated = merged.find(e => e.id === selectedExercise.id);
      if (updated) setSelectedExercise(updated);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedExercise || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      await dbService.saveCustomAsset(selectedExercise.id, { customAnatomyImage: base64 });
      haptics.medium();
      loadCustomAssets();
    };
    reader.readAsDataURL(file);
  };

  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeCategory || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      await dbService.saveCustomAsset(`category:${activeCategory}`, { customAnatomyImage: base64 });
      haptics.medium();
      loadCustomAssets();
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteImage = async () => {
    if (!selectedExercise) return;
    await dbService.saveCustomAsset(selectedExercise.id, { customAnatomyImage: undefined });
    haptics.light();
    loadCustomAssets();
  };

  const handleDeleteCategoryImage = async () => {
    if (!activeCategory) return;
    await dbService.saveCustomAsset(`category:${activeCategory}`, { customAnatomyImage: undefined });
    haptics.light();
    loadCustomAssets();
  };

  const categories = Array.from(new Set(exercises.map(e => e.category)));

  const filtered = exercises.filter(e => {
    const searchLower = search.toLowerCase();
    const matchesSearch = e.name.toLowerCase().includes(searchLower) ||
                         e.category.toLowerCase().includes(searchLower) ||
                         e.keywords?.some(k => k.toLowerCase().includes(searchLower));
    const matchesCategory = activeCategory ? e.category === activeCategory : true;
    return matchesSearch && matchesCategory;
  });

  const getCategoryMuscles = (category: string) => {
    switch (category) {
      case 'Chest': return ['Chest'];
      case 'Back': return ['Lats'];
      case 'Shoulders': return ['Front Delts', 'Lateral Delts', 'Rear Delts'];
      case 'Legs': return ['Quads', 'Hamstrings', 'Calves'];
      case 'Arms': return ['Biceps', 'Triceps'];
      default: return [];
    }
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Search & Filter Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Technical Manual</h2>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => { 
              haptics.light(); 
              setIsAdminMode(prev => !prev); 
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border cursor-pointer z-10",
              isAdminMode 
                ? "bg-stress-red/10 border-stress-red/30 text-stress-red shadow-[0_0_15px_rgba(255,59,48,0.1)]" 
                : "bg-white/5 border-white/5 text-white/20 hover:text-white/40 hover:border-white/10"
            )}
          >
            {isAdminMode && <span className="text-[8px] font-black uppercase tracking-widest">Admin Active</span>}
            <Settings size={16} className={cn(isAdminMode && "animate-spin-slow")} />
          </motion.button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
          <input 
            type="text"
            placeholder="Search Biomechanical Map (e.g. 'Lateral Head')..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-white/20 transition-all text-sm font-medium"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          <button 
            onClick={() => { haptics.light(); setActiveCategory(null); }}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
              !activeCategory ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/10"
            )}
          >
            All
          </button>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => { haptics.light(); setActiveCategory(cat); }}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                activeCategory === cat ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/10"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Category Anatomy Map (Drill-Down Step 1) */}
      {!selectedExercise && activeCategory && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40">{activeCategory} Overview</h3>
            <div className="flex items-center gap-4">
              {isAdminMode && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => categoryFileInputRef.current?.click()}
                    className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    title="Upload Category Overview Image"
                  >
                    <Camera size={14} />
                  </button>
                  {categoryAssets[activeCategory]?.customAnatomyImage && (
                    <button 
                      onClick={handleDeleteCategoryImage}
                      className="p-2 bg-stress-red/10 rounded-lg text-stress-red/60 hover:text-stress-red hover:bg-stress-red/20 transition-all"
                      title="Remove Category Image"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <input 
                    type="file"
                    ref={categoryFileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleCategoryImageUpload}
                  />
                </div>
              )}
              <span className="text-[8px] font-black uppercase text-white/20">General Mapping</span>
            </div>
          </div>
          
          {categoryAssets[activeCategory]?.customAnatomyImage ? (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-white/5 group">
              <img 
                src={categoryAssets[activeCategory].customAnatomyImage} 
                alt={`${activeCategory} Overview`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Custom Category Overview</span>
              </div>
            </div>
          ) : (
            <AnatomyEngine 
              primaryMuscles={getCategoryMuscles(activeCategory)}
              secondaryMuscles={[]}
              type="Mechanical Tension"
              className="py-4 h-48"
            />
          )}
        </motion.div>
      )}

      {/* Exercise List */}
      <div className="grid gap-4">
        {filtered.map(exercise => (
          <motion.div 
            key={exercise.id}
            layoutId={exercise.id}
            onClick={() => { haptics.medium(); setSelectedExercise(exercise); }}
            className="glass-panel p-6 flex items-center justify-between group cursor-pointer hover:border-white/20 transition-all"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg tracking-tight uppercase">{exercise.name}</h3>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  exercise.type === 'Mechanical Tension' ? "bg-tension-blue shadow-[0_0_8px_rgba(0,122,255,0.5)]" : "bg-stress-red shadow-[0_0_8px_rgba(255,59,48,0.5)]"
                )} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
                  {exercise.category}
                  {exercise.muscleHeads && exercise.muscleHeads.length > 0 && ` (${exercise.muscleHeads.join(', ')})`}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">•</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{exercise.difficulty}</span>
                {isAdminMode && (
                  <>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">•</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-stress-red/60">Edit Mode</span>
                  </>
                )}
              </div>
            </div>
            <ChevronRight className="text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all" size={20} />
          </motion.div>
        ))}
      </div>

      {/* Detailed View Modal */}
      <AnimatePresence>
        {selectedExercise && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/95 flex flex-col overflow-y-auto no-scrollbar"
          >
            {/* Modal Header */}
            <div className="p-6 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-[410] border-b border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                  {selectedExercise.category}
                  {selectedExercise.muscleHeads && selectedExercise.muscleHeads.length > 0 && ` (${selectedExercise.muscleHeads.join(', ')})`}
                </span>
                <h2 className="text-2xl font-black tracking-tighter uppercase">{selectedExercise.name}</h2>
              </div>
              <div className="flex items-center gap-3">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { 
                    haptics.light(); 
                    setIsAdminMode(prev => !prev); 
                  }}
                  className={cn(
                    "p-2 rounded-xl transition-all border cursor-pointer",
                    isAdminMode 
                      ? "bg-stress-red/10 border-stress-red/30 text-stress-red shadow-[0_0_15px_rgba(255,59,48,0.1)]" 
                      : "bg-white/5 border-white/5 text-white/20 hover:text-white/40 hover:border-white/10"
                  )}
                  title={isAdminMode ? "Disable Admin Mode" : "Enable Admin Mode"}
                >
                  <Settings size={20} className={cn(isAdminMode && "animate-spin-slow")} />
                </motion.button>
                <button 
                  onClick={() => setSelectedExercise(null)}
                  className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-12 pb-32">
              {/* Focus Mode: Anatomy Engine */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Anatomical Focus</div>
                  {isAdminMode && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        title="Upload Custom Biomechanical Image"
                      >
                        <Camera size={14} />
                      </button>
                      {selectedExercise.customAnatomyImage && (
                        <button 
                          onClick={handleDeleteImage}
                          className="p-2 bg-stress-red/10 rounded-lg text-stress-red/60 hover:text-stress-red hover:bg-stress-red/20 transition-all"
                          title="Remove Custom Image"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <input 
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </div>
                  )}
                </div>
                <div className="glass-panel p-8 bg-white/[0.02] border-white/5 relative overflow-hidden min-h-[300px] flex items-center justify-center">
                  {selectedExercise.customAnatomyImage ? (
                    <div className="relative w-full aspect-square max-w-sm rounded-2xl overflow-hidden group">
                      <img 
                        src={selectedExercise.customAnatomyImage} 
                        alt={selectedExercise.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Custom Biomechanical Map</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-white/10 space-y-4">
                      <Activity size={48} className="opacity-20" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Biomechanical Data Active</span>
                    </div>
                  )}
                  
                  {/* Chrono-Wave Sync */}
                  <div className="absolute bottom-4 right-4 w-16 h-16 opacity-60">
                    <ChronoWave isActive={isChronoActive} type={selectedExercise.type} compact />
                  </div>
                </div>
              </div>

              {/* Best Workout Guidance */}
              <div className="space-y-6">
                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Digital Physiologist Guidance</div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="glass-panel p-6 border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        selectedExercise.type === 'Mechanical Tension' ? "bg-tension-blue/20 text-tension-blue" : "bg-stress-red/20 text-stress-red"
                      )}>
                        <Zap size={18} />
                      </div>
                      <h4 className="font-bold uppercase tracking-tight">Primary Stimulus</h4>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">
                      {selectedExercise.type === 'Mechanical Tension' 
                        ? "This exercise prioritizes high-load mechanical tension. Focus on explosive concentric force and controlled eccentric descent to maximize motor unit recruitment."
                        : "This exercise focuses on metabolic stress and cellular swelling. Maintain continuous tension and prioritize high-volume pump sets with minimal rest."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-panel p-4 border-white/5">
                      <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Rep Range</div>
                      <div className="text-lg font-black tracking-tight">
                        {selectedExercise.type === 'Mechanical Tension' ? "5-8 Reps" : "12-15+ Reps"}
                      </div>
                    </div>
                    <div 
                      onClick={() => { haptics.medium(); startTimer(selectedExercise.type === 'Mechanical Tension' ? 180 : 60, selectedExercise.name); }}
                      className="glass-panel p-4 border-white/5 cursor-pointer hover:border-tension-blue/40 transition-all active:scale-95 group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Rest Interval</div>
                        <Clock size={12} className="text-white/20 group-hover:text-tension-blue transition-colors" />
                      </div>
                      <div className="text-lg font-black tracking-tight">
                        {selectedExercise.type === 'Mechanical Tension' ? "180s" : "60s"}
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel p-6 border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/5 text-white/40">
                        <Play size={18} />
                      </div>
                      <h4 className="font-bold uppercase tracking-tight">Execution Protocol</h4>
                    </div>
                    <ul className="space-y-2">
                      {selectedExercise.type === 'Mechanical Tension' ? (
                        <>
                          <li className="text-xs text-white/60 flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-tension-blue mt-1.5" />
                            <span>Full range of motion with a 2-second eccentric phase.</span>
                          </li>
                          <li className="text-xs text-white/60 flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-tension-blue mt-1.5" />
                            <span>Pause for 1 second at the peak of the stretch.</span>
                          </li>
                        </>
                      ) : (
                        <>
                          <li className="text-xs text-white/60 flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-stress-red mt-1.5" />
                            <span>Constant motion. Do not lock out at the top.</span>
                          </li>
                          <li className="text-xs text-white/60 flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-stress-red mt-1.5" />
                            <span>Focus on the "squeeze" at the peak contraction.</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Rotation Logic / Change Rule */}
              {selectedExercise.lastRotated && (
                <div className="glass-panel p-4 flex items-center justify-between border-stress-red/20 bg-stress-red/5">
                  <div className="flex items-center gap-3">
                    <Activity size={16} className="text-stress-red animate-pulse" />
                    <div>
                      <div className="text-[10px] font-black uppercase text-stress-red tracking-widest">Rotation Protocol</div>
                      <div className="text-xs font-black uppercase">
                        {Math.max(0, 28 - Math.floor((new Date().getTime() - new Date(selectedExercise.lastRotated).getTime()) / (1000 * 60 * 60 * 24)))} Days Until Required Rotation
                      </div>
                    </div>
                  </div>
                  <div className="text-[8px] font-black uppercase text-white/20">4-Week Cycle</div>
                </div>
              )}

              {/* Chrono-Wave Reference (2s Descent / 2s Ascent) */}
              <section className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Chrono-Wave Reference</h3>
                <div className="glass-panel p-6 flex items-center justify-around gap-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-2xl font-black text-tension-blue">2s</div>
                    <div className="text-[8px] font-black uppercase tracking-widest text-white/40">Descent (Eccentric)</div>
                    <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        animate={{ x: [-48, 48] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-full h-full bg-tension-blue"
                      />
                    </div>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-2xl font-black text-stress-red">2s</div>
                    <div className="text-[8px] font-black uppercase tracking-widest text-white/40">Ascent (Concentric)</div>
                    <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        animate={{ x: [48, -48] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-full h-full bg-stress-red"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed text-center font-medium italic">
                  80% of muscle micro-trauma occurs during the eccentric phase. Adhere to the 2:0:2:0 tempo protocol.
                </p>
              </section>

              {/* Bento Zone 2: Strength Curve */}
              <section className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Growth Stimulus Profile</h3>
                <div className="glass-panel p-8 space-y-8">
                  <div className="flex justify-between items-end h-32 gap-4">
                    {[
                      { label: 'Stretch', value: selectedExercise.strengthCurve.stretch },
                      { label: 'Mid', value: selectedExercise.strengthCurve.mid },
                      { label: 'Contracted', value: selectedExercise.strengthCurve.contracted }
                    ].map((point, idx) => (
                      <div key={point.label} className="flex-1 flex flex-col items-center gap-4">
                        <div className="relative w-full flex-1 flex items-end justify-center">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${point.value}%` }}
                            className={cn(
                              "w-full rounded-t-xl transition-all duration-1000",
                              selectedExercise.type === 'Mechanical Tension' ? "bg-tension-blue/20 border-t-2 border-tension-blue" : "bg-stress-red/20 border-t-2 border-stress-red"
                            )}
                          />
                          <div className="absolute -top-6 text-[10px] font-black">{point.value}%</div>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{point.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed text-center font-medium italic">
                    This exercise is hardest at the <span className="text-white">{
                      selectedExercise.strengthCurve.stretch >= selectedExercise.strengthCurve.contracted ? 'Stretch' : 'Contracted'
                    }</span> position, maximizing {selectedExercise.type === 'Mechanical Tension' ? 'Mechanical Tension' : 'Metabolic Stress'}.
                  </p>
                </div>
              </section>

              {/* Bento Zone 3: Instruction Tray */}
              <section className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Form Mandate</h3>
                <div className="grid gap-4">
                  {selectedExercise.cues.map((cue, idx) => (
                    <div key={idx} className="glass-panel p-5 flex items-center gap-4 border-white/5 hover:border-white/10 transition-all">
                      <div className="text-2xl">{cue.icon}</div>
                      <div className="flex-1">
                        <div className="text-sm font-black uppercase tracking-tight">{cue.text}</div>
                        <div className="text-[10px] text-white/40 font-medium">Clinical Execution Cue {idx + 1}</div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="p-6 bg-stress-red/5 border border-stress-red/20 rounded-2xl flex gap-4 mt-4">
                    <AlertTriangle className="text-stress-red shrink-0" size={20} />
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase text-stress-red tracking-widest">Critical Warning</div>
                      <p className="text-xs text-white/60 leading-relaxed">{selectedExercise.formWarning}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Equipment & Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-panel p-4 flex flex-col items-center gap-2">
                  <Shield size={16} className="text-white/20" />
                  <div className="text-[8px] font-black uppercase text-white/20">Equipment</div>
                  <div className="text-xs font-black uppercase">{selectedExercise.equipment}</div>
                </div>
                <div className="glass-panel p-4 flex flex-col items-center gap-2">
                  <Activity size={16} className="text-white/20" />
                  <div className="text-[8px] font-black uppercase text-white/20">Difficulty</div>
                  <div className="text-xs font-black uppercase">{selectedExercise.difficulty}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const X_ICON = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

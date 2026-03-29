import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Zap, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { WorkoutLog } from '../types';
import { foodDatabase } from '../lib/foodDatabase';

interface NutrientEntry {
  id: string;
  foodName: string;
  quantity: string;
  protein: number;
  calories: number;
}

export const AnabolicNutrientTracker: React.FC<{ velocityTrend: number, lastWorkout: WorkoutLog | null }> = ({ velocityTrend, lastWorkout }) => {
  const [entries, setEntries] = useState<NutrientEntry[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newFood, setNewFood] = useState({ 
    name: '', 
    qty: '', 
    protein: '', 
    calories: '',
    baseProtein: 0,
    baseCalories: 0,
    baseQtyValue: 1 
  });
  const [suggestions, setSuggestions] = useState<typeof foodDatabase>([]);

  const totalProtein = entries.reduce((sum, e) => sum + e.protein, 0);
  const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);
  
  const isFatigued = velocityTrend > 30;
  const isPostWorkout = lastWorkout && (Date.now() - new Date(lastWorkout.date).getTime()) < (4 * 60 * 60 * 1000);

  const handleNameChange = (name: string) => {
    setNewFood(prev => ({ ...prev, name }));
    if (name.length > 1) {
      const filtered = foodDatabase.filter(f => f.name.toLowerCase().includes(name.toLowerCase()));
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (food: typeof foodDatabase[0]) => {
    const baseQtyValue = parseFloat(food.unit) || 1; 
    setNewFood({ 
      name: food.name, 
      qty: food.unit, 
      protein: food.protein.toString(), 
      calories: food.calories.toString(),
      baseProtein: food.protein,
      baseCalories: food.calories,
      baseQtyValue
    });
    setSuggestions([]);
  };

  const handleQtyChange = (qty: string) => {
    const numericQty = parseFloat(qty) || 0;
    const multiplier = numericQty / (newFood.baseQtyValue || 1);
    setNewFood(prev => ({
      ...prev,
      qty,
      protein: (newFood.baseProtein * multiplier).toFixed(1),
      calories: Math.round(newFood.baseCalories * multiplier).toString()
    }));
  };

  const handleAdd = () => {
    if (newFood.name && newFood.protein && newFood.calories) {
      setEntries([...entries, { 
        id: Date.now().toString(), 
        foodName: newFood.name, 
        quantity: newFood.qty, 
        protein: parseFloat(newFood.protein), 
        calories: parseFloat(newFood.calories) 
      }]);
      setNewFood({ name: '', qty: '', protein: '', calories: '', baseProtein: 0, baseCalories: 0, baseQtyValue: 1 });
      setIsAdding(false);
    }
  };

  return (
    <div className="glass-panel p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Nutrition Delta</h3>
        {isFatigued && <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">Recovery+ Active</span>}
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
          <span>Item</span>
          <span>Qty</span>
          <span>Protein</span>
        </div>
        
        {entries.map((entry) => (
          <div key={entry.id} className="grid grid-cols-3 gap-2 items-center p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="text-xs font-medium text-white">{entry.foodName}</span>
            <span className="text-xs text-white/60">{entry.quantity}</span>
            <span className="text-xs font-bold text-tension-blue">{entry.protein}g</span>
          </div>
        ))}
      </div>

      <button 
        onClick={() => setIsAdding(true)}
        className="w-full py-3 rounded-lg border border-dashed border-white/10 flex items-center justify-center gap-2 text-white/40 hover:text-white hover:border-white/30 transition-all"
      >
        <Plus size={16} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Add Entry</span>
      </button>

      {/* Net Anabolic State Gauge */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
          <span>Net Anabolic State</span>
          <span>{totalProtein}g / 150g</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (totalProtein / 150) * 100)}%` }}
            className="h-full bg-tension-blue"
          />
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 p-6 glass-panel bg-black/90 backdrop-blur-2xl rounded-t-3xl border-t border-white/10 z-50 max-h-[80vh] overflow-y-auto will-change-transform"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black uppercase">Add Nutrient</h3>
                <button onClick={() => setIsAdding(false)}><X size={24} /></button>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 text-white/40" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search Food..." 
                    className="w-full p-4 pl-10 rounded-xl bg-white/5 border border-white/10" 
                    value={newFood.name} 
                    onChange={e => handleNameChange(e.target.value)} 
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-[#222] border border-white/10 rounded-xl mt-1 z-10 max-h-40 overflow-y-auto">
                      {suggestions.map(s => (
                        <button key={s.name} onClick={() => selectSuggestion(s)} className="w-full text-left p-3 hover:bg-white/10 text-xs">{s.name}</button>
                      ))}
                    </div>
                  )}
                </div>
                <input type="text" placeholder="Quantity" className="w-full p-4 rounded-xl bg-white/5 border border-white/10" value={newFood.qty} onChange={e => handleQtyChange(e.target.value)} />
                <input type="number" placeholder="Protein (g)" className="w-full p-4 rounded-xl bg-white/5 border border-white/10" value={newFood.protein} onChange={e => setNewFood({...newFood, protein: e.target.value})} />
                <input type="number" placeholder="Calories" className="w-full p-4 rounded-xl bg-white/5 border border-white/10" value={newFood.calories} onChange={e => setNewFood({...newFood, calories: e.target.value})} />
                <button onClick={handleAdd} className="w-full py-4 rounded-xl bg-tension-blue text-black font-bold uppercase">Add Entry</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

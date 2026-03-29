import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Dumbbell, Library, Activity, History } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'protocol', label: 'Protocol', icon: Book },
  { id: 'training', label: 'Training', icon: Dumbbell },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'foundation', label: 'Foundation', icon: Activity },
  { id: 'history', label: 'Journal', icon: History },
];

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className={cn("p-4 pt-10 pb-6", activeTab === 'protocol' ? "flex flex-col items-center justify-center" : "")}>
        {activeTab === 'protocol' ? (
          <div className="flex flex-col items-center">
            <div className="flex items-center mb-1">
              <span className="text-4xl font-black tracking-tighter text-white uppercase">Sculptr</span>
              <span className="ml-1 text-[10px] font-black bg-tension-blue text-black px-1.5 py-0.5 rounded-sm uppercase self-start mt-1 shadow-[0_0_10px_rgba(0,122,255,0.4)]">Lab</span>
            </div>
            <div className="text-[10px] font-bold tracking-[0.3em] text-white uppercase">
              by DBR
            </div>
          </div>
        ) : (
          <h1 className="text-xl font-bold tracking-tight">
            {TABS.find(t => t.id === activeTab)?.label}
          </h1>
        )}
      </header>

      <main className="flex-1 px-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 glass-panel rounded-none border-t border-white/10 px-4 py-3 safe-area-bottom z-50">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 transition-colors",
                  isActive ? "text-tension-blue" : "text-white/40"
                )}
              >
                <Icon size={20} />
                <span className="text-[9px] font-medium uppercase tracking-widest">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

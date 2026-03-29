import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { ProtocolTab } from './components/ProtocolTab';
import { TrainingTab } from './components/TrainingTab';
import { LibraryTab } from './components/LibraryTab';
import { FoundationTab } from './components/FoundationTab';
import { JournalTab } from './components/JournalTab';
import { TimerProvider, useTimer } from './contexts/TimerContext';
import { RestTimer } from './components/RestTimer';
import { AnimatePresence } from 'motion/react';

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('protocol');
  const { showRestTimer, isLoggingActive } = useTimer();

  const renderTab = () => {
    switch (activeTab) {
      case 'protocol':
        return <ProtocolTab />;
      case 'training':
        return <TrainingTab />;
      case 'library':
        return <LibraryTab />;
      case 'history':
        return <JournalTab />;
      case 'foundation':
        return <FoundationTab />;
      default:
        return <ProtocolTab />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderTab()}
      
      {/* Global Rest Timer Overlay */}
      <AnimatePresence>
        {showRestTimer && !isLoggingActive && (
          <RestTimer />
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default function App() {
  return (
    <TimerProvider>
      <AppContent />
    </TimerProvider>
  );
}

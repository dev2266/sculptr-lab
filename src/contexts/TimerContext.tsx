import React, { createContext, useContext, useState, useEffect } from 'react';

interface TimerContextType {
  showRestTimer: boolean;
  timerDuration: number;
  timeLeft: number;
  isActive: boolean;
  activeExerciseName: string | null;
  isLoggingActive: boolean;
  startTimer: (duration: number, exerciseName?: string) => void;
  stopTimer: () => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  setIsLoggingActive: (active: boolean) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const [activeExerciseName, setActiveExerciseName] = useState<string | null>(null);
  const [isLoggingActive, setIsLoggingActive] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      // We keep showRestTimer true for a "complete" state or just hide it
      // For now let's just hide it or let the component handle the success haptic
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const startTimer = (duration: number, exerciseName?: string) => {
    setTimerDuration(duration);
    setTimeLeft(duration);
    setActiveExerciseName(exerciseName || null);
    setIsActive(true);
    setShowRestTimer(true);
  };

  const stopTimer = () => {
    setShowRestTimer(false);
    setIsActive(false);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setTimeLeft(timerDuration);
    setIsActive(true);
  };

  return (
    <TimerContext.Provider value={{ 
      showRestTimer, 
      timerDuration, 
      timeLeft, 
      isActive, 
      activeExerciseName, 
      isLoggingActive,
      startTimer, 
      stopTimer,
      toggleTimer,
      resetTimer,
      setIsLoggingActive
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) throw new Error('useTimer must be used within a TimerProvider');
  return context;
};

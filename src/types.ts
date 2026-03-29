/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WorkoutType = 'Mechanical Tension' | 'Metabolic Stress';
export type SplitPlan = '4-Day Elite Growth' | '3-Day Full Body' | '6-Day PPL' | '5-Day Bro Split';
export type SplitDay = 'Day 1' | 'Day 2' | 'Day 3' | 'Day 4' | 'Day 5' | 'Day 6' | 'Day 7';

export interface ExerciseCue {
  icon: string;
  text: string;
}

export interface StrengthCurve {
  stretch: number; // 0-100
  mid: number;
  contracted: number;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  muscleHeads?: string[]; // e.g., ['Sternal Head', 'Clavicular Head']
  targetMuscles: string[]; // Legacy support
  description: string;
  formWarning: string;
  type: WorkoutType;
  splitCategory?: 'Upper' | 'Lower' | 'Push' | 'Pull' | 'Legs' | 'Full Body';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  equipment: string;
  cues: ExerciseCue[];
  strengthCurve: StrengthCurve;
  skeletalOverlay?: 'Shoulder Girdle' | 'Spine Alignment' | 'None';
  lastRotated?: string; // ISO Date
  customAnatomyImage?: string; // Base64 or URL
  keywords?: string[];
}

export interface SetLog {
  reps: number;
  weight: number;
  rating: number; // 1-5
  velocityState: 'High' | 'Medium' | 'Low';
  timestamp: number;
}

export interface ExerciseLog {
  exerciseId: string;
  targetWeight: number;
  targetReps: number;
  lastRotated: number; // Timestamp
  sets: SetLog[];
  tempoAdherence?: number; // 0-100 percentage
}

export interface WorkoutLog {
  id: string;
  date: string; // ISO string
  type: WorkoutType;
  exercises: ExerciseLog[];
  readinessScore?: number; // CNS status at time of lift
}

export interface RecoveryLog {
  date: string;
  proteinGrams: number;
  sleepHours: number;
  bodyWeightKg: number;
}

export interface UserSettings {
  targetProteinPerKg: number; // 1.6 - 2.0
  targetSleepHours: number; // 7 - 9
  isEncrypted: boolean;
  hasICloudSync: boolean;
  lastBackupPath?: string;
  activeSplit: string[]; // List of exercise IDs
  customSplits?: Record<string, string[]>; // Plan-Day -> Exercise IDs
}

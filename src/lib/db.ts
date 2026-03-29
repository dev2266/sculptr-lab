import { openDB, IDBPDatabase } from 'idb';
import { WorkoutLog, RecoveryLog, UserSettings } from '../types';
import { encryptData, decryptData } from './crypto';

const DB_NAME = 'elite-growth-db';
const DB_VERSION = 3; // Bump version for custom assets

const getMasterKey = () => {
  let key = localStorage.getItem('elite-growth-master-key');
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem('elite-growth-master-key', key);
  }
  return key;
};

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains('workouts')) {
        db.createObjectStore('workouts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('recovery')) {
        db.createObjectStore('recovery', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('targets')) {
        db.createObjectStore('targets', { keyPath: 'exerciseId' });
      }
      if (!db.objectStoreNames.contains('custom_assets')) {
        db.createObjectStore('custom_assets', { keyPath: 'exerciseId' });
      }
    },
  });
}

export const dbService = {
  async saveCustomAsset(exerciseId: string, asset: { customAnatomyImage?: string }) {
    const db = await initDB();
    const encrypted = await encryptData(asset, getMasterKey());
    return db.put('custom_assets', { exerciseId, data: encrypted });
  },
  async getCustomAsset(exerciseId: string): Promise<{ customAnatomyImage?: string } | undefined> {
    const db = await initDB();
    const item = await db.get('custom_assets', exerciseId);
    if (item?.data) {
      try {
        return await decryptData(item.data, getMasterKey());
      } catch (e) {
        return undefined;
      }
    }
    return item;
  },
  async getAllCustomAssets(): Promise<Record<string, { customAnatomyImage?: string }>> {
    const db = await initDB();
    const all = await db.getAll('custom_assets');
    const assets: Record<string, { customAnatomyImage?: string }> = {};
    for (const item of all) {
      if (item.data) {
        try {
          const decrypted = await decryptData(item.data, getMasterKey());
          assets[item.exerciseId] = decrypted;
        } catch (e) {
          // Skip
        }
      }
    }
    return assets;
  },
  async saveWorkout(workout: WorkoutLog) {
    const db = await initDB();
    const encrypted = await encryptData(workout, getMasterKey());
    return db.put('workouts', { id: workout.id, data: encrypted });
  },
  async deleteWorkout(id: string) {
    const db = await initDB();
    return db.delete('workouts', id);
  },
  async getWorkouts(): Promise<WorkoutLog[]> {
    const db = await initDB();
    const all = await db.getAll('workouts');
    const decrypted = await Promise.all(all.map(async (item) => {
      if (item.data) {
        try {
          return await decryptData(item.data, getMasterKey());
        } catch (e) {
          return null;
        }
      }
      return item; // Fallback for old unencrypted data
    }));
    return decrypted.filter(Boolean) as WorkoutLog[];
  },
  async saveRecovery(log: RecoveryLog) {
    const db = await initDB();
    const encrypted = await encryptData(log, getMasterKey());
    return db.put('recovery', { date: log.date, data: encrypted });
  },
  async getRecovery(date: string): Promise<RecoveryLog | undefined> {
    const db = await initDB();
    const item = await db.get('recovery', date);
    if (item?.data) {
      try {
        return await decryptData(item.data, getMasterKey());
      } catch (e) {
        return undefined;
      }
    }
    return item;
  },
  async saveSettings(settings: UserSettings) {
    const db = await initDB();
    const encrypted = await encryptData(settings, getMasterKey());
    return db.put('settings', { id: 'current', data: encrypted });
  },
  async getSettings(): Promise<UserSettings | undefined> {
    const db = await initDB();
    const item = await db.get('settings', 'current');
    if (item?.data) {
      try {
        return await decryptData(item.data, getMasterKey());
      } catch (e) {
        return undefined;
      }
    }
    return item;
  },
  async updateTargetWeight(exerciseId: string, targetWeight: number, targetReps: number) {
    const db = await initDB();
    const existing = await this.getTarget(exerciseId);
    const data = { 
      exerciseId, 
      targetWeight, 
      targetReps, 
      lastUpdated: Date.now(),
      lastRotated: existing?.lastRotated || Date.now() 
    };
    const encrypted = await encryptData(data, getMasterKey());
    return db.put('targets', { exerciseId, data: encrypted });
  },
  async rotateExercise(oldId: string, newId: string) {
    const db = await initDB();
    const existing = await this.getTarget(oldId);
    await db.delete('targets', oldId);
    const data = {
      exerciseId: newId,
      targetWeight: existing?.targetWeight || 60,
      targetReps: existing?.targetReps || 8,
      lastUpdated: Date.now(),
      lastRotated: Date.now()
    };
    const encrypted = await encryptData(data, getMasterKey());
    return db.put('targets', { exerciseId: newId, data: encrypted });
  },
  async getTarget(exerciseId: string): Promise<any> {
    const db = await initDB();
    const item = await db.get('targets', exerciseId);
    if (item?.data) {
      try {
        return await decryptData(item.data, getMasterKey());
      } catch (e) {
        return undefined;
      }
    }
    return item;
  }
};

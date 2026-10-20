/** Versioned AsyncStorage persistence for unlocks and final completion, excluding in-progress level state. */
import AsyncStorage from '@react-native-async-storage/async-storage';
export const PROGRESS_KEY = '@chromaze/progression/v1';
export type Progress = { unlocked: number; finished: boolean };
export const emptyProgress: Progress = { unlocked: 1, finished: false };
/**
 * Validates untrusted stored JSON and clamps one-based unlocks to the available level count.
 * Missing or malformed JSON falls back to initial progression; invalid fields use safe defaults.
 */
export function parseProgress(raw: string | null, count: number): Progress {
  try {
    const data: unknown = JSON.parse(raw ?? 'null');
    if (!data || typeof data !== 'object') return emptyProgress;
    const value = data as Partial<Progress>;
    return { unlocked: typeof value.unlocked === 'number' && Number.isFinite(value.unlocked)
      ? Math.max(1, Math.min(count, Math.floor(value.unlocked))) : 1, finished: value.finished === true };
  } catch { return emptyProgress; }
}
/** Loads and validates progression; storage I/O failures still reject for the app's error UI. */
export const loadProgress = async (count: number) => parseProgress(await AsyncStorage.getItem(PROGRESS_KEY), count);
/** Returns the storage promise; App serializes saves and handles failures/retries. */
export const saveProgress = (progress: Progress) => AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));

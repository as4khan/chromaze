import AsyncStorage from '@react-native-async-storage/async-storage';
export const PROGRESS_KEY = '@chromaze/progression/v1';
export type Progress = { unlocked: number; finished: boolean };
export const emptyProgress: Progress = { unlocked: 1, finished: false };
export function parseProgress(raw: string | null, count: number): Progress {
  try {
    const data: unknown = JSON.parse(raw ?? 'null');
    if (!data || typeof data !== 'object') return emptyProgress;
    const value = data as Partial<Progress>;
    return { unlocked: typeof value.unlocked === 'number' && Number.isFinite(value.unlocked)
      ? Math.max(1, Math.min(count, Math.floor(value.unlocked))) : 1, finished: value.finished === true };
  } catch { return emptyProgress; }
}
export const loadProgress = async (count: number) => parseProgress(await AsyncStorage.getItem(PROGRESS_KEY), count);
export const saveProgress = (progress: Progress) => AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));

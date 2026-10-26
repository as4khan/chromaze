/** Local campaign persistence boundary; keep the original key so existing saves migrate without being lost. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Progress, parseProgress, mergeProgress } from '../game/progression';
export { Progress, emptyProgress, parseProgress } from '../game/progression';
export const PROGRESS_KEY = '@chromaze/progression/v1';
/** Read migration is non-destructive; the next successful completion saves the version-3 record, including personal records. */
export const loadProgress = async (count: number) => parseProgress(await AsyncStorage.getItem(PROGRESS_KEY), count);
/** Re-read before a serialized write: a failed initial load must never overwrite a more complete old save. */
export async function saveProgress(progress: Progress, count: number): Promise<Progress> {
  const merged = mergeProgress(await loadProgress(count), progress, count);
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(merged));
  return merged;
}

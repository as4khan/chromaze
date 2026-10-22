/** A separate AsyncStorage key preserves existing progression when cosmetic preferences change. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BallId, parseBallPreference } from '../appearance';
export const BALL_KEY = '@chromaze/appearance/v1';
/** Storage failures reject for the app to surface; missing/invalid data defaults to Amethyst. */
export const loadBall = async (): Promise<BallId> => parseBallPreference(await AsyncStorage.getItem(BALL_KEY));
let writes = Promise.resolve();
/** Order rapid choices at the storage boundary; a failed write cannot block the next selection. */
export function saveBall(id: BallId): Promise<void> {
  const save = writes.catch(() => {}).then(() => AsyncStorage.setItem(BALL_KEY, JSON.stringify(id)));
  writes = save;
  return save;
}

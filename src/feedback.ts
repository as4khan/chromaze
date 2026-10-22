/** Optional native tactile feedback, isolated from movement timing and progression. */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Fire once per committed slide; never await hardware or emit feedback for individual tiles. */
export async function slideFeedback(completed: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (completed) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (Platform.OS === 'android') await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick);
    else await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Unsupported hardware or disabled haptics must never interrupt a buffered slide or saved progress.
  }
}

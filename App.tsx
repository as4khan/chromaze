/** Application shell: font loading, safe areas, screen navigation, and persistent level unlocks. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { HomeScreen } from './src/screens/HomeScreen';
import { GameScreen } from './src/screens/GameScreen';
import { levels } from './src/game/levels';
import { Progress, emptyProgress, loadProgress, saveProgress } from './src/storage/progression';
import { theme } from './src/theme';
/** Owns progression and navigation; each keyed GameScreen owns one fresh level run. */
export default function App() {
  const [fonts, fontError] = useFonts({ SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  // Completion callbacks need the latest unlocks even before React renders the next state.
  const progressRef = useRef(progress);
  const writes = useRef(Promise.resolve());
  const [storageError, setStorageError] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  // Show Play only after reading stored progress, avoiding a flash of default unlocks.
  useEffect(() => {
    loadProgress(levels.length).then(value => { progressRef.current = value; setProgress(value); })
      .catch(() => setStorageError(true)).finally(() => setReady(true));
  }, []);
  /** Records a zero-based completed level index without reducing unlocks on replay. */
  const onComplete = useCallback((completed: number) => {
    // Screen indices are zero-based; persisted unlocked levels are one-based.
    const next = { unlocked: Math.max(progressRef.current.unlocked, Math.min(levels.length, completed + 2)),
      finished: progressRef.current.finished || completed === levels.length - 1 };
    progressRef.current = next; setProgress(next);
    // Serialize saves; a handled failure lets a later completion retry instead of blocking the queue.
    writes.current = writes.current.then(() => saveProgress(next)).then(() => setStorageError(false)).catch(() => setStorageError(true));
  }, []);
  return <GestureHandlerRootView style={styles.root}><SafeAreaProvider><SafeAreaView style={styles.root}>
    <StatusBar style="light" />
    {(!fonts && !fontError) || !ready ? <View style={styles.loading}><ActivityIndicator color={theme.paint} /><Text style={styles.message}>Finding your flow…</Text></View>
      : index === null ? <HomeScreen progress={progress} onPlay={setIndex} />
      : <GameScreen key={index} index={index} onHome={() => setIndex(null)} onComplete={onComplete}
        onNext={() => setIndex(index < levels.length - 1 ? index + 1 : null)} />}
    {storageError && <Text accessibilityRole="alert" style={styles.message}>Progress storage is unavailable. You can keep playing; finishing a level retries saving.</Text>}
  </SafeAreaView></SafeAreaProvider></GestureHandlerRootView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: theme.background }, loading: { flex: 1, gap: 16, alignItems: 'center', justifyContent: 'center' },
  message: { color: theme.accent, textAlign: 'center', padding: 12, fontSize: 13 } });

/** Application shell: fonts, safe areas, navigation, and independent progression/cosmetic preferences. */
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
import { BallId, ballAppearance } from './src/appearance';
import { BallSelectionScreen } from './src/screens/BallSelectionScreen';
import { loadBall, saveBall } from './src/storage/preferences';
import { LevelSelectionScreen } from './src/screens/LevelSelectionScreen';
import { canPlayLevel, completeLevel, mergeProgress, nextLevelIndex } from './src/game/progression';
/** Owns progression and navigation; each keyed GameScreen owns one fresh level run. */
export default function App() {
  const [fonts, fontError] = useFonts({ SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  const [ready, setReady] = useState(false);
  const [ballId, setBallId] = useState<BallId>('amethyst');
  const [screen, setScreen] = useState<'home' | 'balls' | 'levels'>('home');
  const [ballError, setBallError] = useState(false);
  const [savingBall, setSavingBall] = useState(false);
  const ballRequest = useRef(0);
  const appearance = ballAppearance(ballId);
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  // Completion callbacks need the latest unlocks even before React renders the next state.
  const progressRef = useRef(progress);
  const writes = useRef(Promise.resolve());
  const [storageError, setStorageError] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  // Show Play only after reading stored progress, avoiding a flash of default unlocks.
  useEffect(() => {
    // Load both keys before showing Home so a stored cosmetic never flashes back to the default.
    Promise.all([
      loadProgress(levels.length).then(value => { progressRef.current = value; setProgress(value); }).catch(() => setStorageError(true)),
      loadBall().then(setBallId).catch(() => setBallError(true)),
    ]).finally(() => setReady(true));
  }, []);
  /** Records final committed moves against the verified optimum; replay only improves achievements. */
  const onComplete = useCallback((completed: number, moves: number) => {
    // Screen indices are zero-based; persisted unlocked levels are one-based.
    const level = levels[completed];
    if (!level) return;
    const next = completeLevel(progressRef.current, completed, levels.length, { moves, optimalMoves: level.minimumMoves });
    progressRef.current = next; setProgress(next);
    // Serialize saves; a handled failure lets a later completion retry instead of blocking the queue.
    writes.current = writes.current.then(() => saveProgress(next, levels.length)).then(saved => {
      // A newer run may have completed while this save waited; keep both sets of achievements.
      progressRef.current = mergeProgress(progressRef.current, saved, levels.length);
      setProgress(progressRef.current); setStorageError(false);
    }).catch(() => setStorageError(true));
  }, []);
  /** Equip without resetting progression; ignore stale save results when choices change rapidly. */
  const equipBall = useCallback((id: BallId) => {
    setBallId(id); setSavingBall(true);
    const request = ++ballRequest.current;
    saveBall(id)
      .then(() => { if (request === ballRequest.current) setBallError(false); })
      .catch(() => { if (request === ballRequest.current) setBallError(true); })
      .finally(() => { if (request === ballRequest.current) setSavingBall(false); });
  }, []);
  /** Guard all entry points, including stale selector callbacks, against locked or missing levels. */
  const play = useCallback((selected: number) => {
    if (!canPlayLevel(progressRef.current, selected, levels.length)) return;
    setScreen('home'); setIndex(selected);
  }, []);
  return <GestureHandlerRootView style={styles.root}><SafeAreaProvider><SafeAreaView style={styles.root}>
    <StatusBar style="light" />
    {(!fonts && !fontError) || !ready ? <View style={styles.loading}><ActivityIndicator color={theme.paint} /><Text style={styles.message}>Finding your flow…</Text></View>
      : screen === 'balls' ? <BallSelectionScreen appearance={appearance} onSelect={equipBall} onBack={() => setScreen('home')} saving={savingBall} error={ballError} />
      : screen === 'levels' ? <LevelSelectionScreen progress={progress} onPlay={play} onBack={() => setScreen('home')} />
      : index === null ? <HomeScreen progress={progress} appearance={appearance} onLevels={() => setScreen('levels')} onCustomize={() => setScreen('balls')} onPlay={play} />
      : <GameScreen key={index} appearance={appearance} index={index} personalBest={progress.records[levels[index]!.id]?.bestMoves ?? null} onHome={() => setIndex(null)} onComplete={onComplete}
        onNext={() => setIndex(nextLevelIndex(progressRef.current, index, levels.length))} />}
    {ballError && screen !== 'balls' && <Text accessibilityRole="alert" style={styles.message}>Ball preference storage is unavailable. You can keep playing; open Choose ball to retry saving.</Text>}
    {storageError && <Text accessibilityRole="alert" style={styles.message}>Progress storage is unavailable. You can keep playing; finishing a level retries saving.</Text>}
  </SafeAreaView></SafeAreaProvider></GestureHandlerRootView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: theme.background }, loading: { flex: 1, gap: 16, alignItems: 'center', justifyContent: 'center' },
  message: { color: theme.accent, textAlign: 'center', padding: 12, fontSize: 13 } });

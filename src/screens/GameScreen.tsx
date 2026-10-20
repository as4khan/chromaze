import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Button } from '../components/Button';
import { ActiveSlide, MazeBoard } from '../components/MazeBoard';
import { commitSlide, complete, floorTiles, initialGame, slide, swipeDirection, undo } from '../game/engine';
import { levels } from '../game/levels';
import { theme } from '../theme';

function Completion({ moves, final, onNext, onUndo }: { moves: number; final: boolean; onNext: () => void; onUndo: () => void }) {
  const scale = useSharedValue(0.92);
  useEffect(() => { scale.value = withSpring(1, { damping: 14 }); }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View accessibilityViewIsModal style={[styles.completion, style]}>
    <Text style={styles.completeMark}>100%</Text>
    <Text accessibilityRole="header" style={styles.completeTitle}>{final ? 'A beautiful finish.' : 'Maze complete.'}</Text>
    <Text style={styles.hint}>{final ? 'Every maze, a little more color.' : 'Every path has your signature.'}{'\n'}{moves} moves. All yours.</Text>
    <Button label={final ? 'Back to home' : 'Next Level'} onPress={onNext} />
    <Button label="Undo last slide" secondary onPress={onUndo} />
  </Animated.View>;
}

export function GameScreen({ index, onHome, onComplete, onNext }: {
  index: number; onHome: () => void; onComplete: (index: number) => void; onNext: () => void;
}) {
  const level = levels[index]!;
  const [game, setGame] = useState(() => initialGame(level));
  const state = useRef(game);
  const busy = useRef(false);
  const accepted = useRef(false);
  const serial = useRef(0);
  const activeRef = useRef<ActiveSlide | null>(null);
  const [active, setActive] = useState<ActiveSlide | null>(null);
  const animationProgress = useSharedValue(0);
  const [reached, setReached] = useState(0);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const done = complete(level, game);
  const total = floorTiles(level).length;
  const count = new Set([...game.painted, ...(active?.path.slice(0, reached).map(p => `${p.row},${p.col}`) ?? [])]).size;
  const update = (next: typeof game) => { state.current = next; setGame(next); };
  const finish = useCallback(() => {
    const current = activeRef.current;
    if (!current) return;
    const next = commitSlide(state.current, current.path);
    state.current = next;
    activeRef.current = null;
    setGame(next); setActive(null); setReached(0); busy.current = false;
    if (complete(level, next)) onComplete(index);
  }, [index, level, onComplete]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busy.current) onHome();
      return true;
    });
    return () => subscription.remove();
  }, [onHome]);
  const gesture = Gesture.Pan().minDistance(0).runOnJS(true)
    .onBegin(() => { accepted.current = busy.current || complete(level, state.current); })
    .onUpdate(event => {
      if (accepted.current) return;
      const direction = swipeDirection(event.translationX, event.translationY);
      if (!direction) return;
      accepted.current = true;
      if (busy.current) return;
      const path = slide(level, state.current.position, direction);
      if (!path.length) return;
      busy.current = true;
      // Reset before changing the path, so a new slide never renders at the old progress.
      animationProgress.value = 0;
      const next = { origin: state.current.position, path, id: ++serial.current };
      activeRef.current = next; setReached(0); setActive(next);
    });
  const size = Math.max(0, Math.min(area.width - 24, area.height - 24, 480));
  return <View style={styles.root}>
    <View style={styles.top}><Button label="Home" secondary disabled={!!active} onPress={onHome} />
      <Text style={styles.brand}>chromaze<Text style={{ color: theme.paint }}>.</Text></Text></View>
    <View style={styles.heading}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.title}>Level {level.id}</Text>
      <Text style={styles.levelName}>{level.name}</Text></View>
      <View style={styles.moveCount}><Text style={styles.moveValue}>{game.moves + (active ? 1 : 0)}</Text><Text style={styles.small}>moves</Text></View></View>
    <View style={styles.progressLabels}><Text style={styles.small}>Painted</Text>
      <Text accessibilityLiveRegion="polite" style={styles.progressText}>{count} / {total}</Text></View>
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: count }} accessibilityLabel="Painted tiles" style={styles.track}>
      <View style={[styles.fill, { width: `${count / total * 100}%` }]} /></View>
    <GestureDetector gesture={gesture}><View collapsable={false} style={styles.playArea}
      onLayout={event => setArea(event.nativeEvent.layout)}>
      {size > 0 && <View style={styles.board}><MazeBoard level={level} game={game} size={size}
        active={active} progress={animationProgress} onReached={setReached} onFinish={finish} /></View>}
      {done && <Completion moves={game.moves} final={index === levels.length - 1} onNext={onNext} onUndo={() => update(undo(state.current))} />}
    </View></GestureDetector>
    <Text style={styles.hint}>{active ? 'Let it roll.' : 'Swipe a direction. Roll until the wall.'}</Text>
    <View style={styles.actions}><View style={{ flex: 1 }}><Button label="Undo" secondary disabled={!!active || !game.history.length} onPress={() => update(undo(state.current))} /></View>
      <View style={{ flex: 1 }}><Button label="Restart" secondary disabled={!!active} onPress={() => update(initialGame(level))} /></View></View>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 14, width: '100%', maxWidth: 620, alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  brand: { fontFamily: 'SpaceGrotesk_700Bold', color: theme.text, fontSize: 22, letterSpacing: -0.6 },
  heading: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 12 },
  title: { fontFamily: 'SpaceGrotesk_600SemiBold', color: theme.text, fontSize: 32, letterSpacing: -1 },
  levelName: { fontFamily: 'SpaceGrotesk_400Regular', color: theme.muted, fontSize: 14, marginTop: 4 },
  moveCount: { alignItems: 'flex-end' }, moveValue: { fontFamily: 'SpaceGrotesk_500Medium', color: theme.accent, fontSize: 30, fontVariant: ['tabular-nums'] },
  small: { fontFamily: 'SpaceGrotesk_400Regular', color: theme.muted, fontSize: 13 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressText: { fontFamily: 'SpaceGrotesk_500Medium', color: theme.paint, fontSize: 13, fontVariant: ['tabular-nums'] },
  track: { height: 4, backgroundColor: theme.wall, borderRadius: 2, overflow: 'hidden' }, fill: { height: 4, backgroundColor: theme.paint },
  playArea: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 130 },
  board: { padding: 10, backgroundColor: theme.recess, borderRadius: 22 },
  hint: { fontFamily: 'SpaceGrotesk_400Regular', color: theme.muted, textAlign: 'center', fontSize: 13, lineHeight: 22, marginBottom: 18 },
  actions: { flexDirection: 'row', gap: 12 },
  completion: { position: 'absolute', backgroundColor: theme.background, borderRadius: 20, padding: 24,
    left: 0, right: 0, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 18, elevation: 8 },
  completeMark: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 52, color: theme.paint, textAlign: 'center' },
  completeTitle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 27, color: theme.text, textAlign: 'center' },
});

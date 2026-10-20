/** Gameplay coordinator connecting touch commands, committed movement state, rendering, and level actions. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Button } from '../components/Button';
import { MazeBoard } from '../components/MazeBoard';
import { Direction, floorTiles, undo } from '../game/engine';
import { createMovement, finishMovement, initialTouch, Movement, recognizeDirection, requestMovement, resetMovement } from '../game/controls';
import { levels } from '../game/levels';
import { theme } from '../theme';

/** Appears after the final slide commits; final selects the home action instead of another level. */
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

/** Plays the zero-based level index and reports that same index once its final slide has committed. */
export function GameScreen({ index, onHome, onComplete, onNext }: {
  index: number; onHome: () => void; onComplete: (index: number) => void; onNext: () => void;
}) {
  const level = levels[index]!;
  const [movement, setMovement] = useState(() => createMovement(level));
  // Refs let queued animation/input callbacks see the newest state before the next React render.
  const state = useRef(movement);
  const touch = useSharedValue(initialTouch());
  const touching = useSharedValue(false);
  const [reached, setReached] = useState(0);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const { game, active } = movement;
  const done = movement.phase === 'completing';
  const total = floorTiles(level).length;
  // Display committed paint plus reached centers only, never the entire planned path ahead of the ball.
  const count = new Set([...game.painted, ...(active?.path.slice(0, reached).map(p => `${p.row},${p.col}`) ?? [])]).size;
  const update = useCallback((next: Movement) => {
    if (next === state.current) return;
    if (next.active?.id !== state.current.active?.id) setReached(0);
    state.current = next;
    setMovement(next);
  }, []);
  const request = useCallback((direction: Direction) => {
    update(requestMovement(level, state.current, direction));
  }, [level, update]);
  /** UI-thread completion bridge: commit one slide and immediately select any buffered successor. */
  const finish = useCallback((id: number) => {
    const previous = state.current;
    const next = finishMovement(level, previous, id);
    update(next);
    if (next !== previous && next.phase === 'completing') {
      touching.value = false;
      onComplete(index);
    }
  }, [index, level, onComplete, touching, update]);
  // A tile-crossing message from the preceding slide can arrive after a buffered turn begins.
  const onReached = useCallback((id: number, count: number) => {
    if (state.current.active?.id === id) setReached(count);
  }, []);
  /** Restart or undo a completed slide, clearing held-touch recognition and the directional buffer. */
  const reset = (undoLast = false) => {
    touching.value = false;
    touch.value = initialTouch();
    update(undoLast ? resetMovement(level, state.current, undo(state.current.game)) : resetMovement(level, state.current));
  };
  // Clear active/pending state before unmounting so late callbacks cannot complete the old run.
  const leave = useCallback(() => {
    touching.value = false;
    update(resetMovement(level, state.current));
    onHome();
  }, [level, onHome, touching, update]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      leave();
      return true;
    });
    return () => subscription.remove();
  }, [leave]);
  // Stable native handler identity avoids interrupting a held touch when progress labels rerender.
  const gesture = useMemo(() => Gesture.Pan().minDistance(0).maxPointers(1).enabled(!done)
    .onBegin(() => { touch.value = initialTouch(); touching.value = true; })
    .onUpdate(event => {
      if (!touching.value) return;
      // Recognize on the UI thread; only deliberate commands cross to the JS movement state machine.
      const input = recognizeDirection(touch.value, event.translationX, event.translationY);
      touch.value = input.touch;
      if (input.direction) runOnJS(request)(input.direction);
    })
    // Check the final displacement too: a quick flick can end before another update event arrives.
    .onEnd(event => {
      if (!touching.value) return;
      const input = recognizeDirection(touch.value, event.translationX, event.translationY);
      if (input.direction) runOnJS(request)(input.direction);
    })
    // Releasing/cancelling resets touch recognition, while accepted motion and buffered input survive.
    .onFinalize(() => { touching.value = false; touch.value = initialTouch(); }), [done, request, touch, touching]);
  const size = Math.max(0, Math.min(area.width - 24, area.height - 24, 480));
  return <View style={styles.root}>
    <View style={styles.top}><View style={styles.homeControl}><Button label="Home" secondary onPress={leave} /></View>
      <Text style={styles.brand} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>chromaze<Text style={{ color: theme.paint }}>.</Text></Text></View>
    <View style={styles.heading}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.title}>Level {level.id}</Text>
      <Text style={styles.levelName}>{level.name}</Text></View>
      <View style={styles.moveCount}><Text style={styles.moveValue}>{game.moves + (active ? 1 : 0)}</Text><Text style={styles.small}>moves</Text></View></View>
    <View style={styles.progressLabels}><Text style={styles.small}>Painted</Text>
      <Text accessibilityLiveRegion="polite" style={styles.progressText}>{count} / {total}</Text></View>
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: count }} accessibilityLabel="Painted tiles" style={styles.track}>
      <View style={[styles.fill, { width: `${count / total * 100}%` }]} /></View>
    <View style={styles.playArea}
      onLayout={event => setArea(event.nativeEvent.layout)}>
      <GestureDetector gesture={gesture}><View collapsable={false} style={styles.gestureArea}>
        {size > 0 && <View style={styles.board}><MazeBoard level={level} game={game} size={size}
          active={active} onReached={onReached} onFinish={finish} /></View>}
      </View></GestureDetector>
      {done && <Completion moves={game.moves} final={index === levels.length - 1} onNext={onNext} onUndo={() => reset(true)} />}
    </View>
    <Text style={styles.hint}>Flick to roll. Keep dragging to steer.</Text>
    <View style={styles.actions}><View style={{ flex: 1 }}><Button label="Undo" secondary disabled={!!active || !game.history.length} onPress={() => reset(true)} /></View>
      <View style={{ flex: 1 }}><Button label="Restart" secondary disabled={!!active} onPress={() => reset()} /></View></View>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 14, width: '100%', maxWidth: 620, alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  homeControl: { flexShrink: 0 },
  brand: { flex: 1, minWidth: 0, textAlign: 'right', fontFamily: 'SpaceGrotesk_700Bold', color: theme.text, fontSize: 22, letterSpacing: -0.6 },
  heading: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 12 },
  title: { fontFamily: 'SpaceGrotesk_600SemiBold', color: theme.text, fontSize: 32, letterSpacing: -1 },
  levelName: { fontFamily: 'SpaceGrotesk_400Regular', color: theme.muted, fontSize: 14, marginTop: 4 },
  moveCount: { alignItems: 'flex-end' }, moveValue: { fontFamily: 'SpaceGrotesk_500Medium', color: theme.accent, fontSize: 30, fontVariant: ['tabular-nums'] },
  small: { fontFamily: 'SpaceGrotesk_400Regular', color: theme.muted, fontSize: 13 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressText: { fontFamily: 'SpaceGrotesk_500Medium', color: theme.paint, fontSize: 13, fontVariant: ['tabular-nums'] },
  track: { height: 4, backgroundColor: theme.wall, borderRadius: 2, overflow: 'hidden' }, fill: { height: 4, backgroundColor: theme.paint },
  playArea: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 130 },
  gestureArea: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  board: { padding: 10, backgroundColor: theme.recess, borderRadius: 22 },
  hint: { fontFamily: 'SpaceGrotesk_400Regular', color: theme.muted, textAlign: 'center', fontSize: 13, lineHeight: 22, marginBottom: 18 },
  actions: { flexDirection: 'row', gap: 12 },
  completion: { position: 'absolute', backgroundColor: theme.background, borderRadius: 20, padding: 24,
    left: 0, right: 0, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 18, elevation: 8 },
  completeMark: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 52, color: theme.paint, textAlign: 'center' },
  completeTitle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 27, color: theme.text, textAlign: 'center' },
});

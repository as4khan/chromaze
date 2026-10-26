/** Gameplay coordinator connecting touch commands, committed movement state, rendering, and level actions. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming, ReduceMotion } from 'react-native-reanimated';
import { Button } from '../components/Button';
import { MazeBoard } from '../components/MazeBoard';
import { Direction, floorTiles, undo } from '../game/engine';
import { createMovement, finishMovement, initialTouch, Movement, recognizeDirection, requestMovement, resetMovement } from '../game/controls';
import { levels, stageForLevel } from '../game/levels';
import { fitBoardWidth } from '../components/paintGeometry';
import { theme } from '../theme';
import { icons } from '../assets';
import { slideFeedback } from '../feedback';
import { BallAppearance } from '../appearance';
import { ratingThresholds, starsForMoves } from '../game/ratings';
import { RatingStars } from '../components/RatingStars';

/** Show run stars and retained best after commit, reusing the reduced-motion-aware panel reveal. */
function Completion({ moves, optimalMoves, personalBest, previousBest, final, onNext, onUndo, availableHeight, appearance }: {
  appearance: BallAppearance; moves: number; optimalMoves: number; personalBest: number | null; previousBest: number | null;
  final: boolean; onNext: () => void; onUndo: () => void; availableHeight: number;
}) {
  const stars = starsForMoves(moves, optimalMoves), thresholds = ratingThresholds(optimalMoves);
  const newBest = previousBest === null || moves < previousBest;
  const best = Math.min(moves, personalBest ?? moves);
  const reveal = useSharedValue(0);
  useEffect(() => { reveal.value = withTiming(1, { duration: 280, reduceMotion: ReduceMotion.System }); }, [reveal]);
  const style = useAnimatedStyle(() => ({ opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 12 }, { scale: 0.97 + reveal.value * 0.03 }] }));
  return <Animated.View accessibilityViewIsModal style={[styles.completion, { maxHeight: availableHeight }, style]}>
    {/* Scroll on short screens or large text without shrinking the completion actions. */}
    <ScrollView contentContainerStyle={styles.completionContent}>
    <Image source={icons.sparkle} accessible={false} style={[styles.completeIcon, { tintColor: appearance.paint[0] }]} />
    <Text style={[styles.completeMark, { color: appearance.paint[0] }]}>100%</Text>
    <Text accessibilityRole="header" style={styles.completeTitle}>{final ? 'A beautiful finish.' : 'Maze complete.'}</Text>
    <View style={styles.rating}><RatingStars value={stars} size={36} />
      <Text style={styles.reward}>{newBest ? 'New personal best' : stars === 3 ? 'Three stars. Beautifully done.' : 'Every path has your signature.'}</Text></View>
    <View style={styles.resultNumbers}>{[['Your moves', moves], ['Optimal', optimalMoves], ['Personal best', best]].map(([label, value]) =>
      <View key={label} style={styles.resultNumber}><Text style={styles.small}>{label}</Text><Text style={styles.resultValue}>{value}</Text></View>)}</View>
    <Text style={styles.hint}>{stars < 3 ? 'Three stars in ' + thresholds.three + ' moves or fewer.' : 'Your color. Your best flow.'}{'\n'}3 stars: ≤ {thresholds.three} · 2 stars: ≤ {thresholds.two}{'\n'}1 star for every finish</Text>
    <Button icon={final ? icons.home : icons.next} label={final ? 'Back to home' : 'Next Level'} onPress={onNext} />
    <Button icon={icons.undo} label="Undo last slide" secondary onPress={onUndo} />
    </ScrollView>
  </Animated.View>;
}

/** Plays the zero-based level index and reports that same index once its final slide has committed. */
export function GameScreen({ index, onHome, onComplete, onNext, appearance, personalBest }: {
  appearance: BallAppearance;
  index: number; personalBest: number | null; onHome: () => void; onComplete: (index: number, moves: number) => void; onNext: () => void;
}) {
  const level = levels[index]!;
  const compact = useWindowDimensions().height < 740;
  const [movement, setMovement] = useState(() => createMovement(level));
  // Refs let queued animation/input callbacks see the newest state before the next React render.
  const state = useRef(movement);
  // Keep the finish callback stable: recovered saves must not restart an in-flight Skia animation.
  const personalBestRef = useRef(personalBest);
  personalBestRef.current = personalBest;
  const touch = useSharedValue(initialTouch());
  const touching = useSharedValue(false);
  const [reached, setReached] = useState(0);
  // Capture the pre-finish record before App publishes the improved best, including after Undo/re-finish.
  const [previousBest, setPreviousBest] = useState<number | null>(null);
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
    // State commits and buffered turns happen first; optional hardware feedback never blocks them.
    if (next !== previous) void slideFeedback(next.phase === 'completing');
    if (next !== previous && next.phase === 'completing') {
      touching.value = false;
      setPreviousBest(personalBestRef.current);
      onComplete(index, next.game.moves);
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
  const size = fitBoardWidth(level.grid[0]!.length, level.grid.length, area.width, area.height);
  return <View style={[styles.root, compact && styles.compact]}>
    <View style={styles.top}><View style={styles.homeControl}><Button icon={icons.home} label="Home" secondary onPress={leave} /></View>
      <Text style={styles.brand} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>chromaze<Text style={{ color: theme.paint }}>.</Text></Text></View>
    <View style={[styles.heading, compact && { marginBottom: 12 }]}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.title}>Level {level.id}</Text>
      <Text style={styles.levelName}>{stageForLevel(level.id)?.name} · {level.name}</Text></View>
      <View style={styles.moveCount}><Image source={icons.moves} accessible={false} style={styles.hudIcon} /><Text style={styles.moveValue}>{game.moves + (active ? 1 : 0)}</Text><Text style={styles.small}>moves</Text></View></View>
    <View style={styles.progressLabels}><View style={styles.paintLabel}><Image source={icons.paint} accessible={false} style={styles.hudIcon} /><Text style={styles.small}>Painted</Text></View>
      <Text accessibilityLiveRegion="polite" style={[styles.progressText, { color: appearance.paint[0] }]}>{count} / {total}</Text></View>
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: count }} accessibilityLabel="Painted tiles" style={styles.track}>
      <View style={[styles.fill, { width: `${count / total * 100}%`, flexDirection: 'row' }]}>{appearance.paint.map(color => <View key={color} style={{ flex: 1, backgroundColor: color }} />)}</View></View>
    <View style={styles.playArea}
      onLayout={event => setArea(event.nativeEvent.layout)}>
      <GestureDetector gesture={gesture}><View collapsable={false} style={styles.gestureArea}>
        {size > 0 && <View style={styles.board}><MazeBoard appearance={appearance} level={level} game={game} size={size}
          active={active} onReached={onReached} onFinish={finish} /></View>}
      </View></GestureDetector>
      {done && <Completion appearance={appearance} availableHeight={area.height} moves={game.moves} optimalMoves={level.minimumMoves} personalBest={personalBest} previousBest={previousBest} final={index === levels.length - 1} onNext={onNext} onUndo={() => reset(true)} />}
    </View>
    <Text style={styles.hint}>Flick to roll. Keep dragging to steer.</Text>
    <View style={styles.actions}><View style={{ flex: 1 }}><Button icon={icons.undo} label="Undo" secondary disabled={!!active || !game.history.length} onPress={() => reset(true)} /></View>
      <View style={{ flex: 1 }}><Button icon={icons.restart} label="Restart" secondary disabled={!!active} onPress={() => reset()} /></View></View>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 14, width: '100%', maxWidth: 620, alignSelf: 'center' },
  compact: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8 },
  hudIcon: { width: 18, height: 18 },
  paintLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  homeControl: { flexShrink: 0 },
  brand: { flex: 1, minWidth: 0, textAlign: 'right', fontFamily: 'SpaceGrotesk_700Bold', color: theme.text, fontSize: 22, letterSpacing: -0.6 },
  heading: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 12 },
  title: { fontFamily: 'SpaceGrotesk_600SemiBold', color: theme.text, fontSize: 32, letterSpacing: -1 },
  levelName: { fontFamily: 'SpaceGrotesk_400Regular', color: theme.muted, fontSize: 14, marginTop: 4 },
  moveCount: { flexDirection: 'row', flexWrap: 'wrap', maxWidth: 100, alignItems: 'center', justifyContent: 'flex-end', columnGap: 6 }, moveValue: { fontFamily: 'SpaceGrotesk_500Medium', color: theme.accent, fontSize: 30, fontVariant: ['tabular-nums'] },
  small: { fontFamily: 'SpaceGrotesk_400Regular', color: theme.muted, fontSize: 13 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressText: { fontFamily: 'SpaceGrotesk_500Medium', color: theme.paint, fontSize: 13, fontVariant: ['tabular-nums'] },
  track: { height: 6, backgroundColor: theme.wall, borderRadius: 2, overflow: 'hidden' }, fill: { height: 6, backgroundColor: theme.paint },
  playArea: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 130 },
  gestureArea: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  board: { padding: 10, backgroundColor: theme.recess, borderRadius: 22 },
  hint: { fontFamily: 'SpaceGrotesk_400Regular', color: theme.muted, textAlign: 'center', fontSize: 13, lineHeight: 22, marginBottom: 18 },
  actions: { flexDirection: 'row', gap: 12 },
  completion: { position: 'absolute', backgroundColor: theme.background, borderRadius: 20,
    left: 0, right: 0, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 18, elevation: 8 },
  completionContent: { padding: 24, gap: 12 },
  rating: { alignItems: 'center', gap: 8 }, reward: { fontFamily: 'SpaceGrotesk_600SemiBold', color: theme.accent, fontSize: 16, textAlign: 'center' },
  resultNumbers: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 16, marginVertical: 8 },
  resultNumber: { alignItems: 'center', gap: 4 }, resultValue: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 25, color: theme.text, fontVariant: ['tabular-nums'] },
  completeIcon: { width: 32, height: 32, alignSelf: 'center' },
  completeMark: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 52, color: theme.paint, textAlign: 'center' },
  completeTitle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 27, color: theme.text, textAlign: 'center' },
});

/** Skia rendering of connected floor paint and a ball driven by Reanimated UI-thread motion. */
import { memo, useEffect, useLayoutEffect, useMemo } from 'react';
import { Canvas, Circle, Group, Image, Line, LinearGradient, Path, RadialGradient, RoundedRect, Skia, SkPath, useImage, vec } from '@shopify/react-native-skia';
import { cancelAnimation, Easing, runOnJS, runOnUI, SharedValue, useAnimatedReaction, useDerivedValue, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Game, Level, animationPlan, reachedTiles } from '../game/engine';
import { theme } from '../theme';

import { ActiveSlide } from '../game/controls';
import { committedPaint, floorOutline, movingWake, paintRibbon } from './paintGeometry';
import { BALL_ART, BallAppearance } from '../appearance';
import { ballImages } from '../assets';
import { Splatter } from './Splatter';
type Props = { appearance: BallAppearance; effects?: boolean; level: Level; game: Game; size: number; active: ActiveSlide | null;
  onReached: (id: number, count: number) => void; onFinish: (id: number) => void };
/** Geometry uses grid coordinates; id 0 is idle and offset preserves the rolling highlight phase. */
export type Motion = { fromRow: number; fromCol: number; toRow: number; toCol: number; distance: number; id: number; offset: number };

/** A same-hue wet streak makes travel visible even when revisiting an already-painted corridor. */
function WetTrail({ motion, progress, appearance }: { motion: SharedValue<Motion>; progress: SharedValue<number>; appearance: BallAppearance }) {
  const reducedMotion = useReducedMotion();
  const wake = useDerivedValue(() => {
    const m = motion.value;
    return movingWake(m.fromRow, m.fromCol, m.toRow, m.toCol, progress.value);
  });
  const from = useDerivedValue(() => wake.value.from), to = useDerivedValue(() => wake.value.to);
  const opacity = useDerivedValue(() => reducedMotion || !motion.value.id ? 0 : wake.value.opacity);
  return <Group opacity={opacity}>
    <Line p1={from} p2={to} color={appearance.shading[1]} strokeWidth={0.2} strokeCap="round" />
    <Line p1={from} p2={to} color={appearance.shading[0]} strokeWidth={0.055} strokeCap="round" opacity={0.65} />
  </Group>;
}

/** Memoization keeps progress-label renders out of Skia; frame-by-frame work uses shared values. */
export const MazeBoard = memo(function MazeBoard({ level, game, size, active, onReached, onFinish, appearance, effects = true }: Props) {
  const progress = useSharedValue(0);
  const image = useImage(ballImages[appearance.id]);
  const motion = useSharedValue<Motion>({ fromRow: game.position.row, fromCol: game.position.col,
    toRow: game.position.row, toCol: game.position.col, distance: 0, id: 0, offset: 0 });
  const columns = level.grid[0]!.length, rows = level.grid.length;
  const cell = size / columns;
  // Static paths rebuild only for layout/paint snapshots, never for progress-label updates.
  const floor = useMemo(() => Skia.Path.MakeFromSVGString(floorOutline(level, cell))!, [level, cell]);
  // Grid-space snapshots can be published with motion atomically without restarting on a resize.
  const permanent = useMemo(() => Skia.Path.MakeFromSVGString(committedPaint(level, game.painted, 1))!, [level, game.painted]);
  const paintSnapshot = useSharedValue<SkPath>(permanent);
  const activeId = active?.id ?? 0;
  // One opaque fill avoids alpha accumulation and differences between temporary and committed paint.
  const paint = useDerivedValue(() => {
    const m = motion.value;
    if (!m.id) return paintSnapshot.value;
    return Skia.PathBuilder.Make().addPath(paintSnapshot.value)
      .addRect(paintRibbon(m.fromRow, m.fromCol, m.toRow, m.toCol, progress.value, 1)).detach();
  });
  const origin = active?.origin ?? game.position;
  const plan = animationPlan(origin, active?.path ?? []);
  // Scaling grid coordinates here lets a layout change resize the board without restarting travel.
  const x = useDerivedValue(() => (motion.value.fromCol + 0.5 + (motion.value.toCol - motion.value.fromCol) * progress.value) * cell);
  const y = useDerivedValue(() => (motion.value.fromRow + 0.5 + (motion.value.toRow - motion.value.fromRow) * progress.value) * cell);
  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }]);
  const glintX = useDerivedValue(() => -cell * 0.09 + Math.sin((motion.value.offset + progress.value * motion.value.distance) * 2) * cell * 0.05);
  // Send only tile-center crossings to JS; positions, the ribbon front, and highlights stay on the UI thread.
  useAnimatedReaction(() => ({ id: motion.value.id, count: reachedTiles(motion.value.distance, progress.value) }), (next, previous) => {
    if (next.id && next.count > 0 && (next.id !== previous?.id || next.count !== previous.count)) {
      runOnJS(onReached)(next.id, next.count);
    }
  }, [onReached]);
  useLayoutEffect(() => {
    // Change the geometry and clock together, without resetting the old path first.
    runOnUI((next: Motion, duration: number, snapshot: SkPath) => {
      cancelAnimation(progress);
      // Carry distance into the next slide instead of resetting the surface highlight on each turn.
      const offset = motion.value.offset + progress.value * motion.value.distance;
      // No frame can combine the next committed paint with the preceding slide geometry.
      paintSnapshot.value = snapshot;
      motion.value = { ...next, offset };
      progress.value = 0;
      // One linear animation covers the whole corridor, with no per-tile easing or pauses.
      if (next.id) progress.value = withTiming(1, { duration, easing: Easing.linear }, finished => {
        if (finished) runOnJS(onFinish)(next.id);
      });
    })({ fromRow: origin.row, fromCol: origin.col, toRow: plan.destination.row, toCol: plan.destination.col,
      distance: plan.distance, id: active?.id ?? 0, offset: 0 }, plan.duration, permanent);
  }, [active?.id, game.position.row, game.position.col, onFinish, permanent]);
  // An interrupted animation reports finished=false and must not commit a partially travelled slide.
  useEffect(() => () => cancelAnimation(progress), [progress]);
  return <Canvas style={{ width: size, height: rows * cell }}>
    <RoundedRect x={0} y={3} width={size} height={rows * cell - 3} r={16} color={theme.recess} />
    <RoundedRect x={0} y={0} width={size} height={rows * cell - 3} r={16} color={theme.wall} />
    <Path path={floor} color={theme.floor} />
    {/* The same silhouette clips live and permanent paint; neither can cover a wall or round past an endpoint. */}
    <Group clip={floor}>
      <Group transform={[{ scale: cell }]}><Path path={paint} color={appearance.paint[0]}>
        {/* Board-anchored color coordinates are identical before and after every commit or repaint. */}
        {appearance.paint.length > 1 && <LinearGradient start={vec(0, 0)} end={vec(columns, rows)} colors={appearance.paint} />}
      </Path>
        {/* Cosmetic wake shares the movement clock and floor clip; it never changes painted coverage. */}
        {effects && <WetTrail motion={motion} progress={progress} appearance={appearance} />}
      </Group>
      {effects && <Splatter motion={motion} progress={progress} activeId={activeId} historyLength={game.history.length}
        cell={cell} appearance={appearance} width={size} height={rows * cell} />}
    </Group>
    <Group transform={transform}>
      {/* Decode the supplied padded PNG once, then move it with the same UI-thread transform as the ball. */}
      {image ? <Image image={image} fit="fill" x={-BALL_ART.centerX / BALL_ART.radius * cell * 0.32}
        y={-BALL_ART.centerY / BALL_ART.radius * cell * 0.32}
        width={BALL_ART.size / BALL_ART.radius * cell * 0.32} height={BALL_ART.size / BALL_ART.radius * cell * 0.32} /> : <>
      <Circle cx={0} cy={cell * 0.075} r={cell * 0.33} color="#10182788" />
      <Circle cx={0} cy={0} r={cell * 0.32}>
        <RadialGradient c={vec(-cell * 0.1, -cell * 0.13)} r={cell * 0.57}
          colors={appearance.shading} positions={[0, 0.26, 0.55, 1]} />
      </Circle>
      {/* Decode fallback retains the same visible radius, live center, and rolling highlight. */}
      <Circle cx={0} cy={0} r={cell * 0.31} style="stroke" strokeWidth={cell * 0.009} color="#FFFFFF29" />
      <Circle cx={-cell * 0.105} cy={-cell * 0.15} r={cell * 0.105} color="#FFFFFF20" />
      <Circle cx={glintX} cy={-cell * 0.13} r={cell * 0.065} color="#FFFFFFA0" />
      </>}
    </Group>
  </Canvas>;
});

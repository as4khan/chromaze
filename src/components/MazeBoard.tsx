/** Skia rendering of connected floor paint and a ball driven by Reanimated UI-thread motion. */
import { memo, useEffect, useLayoutEffect } from 'react';
import { Canvas, Circle, Group, Line, RadialGradient, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import { cancelAnimation, Easing, runOnJS, runOnUI, SharedValue, useAnimatedReaction, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { Game, Level, Point, animationPlan, floorTiles, isFloor, key, reachedTiles } from '../game/engine';
import { theme } from '../theme';

import { ActiveSlide } from '../game/controls';
type Props = { level: Level; game: Game; size: number; active: ActiveSlide | null;
  onReached: (id: number, count: number) => void; onFinish: (id: number) => void };
/** Geometry uses grid coordinates; id 0 is idle and offset preserves the rolling highlight phase. */
type Motion = { fromRow: number; fromCol: number; toRow: number; toCol: number; distance: number; id: number; offset: number };

/** Renders one connected floor/paint shape; index -1 means it is outside the active slide path. */
function Tile({ point, level, cell, painted, index, progress, motion, activeId }: {
  point: Point; level: Level; cell: number; painted: boolean; index: number;
  progress: SharedValue<number>; motion: SharedValue<Motion>; activeId: number;
}) {
  // Match slide IDs before revealing new paint; the previous animation may still read progress 1.
  const opacity = useDerivedValue(() => painted ? 1 : index < 0 || motion.value.id !== activeId ? 0 :
    Math.max(0, Math.min(1, (progress.value * motion.value.distance - index - 0.85) / 0.15)));
  const x = point.col * cell, y = point.row * cell;
  // Bridges only shared floor edges, keeping rounded corridors connected without painting walls.
  function shape(color: string) {
    return <>
      <RoundedRect x={x} y={y} width={cell} height={cell} r={cell * 0.15} color={color} />
      {isFloor(level, { row: point.row, col: point.col + 1 }) &&
        <Rect x={x + cell / 2} y={y} width={cell / 2 + 0.5} height={cell} color={color} />}
      {isFloor(level, { row: point.row + 1, col: point.col }) &&
        <Rect x={x} y={y + cell / 2} width={cell} height={cell / 2 + 0.5} color={color} />}
      {isFloor(level, { row: point.row, col: point.col - 1 }) &&
        <Rect x={x - 0.5} y={y} width={cell / 2 + 0.5} height={cell} color={color} />}
      {isFloor(level, { row: point.row - 1, col: point.col }) &&
        <Rect x={x} y={y - 0.5} width={cell} height={cell / 2 + 0.5} color={color} />}
    </>;
  }
  return <><Group>{shape(theme.floor)}</Group><Group opacity={opacity}>{shape(theme.paint)}</Group></>;
}

/** Memoization keeps progress-label renders out of Skia; frame-by-frame work uses shared values. */
export const MazeBoard = memo(function MazeBoard({ level, game, size, active, onReached, onFinish }: Props) {
  const progress = useSharedValue(0);
  const motion = useSharedValue<Motion>({ fromRow: game.position.row, fromCol: game.position.col,
    toRow: game.position.row, toCol: game.position.col, distance: 0, id: 0, offset: 0 });
  const columns = level.grid[0]!.length, rows = level.grid.length;
  const cell = size / columns;
  const origin = active?.origin ?? game.position;
  const plan = animationPlan(origin, active?.path ?? []);
  // Scaling grid coordinates here lets a layout change resize the board without restarting travel.
  const x = useDerivedValue(() => (motion.value.fromCol + 0.5 + (motion.value.toCol - motion.value.fromCol) * progress.value) * cell);
  const y = useDerivedValue(() => (motion.value.fromRow + 0.5 + (motion.value.toRow - motion.value.fromRow) * progress.value) * cell);
  const trailStart = useDerivedValue(() => vec((motion.value.fromCol + 0.5) * cell, (motion.value.fromRow + 0.5) * cell));
  const center = useDerivedValue(() => vec(x.value, y.value));
  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }]);
  const glintX = useDerivedValue(() => -cell * 0.09 + Math.sin((motion.value.offset + progress.value * motion.value.distance) * 2) * cell * 0.05);
  // Send only tile-center crossings to JS; positions, paint fades, and highlights stay on the UI thread.
  useAnimatedReaction(() => ({ id: motion.value.id, count: reachedTiles(motion.value.distance, progress.value) }), (next, previous) => {
    if (next.id && next.count > 0 && (next.id !== previous?.id || next.count !== previous.count)) {
      runOnJS(onReached)(next.id, next.count);
    }
  }, [onReached]);
  useLayoutEffect(() => {
    // Change the geometry and clock together, without resetting the old path first.
    runOnUI((next: Motion, duration: number) => {
      cancelAnimation(progress);
      // Carry distance into the next slide instead of resetting the surface highlight on each turn.
      const offset = motion.value.offset + progress.value * motion.value.distance;
      motion.value = { ...next, offset };
      progress.value = 0;
      // One linear animation covers the whole corridor, with no per-tile easing or pauses.
      if (next.id) progress.value = withTiming(1, { duration, easing: Easing.linear }, finished => {
        if (finished) runOnJS(onFinish)(next.id);
      });
    })({ fromRow: origin.row, fromCol: origin.col, toRow: plan.destination.row, toCol: plan.destination.col,
      distance: plan.distance, id: active?.id ?? 0, offset: 0 }, plan.duration);
  }, [active?.id, game.position.row, game.position.col, onFinish]);
  // An interrupted animation reports finished=false and must not commit a partially travelled slide.
  useEffect(() => () => cancelAnimation(progress), [progress]);
  return <Canvas style={{ width: size, height: rows * cell }}>
    <RoundedRect x={0} y={3} width={size} height={rows * cell - 3} r={16} color={theme.recess} />
    <RoundedRect x={0} y={0} width={size} height={rows * cell - 3} r={16} color={theme.wall} />
    {floorTiles(level).map(point => <Tile key={key(point)} point={point} level={level} cell={cell}
      painted={game.painted.includes(key(point))} index={active?.path.findIndex(p => key(p) === key(point)) ?? -1}
      progress={progress} motion={motion} activeId={active?.id ?? 0} />)}
    {active && <Line p1={trailStart} p2={center}
      color={theme.paint} strokeWidth={cell * 0.86} strokeCap="round" />}
    <Group transform={transform}>
      <Circle cx={0} cy={cell * 0.075} r={cell * 0.33} color="#10182788" />
      <Circle cx={0} cy={0} r={cell * 0.32}>
        <RadialGradient c={vec(-cell * 0.1, -cell * 0.13)} r={cell * 0.57}
          colors={['#E4D9FF', theme.ball, '#7252C8']} positions={[0, 0.38, 1]} />
      </Circle>
      <Circle cx={glintX} cy={-cell * 0.13} r={cell * 0.065} color="#FFFFFFA0" />
    </Group>
  </Canvas>;
});

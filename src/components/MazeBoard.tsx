import { useEffect } from 'react';
import { Canvas, Circle, Group, Line, RadialGradient, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import { cancelAnimation, Easing, runOnJS, SharedValue, useAnimatedReaction, useDerivedValue, withTiming } from 'react-native-reanimated';
import { Game, Level, Point, animationPlan, floorTiles, isFloor, key, reachedTiles } from '../game/engine';
import { theme } from '../theme';

export type ActiveSlide = { origin: Point; path: readonly Point[]; id: number };
type Props = { level: Level; game: Game; size: number; active: ActiveSlide | null;
  progress: SharedValue<number>; onReached: (count: number) => void; onFinish: () => void };

function Tile({ point, level, cell, painted, index, progress, distance }: {
  point: Point; level: Level; cell: number; painted: boolean; index: number;
  progress: SharedValue<number>; distance: number;
}) {
  // Reveal only behind the moving ball. A short fade softens newly reached tiles.
  const opacity = useDerivedValue(() => painted ? 1 : index < 0 ? 0 :
    Math.max(0, Math.min(1, (progress.value * distance - index - 0.7) / 0.3)));
  const x = point.col * cell, y = point.row * cell;
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

export function MazeBoard({ level, game, size, active, progress, onReached, onFinish }: Props) {
  const columns = level.grid[0]!.length, rows = level.grid.length;
  const cell = size / columns;
  const origin = active?.origin ?? game.position;
  const plan = animationPlan(origin, active?.path ?? []);
  const x = useDerivedValue(() => (origin.col + 0.5 + (plan.destination.col - origin.col) * progress.value) * cell);
  const y = useDerivedValue(() => (origin.row + 0.5 + (plan.destination.row - origin.row) * progress.value) * cell);
  const center = useDerivedValue(() => vec(x.value, y.value));
  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }]);
  const glintX = useDerivedValue(() => -cell * 0.09 + Math.sin(progress.value * plan.distance * 2) * cell * 0.05);
  useAnimatedReaction(() => reachedTiles(plan.distance, progress.value), (count, previous) => {
    if (count !== previous && count > 0) runOnJS(onReached)(count);
  }, [active?.id, plan.distance]);
  useEffect(() => {
    progress.value = 0;
    if (active) progress.value = withTiming(1, { duration: plan.duration, easing: Easing.linear }, finished => {
      if (finished) runOnJS(onFinish)();
    });
    return () => cancelAnimation(progress);
  }, [active?.id]);
  return <Canvas style={{ width: size, height: rows * cell }}>
    <RoundedRect x={0} y={3} width={size} height={rows * cell - 3} r={16} color={theme.recess} />
    <RoundedRect x={0} y={0} width={size} height={rows * cell - 3} r={16} color={theme.wall} />
    {floorTiles(level).map(point => <Tile key={key(point)} point={point} level={level} cell={cell}
      painted={game.painted.includes(key(point))} index={active?.path.findIndex(p => key(p) === key(point)) ?? -1}
      progress={progress} distance={plan.distance} />)}
    {active && <Line p1={vec((origin.col + 0.5) * cell, (origin.row + 0.5) * cell)} p2={center}
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
}

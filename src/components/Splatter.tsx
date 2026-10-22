/** A fixed pool of floor-clipped, UI-thread droplets that survives turns and expires while idle. */
import { useEffect, useRef } from 'react';
import { Group, LinearGradient, Oval, vec } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { BallAppearance } from '../appearance';
import type { Motion } from './MazeBoard';
import { Droplet, dropletOpacity, makeDroplet, SPLATTER_INTERVAL, SPLATTER_LIMIT } from './splatterModel';

/** Each mounted slot is reused; only shared values move or fade, never React state. */
function Splash({ slot, drops, clock, cell, appearance, width, height }: {
  slot: number; drops: SharedValue<Droplet[]>; clock: SharedValue<number>; cell: number;
  appearance: BallAppearance; width: number; height: number;
}) {
  const rect = useDerivedValue(() => {
    const d = drops.value[slot];
    if (!d) return { x: 0, y: 0, width: 0, height: 0 };
    const t = Math.max(0, Math.min(1, (clock.value - d.born) / d.life));
    return { x: (d.x + d.vx * t - d.radius) * cell, y: (d.y + d.vy * t - d.radius * d.aspect) * cell,
      width: d.radius * cell * 2, height: d.radius * d.aspect * cell * 2 };
  });
  const opacity = useDerivedValue(() => drops.value[slot] ? dropletOpacity(drops.value[slot]!, clock.value) : 0);
  return <Group opacity={opacity}>
    <Oval rect={rect} color={appearance.paint[0]}>
      {appearance.paint.length > 1 && <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={appearance.paint} />}
    </Oval>
    {/* A same-hue highlight keeps small wet droplets legible on already-painted corridors. */}
    <Oval rect={rect} color={appearance.shading[1]} opacity={0.58} />
  </Group>;
}

/** Emission is capped at one droplet per 40 ms and disabled by the system Reduce Motion preference. */
export function Splatter({ motion, progress, activeId, historyLength, cell, appearance, width, height }: {
  motion: SharedValue<Motion>; progress: SharedValue<number>; activeId: number; historyLength: number;
  cell: number; appearance: BallAppearance; width: number; height: number;
}) {
  const drops = useSharedValue<Droplet[]>([]), clock = useSharedValue(0);
  const serial = useSharedValue(0), lastEmission = useSharedValue(-1000);
  const reducedMotion = useReducedMotion();
  const previousHistory = useRef(historyLength);
  useEffect(() => {
    // Undo/Restart must not leave cosmetic paint from the discarded future hanging over the restored board.
    if (historyLength < previousHistory.current) drops.value = [];
    previousHistory.current = historyLength;
  }, [historyLength, drops]);
  useFrameCallback(frame => {
    const now = frame.timestamp, m = motion.value, t = progress.value;
    const moving = activeId !== 0 && m.id === activeId && m.distance > 0 && t > 0 && t < 1;
    // Advance beyond the final expiry once before sleeping, rather than freezing a faint last frame.
    if (!moving && !drops.value.some(d => clock.value < d.born + d.life)) return;
    clock.value = now;
    if (moving && now - lastEmission.value >= SPLATTER_INTERVAL) {
      const next = drops.value.slice();
      next[serial.value % SPLATTER_LIMIT] = makeDroplet(serial.value, now,
        m.fromRow + (m.toRow - m.fromRow) * t, m.fromCol + (m.toCol - m.fromCol) * t,
        Math.sign(m.toCol - m.fromCol), Math.sign(m.toRow - m.fromRow));
      drops.value = next; serial.value += 1; lastEmission.value = now;
    }
  }, !reducedMotion);
  return <>{Array.from({ length: SPLATTER_LIMIT }, (_, slot) => <Splash key={slot} slot={slot} drops={drops}
    clock={clock} cell={cell} appearance={appearance} width={width} height={height} />)}</>;
}

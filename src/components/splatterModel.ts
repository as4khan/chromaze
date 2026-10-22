/** Small deterministic droplet descriptions; no particle changes a painted tile or game snapshot. */
export const SPLATTER_LIMIT = 12;
export const SPLATTER_INTERVAL = 40;
export type Droplet = { born: number; life: number; x: number; y: number; radius: number; aspect: number; alpha: number; vx: number; vy: number };
/** Emit behind the ball in grid units; deterministic variation avoids random work on every frame. */
export function makeDroplet(serial: number, now: number, row: number, col: number, dx: number, dy: number): Droplet {
  'worklet';
  const a = (serial * 37 % 101) / 100, b = (serial * 67 % 103) / 102, side = serial % 2 ? 1 : -1;
  // Keep most drops inside the corridor and behind the ball silhouette instead of hiding under it.
  const lateral = side * (0.12 + a * 0.22), behind = 0.38 + b * 0.28;
  return { born: now, life: 180 + serial % 5 * 20,
    x: col + 0.5 - dx * behind - dy * lateral, y: row + 0.5 - dy * behind + dx * lateral,
    radius: 0.045 + b * 0.055, aspect: 0.65 + a * 0.4, alpha: 0.65 + a * 0.25,
    vx: -dx * 0.04 - dy * side * 0.12, vy: -dy * 0.04 + dx * side * 0.12 };
}
/** Expiry is based on elapsed UI time, so background/resume cannot revive old splashes. */
export function dropletOpacity(drop: Droplet, now: number): number {
  'worklet';
  const t = Math.max(0, Math.min(1, (now - drop.born) / drop.life));
  // Linear fade retains useful contrast through the middle of the existing short lifetime.
  return drop.alpha * (1 - t);
}

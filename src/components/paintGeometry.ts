/** Shared floor silhouette and ribbon geometry, independent of Skia for deterministic rendering tests. */
import { floorTiles, isFloor, Level } from '../game/engine';

export type PaintRect = { x: number; y: number; width: number; height: number };
/** Clockwise, closed rectangles share winding so a single fill has no antialiased internal tile edges. */
function rectangle({ x, y, width, height }: PaintRect): string {
  return ['M', x, y, 'h', width, 'v', height, 'h', -width, 'Z'].join(' ');
}

/** Round only exposed convex corners; shared floor edges meet exactly, without overdraw into walls. */
export function floorOutline(level: Level, cell: number): string {
  return floorTiles(level).map(({ row, col }) => {
    const x = col * cell, y = row * cell, right = x + cell, bottom = y + cell, r = cell * 0.15;
    const up = isFloor(level, { row: row - 1, col }), down = isFloor(level, { row: row + 1, col });
    const left = isFloor(level, { row, col: col - 1 }), next = isFloor(level, { row, col: col + 1 });
    const tl = !up && !left ? r : 0, tr = !up && !next ? r : 0;
    const br = !down && !next ? r : 0, bl = !down && !left ? r : 0;
    return ['M', x + tl, y, 'H', right - tr, 'Q', right, y, right, y + tr,
      'V', bottom - br, 'Q', right, bottom, right - br, bottom,
      'H', x + bl, 'Q', x, bottom, x, bottom - bl,
      'V', y + tl, 'Q', x, y, x + tl, y, 'Z'].join(' ');
  }).join(' ');
}

/** Permanent paint uses full cells and is clipped by floorOutline, just like the in-flight ribbon. */
export function committedPaint(level: Level, painted: readonly string[], cell: number): string {
  return painted.flatMap(value => {
    const [row, col] = value.split(',').map(Number);
    return row !== undefined && col !== undefined && isFloor(level, { row, col })
      ? [rectangle({ x: col * cell, y: row * cell, width: cell, height: cell })] : [];
  }).join(' ');
}

/**
 * A full-width swept cell footprint follows the ball's center continuously in either axis.
 * Its half-cell leading edge stays within the current footprint; at 1 it exactly matches committed cells.
 * Floor clipping supplies rounded corners and removes all geometry outside traversable tiles.
 */
export function paintRibbon(fromRow: number, fromCol: number, toRow: number, toCol: number, progress: number, cell: number): PaintRect {
  'worklet';
  const t = Math.max(0, Math.min(1, progress));
  const row = fromRow + (toRow - fromRow) * t, col = fromCol + (toCol - fromCol) * t;
  return { x: Math.min(fromCol, col) * cell, y: Math.min(fromRow, row) * cell,
    width: (Math.abs(col - fromCol) + 1) * cell, height: (Math.abs(row - fromRow) + 1) * cell };
}

/** Short cosmetic wake stays behind the ball and fades to zero before a slide commits. */
export function movingWake(fromRow: number, fromCol: number, toRow: number, toCol: number, progress: number) {
  'worklet';
  const t = Math.max(0, Math.min(1, progress));
  const distance = Math.abs(toCol - fromCol) + Math.abs(toRow - fromRow);
  const travel = distance * t, dx = Math.sign(toCol - fromCol), dy = Math.sign(toRow - fromRow);
  const x = fromCol + 0.5 + dx * travel, y = fromRow + 0.5 + dy * travel;
  return {
    from: { x: x - dx * Math.min(1.4, travel), y: y - dy * Math.min(1.4, travel) },
    to: { x: x - dx * Math.min(0.25, travel), y: y - dy * Math.min(0.25, travel) },
    opacity: Math.max(0, Math.min(1, travel / 0.3, (distance - travel) / 0.6)) * 0.55,
  };
}

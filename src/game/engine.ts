/** Pure grid movement, paint coverage, immutable snapshots, and animation timing shared by UI and tests. */
/** Zero-based tile coordinates; the renderer converts tile centers to pixels. */
export type Point = Readonly<{ row: number; col: number }>;
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Level = Readonly<{ id: number; name: string; grid: readonly string[]; start: Point }>;
/** One committed stopping state; history is kept separately to avoid recursive snapshots. */
export type Snapshot = Readonly<{ position: Point; painted: readonly string[]; moves: number }>;
export type Game = Snapshot & Readonly<{ history: readonly Snapshot[] }>;
// A single duration per tile keeps every corridor at the same travel speed.
export const MS_PER_TILE = 50;
export const SWIPE_THRESHOLD = 14;
export const directions: readonly Direction[] = ['up', 'down', 'left', 'right'];
const vectors: Record<Direction, Point> = {
  up: { row: -1, col: 0 }, down: { row: 1, col: 0 },
  left: { row: 0, col: -1 }, right: { row: 0, col: 1 },
};
export const key = (p: Point) => `${p.row},${p.col}`;
/** Missing rows/cells and board boundaries are obstacles, just like explicit walls. */
export const isFloor = (level: Level, p: Point) => level.grid[p.row]?.[p.col] === '.';
/** Returns paintable coordinates in row order; walls never contribute to progress. */
export function floorTiles(level: Level): Point[] {
  return level.grid.flatMap((row, r) => [...row].flatMap((tile, c) => tile === '.' ? [{ row: r, col: c }] : []));
}
/**
 * Computes an uninterrupted straight slide without changing game state.
 * @param from Current stopping tile, excluded from the returned path.
 * @param direction Requested cardinal direction.
 * @returns Traversed tiles in order, including the last reachable tile; empty when blocked.
 */
export function slide(level: Level, from: Point, direction: Direction): readonly Point[] {
  const path: Point[] = [];
  const delta = vectors[direction];
  let next = { row: from.row + delta.row, col: from.col + delta.col };
  while (isFloor(level, next)) {
    path.push(next);
    next = { row: next.row + delta.row, col: next.col + delta.col };
  }
  return path;
}
/** Selects the dominant axis of a displacement in screen points; small gestures return null. */
export function swipeDirection(x: number, y: number): Direction | null {
  'worklet';
  if (Math.max(Math.abs(x), Math.abs(y)) < SWIPE_THRESHOLD) return null;
  return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
}
/** Starts or restarts a level with its starting tile painted and no move history. */
export function initialGame(level: Level): Game {
  return { position: level.start, painted: [key(level.start)], moves: 0, history: [] };
}
/** Returns deduplicated tile keys without mutating earlier paint snapshots. */
export function paint(painted: readonly string[], points: readonly Point[]): readonly string[] {
  return [...new Set([...painted, ...points.map(key)])];
}
/** Checks actual floor coverage rather than trusting the painted-array length. */
export const complete = (level: Level, state: Snapshot) => floorTiles(level).every(p => state.painted.includes(key(p)));
/** Commits a computed path after animation finishes: one move, one undo snapshot. Empty paths are no-ops. */
export function commitSlide(state: Game, path: readonly Point[]): Game {
  const destination = path.at(-1);
  if (!destination) return state;
  // Exclude history itself: an undo entry only needs position, paint, and move count.
  const { history, ...snapshot } = state;
  return { position: destination, painted: paint(state.painted, path), moves: state.moves + 1, history: [...history, snapshot] };
}
/** Restores the last completed slide, including paint; returns the same state when history is empty. */
export function undo(state: Game): Game {
  const previous = state.history.at(-1);
  return previous ? { ...previous, history: state.history.slice(0, -1) } : state;
}
/** Returns the renderer's destination and total linear duration in milliseconds; an empty path stays put. */
export function animationPlan(from: Point, path: readonly Point[]) {
  return { from, destination: path.at(-1) ?? from, distance: path.length, duration: path.length * MS_PER_TILE };
}
/**
 * Maps normalized animation progress (0–1) to the number of tile centers reached.
 * The count is clamped to the slide distance and is safe to calculate on the UI thread.
 */
export function reachedTiles(distance: number, progress: number) {
  'worklet';
  // Absorb floating-point underflow when progress lands exactly on a tile boundary.
  return Math.min(distance, Math.max(0, Math.floor(distance * progress + 0.00001)));
}

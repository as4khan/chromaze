export type Point = Readonly<{ row: number; col: number }>;
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Level = Readonly<{ id: number; name: string; grid: readonly string[]; start: Point }>;
export type Snapshot = Readonly<{ position: Point; painted: readonly string[]; moves: number }>;
export type Game = Snapshot & Readonly<{ history: readonly Snapshot[] }>;
export const MS_PER_TILE = 100;
export const SWIPE_THRESHOLD = 22;
export const directions: readonly Direction[] = ['up', 'down', 'left', 'right'];
const vectors: Record<Direction, Point> = {
  up: { row: -1, col: 0 }, down: { row: 1, col: 0 },
  left: { row: 0, col: -1 }, right: { row: 0, col: 1 },
};
export const key = (p: Point) => `${p.row},${p.col}`;
export const isFloor = (level: Level, p: Point) => level.grid[p.row]?.[p.col] === '.';
export function floorTiles(level: Level): Point[] {
  return level.grid.flatMap((row, r) => [...row].flatMap((tile, c) => tile === '.' ? [{ row: r, col: c }] : []));
}
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
export function swipeDirection(x: number, y: number): Direction | null {
  if (Math.max(Math.abs(x), Math.abs(y)) < SWIPE_THRESHOLD) return null;
  return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
}
export function initialGame(level: Level): Game {
  return { position: level.start, painted: [key(level.start)], moves: 0, history: [] };
}
export function paint(painted: readonly string[], points: readonly Point[]): readonly string[] {
  return [...new Set([...painted, ...points.map(key)])];
}
export const complete = (level: Level, state: Snapshot) => floorTiles(level).every(p => state.painted.includes(key(p)));
export function commitSlide(state: Game, path: readonly Point[]): Game {
  const destination = path.at(-1);
  if (!destination) return state;
  const { history, ...snapshot } = state;
  return { position: destination, painted: paint(state.painted, path), moves: state.moves + 1, history: [...history, snapshot] };
}
export function undo(state: Game): Game {
  const previous = state.history.at(-1);
  return previous ? { ...previous, history: state.history.slice(0, -1) } : state;
}
/** UI and renderer use exactly this destination and duration. */
export function animationPlan(from: Point, path: readonly Point[]) {
  return { from, destination: path.at(-1) ?? from, distance: path.length, duration: path.length * MS_PER_TILE };
}
/** Number of tile centers physically reached by a continuous slide. */
export function reachedTiles(distance: number, progress: number) {
  'worklet';
  return Math.min(distance, Math.max(0, Math.floor(distance * progress + 0.00001)));
}

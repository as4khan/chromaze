/** Offline breadth-first verification that a level can be fully painted using legal slides. */
import { Direction, Level, directions, floorTiles, key, slide } from './engine';
/**
 * Searches stopping positions and paint masks, not merely floor connectivity.
 * @param limit Maximum states to expand before throwing, protecting against excessive search time.
 * @returns A shortest slide sequence, or null when no full-paint solution exists.
 * @throws If the start is invalid or the search budget is exhausted.
 */
export function solve(level: Level, limit = 300000): Direction[] | null {
  const tiles = floorTiles(level);
  if (!tiles.length || !tiles.some(p => key(p) === key(level.start))) throw new Error('Invalid start');
  const indices = new Map(tiles.map((p, i) => [key(p), i]));
  // BigInt keeps paint masks accurate beyond JavaScript's 32-bit bitwise limit.
  const bit = (p: {row:number; col:number}) => 1n << BigInt(indices.get(key(p))!);
  const target = (1n << BigInt(tiles.length)) - 1n;
  const queue = [{ position: level.start, mask: bit(level.start), moves: [] as Direction[] }];
  const seen = new Set<string>();
  for (let i = 0; i < queue.length; i++) {
    if (i >= limit) throw new Error(`Solver exceeded ${limit} states`);
    const current = queue[i]!;
    if (current.mask === target) return current.moves;
    for (const direction of directions) {
      const path = slide(level, current.position, direction);
      const position = path.at(-1);
      if (!position) continue;
      const mask = path.reduce((m, p) => m | bit(p), current.mask);
      // The same stopping tile with different paint coverage is a distinct puzzle state.
      const signature = `${key(position)}:${mask}`;
      if (seen.has(signature)) continue;
      seen.add(signature);
      queue.push({ position, mask, moves: [...current.moves, direction] });
    }
  }
  return null;
}

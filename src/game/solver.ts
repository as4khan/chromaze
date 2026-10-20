import { Direction, Level, directions, floorTiles, key, slide } from './engine';
/** BFS over (stopping position, painted mask), not just floor connectivity. */
export function solve(level: Level, limit = 300000): Direction[] | null {
  const tiles = floorTiles(level);
  if (!tiles.length || !tiles.some(p => key(p) === key(level.start))) throw new Error('Invalid start');
  const indices = new Map(tiles.map((p, i) => [key(p), i]));
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
      const signature = `${key(position)}:${mask}`;
      if (seen.has(signature)) continue;
      seen.add(signature);
      queue.push({ position, mask, moves: [...current.moves, direction] });
    }
  }
  return null;
}

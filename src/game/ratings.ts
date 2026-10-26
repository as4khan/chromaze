/** Move-efficiency rewards use offline solver minima; the solver never runs during play. */
export type StarRating = 1 | 2 | 3;
/** Short levels allow one extra move for three stars and three extra for two; larger levels scale. */
export function ratingThresholds(optimalMoves: number): { three: number; two: number } {
  if (!Number.isSafeInteger(optimalMoves) || optimalMoves < 1) throw new RangeError('Optimal moves must be a positive integer');
  return { three: optimalMoves + Math.max(1, Math.floor(optimalMoves * 0.2)),
    two: optimalMoves + Math.max(3, Math.ceil(optimalMoves * 0.5)) };
}
/** Every valid finish earns a star; impossible move counts are rejected at the boundary. */
export function starsForMoves(moves: number, optimalMoves: number): StarRating {
  const { three, two } = ratingThresholds(optimalMoves);
  if (!Number.isSafeInteger(moves) || moves < optimalMoves) throw new RangeError('Moves must be an integer at least the optimum');
  return moves <= three ? 3 : moves <= two ? 2 : 1;
}

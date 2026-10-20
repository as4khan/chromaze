import { levels } from '../src/game/levels';
import { solve } from '../src/game/solver';
for (const level of levels) {
  const solution = solve(level);
  if (!solution) throw new Error(`Level ${level.id} is unsolvable`);
  console.log(`Level ${level.id}: ${solution.length} slides — ${solution.join(', ')}`);
}

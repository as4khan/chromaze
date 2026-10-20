/** Original handcrafted levels shared by gameplay, rendering, and sliding-solvability tests. */
import { Level } from './engine';
// A dot is floor; a hash is wall. Starts are zero-based; array order defines progression.
export const levels: readonly Level[] = [
  { id: 1, name: 'First light', start: { row: 0, col: 0 }, grid: [
    '.....', '####.', '.....', '.####', '.....',
  ] },
  { id: 2, name: 'Around the bend', start: { row: 0, col: 0 }, grid: [
    '......', '.####.', '.#....', '.#.###', '.#....', '....#.',
  ] },
  { id: 3, name: 'The quiet labyrinth', start: { row: 0, col: 0 }, grid: [
    '.......', '.#.###.', '.#...#.', '.#.#.#.', '.#...#.', '.###.#.', '.....#.',
  ] },
];

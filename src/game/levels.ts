import { Level } from './engine';
// Original handcrafted layouts. A dot is floor; a hash is wall.
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

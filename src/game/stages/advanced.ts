/** Original advanced layouts; minimum moves are verified offline by the existing breadth-first solver. */
import { CampaignLevel } from './types';

export const advanced: readonly CampaignLevel[] = [
  {
    "id": 11,
    "name": "Sundial",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      ".....####",
      ".###.####",
      ".###.....",
      "..#..###.",
      "###.###..",
      "........#",
      ".###.####",
      ".........",
      "####....."
    ],
    "minimumMoves": 19,
    "focus": "Link courts from unequal approaches."
  },
  {
    "id": 12,
    "name": "Glasshouse",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      ".........",
      ".#######.",
      "..#......",
      "###.#.###",
      "......#..",
      ".##.#.##.",
      ".........",
      ".#######.",
      "........."
    ],
    "minimumMoves": 19,
    "focus": "Revisit lanes to access cross-links."
  },
  {
    "id": 13,
    "name": "Long way home",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      "...........",
      ".#########.",
      ".#.......#.",
      "####.#####.",
      ".....#.....",
      ".###.###.#.",
      ".#.......#.",
      ".#########.",
      "..........."
    ],
    "minimumMoves": 20,
    "focus": "Plan returns between the rim and inner lanes."
  },
  {
    "id": 14,
    "name": "Twin galleries",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      ".....#...",
      ".###.###.",
      ".###.###.",
      "..#......",
      "###.###.#",
      ".....##..",
      ".###.###.",
      ".###.###.",
      "........."
    ],
    "minimumMoves": 21,
    "focus": "Choose which gallery to clear first."
  },
  {
    "id": 15,
    "name": "The crossing",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      "...#.....",
      ".###.###.",
      ".........",
      "####.###.",
      "....#....",
      "###.#.###",
      "..#......",
      ".#######.",
      "........."
    ],
    "minimumMoves": 22,
    "focus": "Use blocked crossings as deliberate stops."
  }
];

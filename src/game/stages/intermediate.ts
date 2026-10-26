/** Original intermediate layouts; minimum moves are verified offline by the existing breadth-first solver. */
import { CampaignLevel } from './types';

export const intermediate: readonly CampaignLevel[] = [
  {
    "id": 6,
    "name": "Pocket compass",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      ".......",
      ".###.#.",
      "..##.#.",
      "##...#.",
      ".#.###.",
      ".#.....",
      "...####"
    ],
    "minimumMoves": 14,
    "focus": "Plan a return through the center."
  },
  {
    "id": 7,
    "name": "Courtyard",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      ".......",
      ".#####.",
      "##..##.",
      "...#...",
      ".#...#.",
      ".#####.",
      "......."
    ],
    "minimumMoves": 14,
    "focus": "Connect the rim and inner court."
  },
  {
    "id": 8,
    "name": "Inner harbor",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      ".........",
      ".#######.",
      ".#.....#.",
      "##.#####.",
      "...#.....",
      ".#.###.#.",
      ".#.....#.",
      ".#######.",
      "........."
    ],
    "minimumMoves": 15,
    "focus": "Use the loop to reach each inner channel."
  },
  {
    "id": 9,
    "name": "Pinwheel",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      ".........",
      ".###.###.",
      ".###.####",
      ".....#...",
      "####.#.#.",
      "...#.....",
      ".###.###.",
      ".###.###.",
      "........."
    ],
    "minimumMoves": 18,
    "focus": "Alternate outer and inner lanes."
  },
  {
    "id": 10,
    "name": "Staggered landings",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      ".........",
      ".####.##.",
      "....#....",
      "###.#.###",
      ".......#.",
      ".##.####.",
      ".........",
      "###.####.",
      "........."
    ],
    "minimumMoves": 18,
    "focus": "Choose stopping lanes to cover staggered branches."
  }
];

/** Original expert layouts; minimum moves are verified offline by the existing breadth-first solver. */
import { CampaignLevel } from './types';

export const expert: readonly CampaignLevel[] = [
  {
    "id": 16,
    "name": "Braided avenues",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      "...........",
      ".##########",
      ".....#.....",
      ".###.###.#.",
      "...#.....#.",
      "##.###.####",
      "...........",
      ".#.###.####",
      ".....#.....",
      ".#####.###.",
      "..........."
    ],
    "minimumMoves": 26,
    "focus": "Coordinate several linked return routes."
  },
  {
    "id": 17,
    "name": "Offset atrium",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      "...........",
      ".#########.",
      "...#...#...",
      "##.#.#.#.##",
      ".#...#...#.",
      ".###.#.###.",
      ".###.#.###.",
      ".###.#.###.",
      ".#...#...#.",
      ".#.#####.#.",
      "..........."
    ],
    "minimumMoves": 28,
    "focus": "Enter each chamber from the right approach."
  },
  {
    "id": 18,
    "name": "Tidal chambers",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      ".....#.....",
      ".###.#.###.",
      ".#...#...#.",
      ".#.#####.#.",
      ".....#.....",
      ".###.#.###.",
      ".#...#.....",
      ".#.#####.#.",
      ".#...#...#.",
      ".###.#.###.",
      ".......#..."
    ],
    "minimumMoves": 30,
    "focus": "Plan transfers between the two halves."
  },
  {
    "id": 19,
    "name": "Double helix",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      "...........",
      "#####.####.",
      "....#......",
      ".####.#####",
      "..........#",
      "####.####.#",
      ".....##....",
      ".#.####.###",
      ".#.......#.",
      "########.#.",
      "..........."
    ],
    "minimumMoves": 31,
    "focus": "Unwind alternating offsets and revisit the right lanes."
  },
  {
    "id": 20,
    "name": "Switchyard",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      "...........",
      ".##.######.",
      "....#......",
      "###.#.#####",
      "...........",
      ".###.#.###.",
      ".....#.....",
      "######.##.#",
      "..#.....#..",
      ".##.###.##.",
      ".....#....."
    ],
    "minimumMoves": 33,
    "focus": "Combine stop planning and corridor revisits."
  }
];

/** Original beginner layouts; minimum moves are verified offline by the existing breadth-first solver. */
import { CampaignLevel } from './types';

export const beginner: readonly CampaignLevel[] = [
  {
    "id": 1,
    "name": "First light",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      ".....",
      "####.",
      ".....",
      ".####",
      "....."
    ],
    "minimumMoves": 5,
    "focus": "Follow the first connected path."
  },
  {
    "id": 2,
    "name": "Around the bend",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      "......",
      ".####.",
      ".#....",
      ".#.###",
      ".#....",
      "....#."
    ],
    "minimumMoves": 11,
    "focus": "Explore the return around the bend."
  },
  {
    "id": 3,
    "name": "The quiet labyrinth",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      ".......",
      ".#.###.",
      ".#...#.",
      ".#.#.#.",
      ".#...#.",
      ".###.#.",
      ".....#."
    ],
    "minimumMoves": 11,
    "focus": "Use the walls to reach the inner loop."
  },
  {
    "id": 4,
    "name": "The switchback",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      "....#..",
      "###.##.",
      ".......",
      ".#####.",
      ".......",
      ".######",
      "......."
    ],
    "minimumMoves": 12,
    "focus": "Use wall stops to change lanes."
  },
  {
    "id": 5,
    "name": "Crosscurrent",
    "start": {
      "row": 0,
      "col": 0
    },
    "grid": [
      "....#..",
      ".##.##.",
      ".......",
      "###.##.",
      "....#.."
    ],
    "minimumMoves": 13,
    "focus": "Approach crossings from a new side."
  }
];

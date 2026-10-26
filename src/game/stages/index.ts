/** Ordered campaign manifest: add another authored world/stage file here without changing gameplay imports. */
import { beginner } from './beginner';
import { intermediate } from './intermediate';
import { advanced } from './advanced';
import { expert } from './expert';
import { Stage } from './types';
export const stages: readonly Stage[] = [
  { id: 'beginner', name: 'Beginner', description: 'Find your stops. Connect the first paths.', levels: beginner },
  { id: 'intermediate', name: 'Intermediate', description: 'Read loops, return routes, and offset lanes.', levels: intermediate },
  { id: 'advanced', name: 'Advanced', description: 'Plan your approach through linked courts and galleries.', levels: advanced },
  { id: 'expert', name: 'Expert', description: 'Make every return count across intricate, branching routes.', levels: expert },
];

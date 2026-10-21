/** Worklet-safe touch recognition and the single-slot directional movement state machine. */
import { commitSlide, complete, Direction, Game, initialGame, Level, Point, slide, SWIPE_THRESHOLD, swipeDirection } from './engine';
/** Last consumed translation anchor and direction within one finger contact. */
export type Touch = Readonly<{ x: number; y: number; direction: Direction | null }>;
export type ActiveSlide = Readonly<{ origin: Point; path: readonly Point[]; id: number }>;
/** game is committed state; active is uncommitted travel; pending holds at most one future command. */
export type Movement = Readonly<{ game: Game; phase: 'idle' | 'sliding' | 'completing'; active: ActiveSlide | null; pending: Direction | null; serial: number }>;
/** Resets only the recognizer at the start/end of a touch, not an active slide or pending command. */
export function initialTouch(): Touch {
  'worklet';
  return { x: 0, y: 0, direction: null };
}
/**
 * Recognizes deliberate direction changes without requiring a finger lift.
 * @param x Cumulative horizontal pan translation in screen points for this touch.
 * @param y Cumulative vertical pan translation in screen points for this touch.
 * @returns Updated touch state and direction; direction is null for jitter or continued straight travel.
 */
export function recognizeDirection(touch: Touch, x: number, y: number): { touch: Touch; direction: Direction | null } {
  'worklet';
  const dx = x - touch.x, dy = y - touch.y;
  const major = Math.max(Math.abs(dx), Math.abs(dy));
  const minor = Math.min(Math.abs(dx), Math.abs(dy));
  const direction = swipeDirection(dx, dy);
  // Keep the anchor while a diagonal is ambiguous so a later clear turn can still accumulate.
  if (!direction || major < minor * 1.25) return { touch, direction: null };
  const horizontal = direction === 'left' || direction === 'right';
  const wasHorizontal = touch.direction === 'left' || touch.direction === 'right';
  const reversal = touch.direction !== null && direction !== touch.direction && horizontal === wasHorizontal;
  // A reversal needs more travel than a perpendicular turn to reject small thumb corrections.
  const threshold = reversal ? 22 : touch.direction && direction !== touch.direction ? 18 : SWIPE_THRESHOLD;
  if (major < threshold) return { touch, direction: null };
  // Consume straight-line travel too, so a long drag does not bury the next turn.
  return { touch: { x, y, direction }, direction: direction === touch.direction ? null : direction };
}
/** Wraps committed game state; retaining the previous serial prevents slide-ID reuse after resets. */
export function createMovement(level: Level, game = initialGame(level), serial = 0): Movement {
  return { game, phase: complete(level, game) ? 'completing' : 'idle', active: null, pending: null, serial };
}
/** Starts a legal idle slide, or replaces the latest pending command without interrupting travel. */
export function requestMovement(level: Level, state: Movement, direction: Direction): Movement {
  if (state.phase === 'completing') return state;
  // Check buffered collision later from the stopping tile, not from the current slide's origin.
  if (state.phase === 'sliding') return { ...state, pending: direction };
  const path = slide(level, state.game.position, direction);
  if (!path.length) return state;
  const id = state.serial + 1;
  return { ...state, phase: 'sliding', active: { origin: state.game.position, path, id }, pending: null, serial: id };
}
/** Commits only the matching animation ID, then attempts the pending slide in the same transition. */
export function finishMovement(level: Level, state: Movement, id: number): Movement {
  // UI-thread completions may arrive after a reset or after the next slide has already started.
  if (state.active?.id !== id) return state;
  const game = commitSlide(state.game, state.active.path);
  const stopped = createMovement(level, game, state.serial);
  // A completing state rejects the pending command; a blocked one leaves the game idle.
  return state.pending ? requestMovement(level, stopped, state.pending) : stopped;
}
/**
 * Clears active/pending input while retaining unique slide IDs.
 * @param game Committed state to restore for Undo; omission restores the level's initial state.
 */
export function resetMovement(level: Level, state: Movement, game = initialGame(level)): Movement {
  return createMovement(level, game, state.serial);
}

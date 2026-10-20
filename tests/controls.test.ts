import test from 'node:test';
import assert from 'node:assert/strict';
import { commitSlide, initialGame, Level, slide, undo } from '../src/game/engine';
import { levels } from '../src/game/levels';
import { createMovement, finishMovement, initialTouch, recognizeDirection, requestMovement, resetMovement } from '../src/game/controls';

const level = levels[0]!;
function finish(state: ReturnType<typeof createMovement>) {
  assert.ok(state.active);
  return finishMovement(level, state, state.active.id);
}

test('A: a short flick starts a full slide which survives finger release', () => {
  const input = recognizeDirection(initialTouch(), 16, 1);
  assert.equal(input.direction, 'right');
  const moving = requestMovement(level, createMovement(level), input.direction!);
  initialTouch(); // A released finger resets recognition, not the movement.
  assert.equal(moving.active?.path.length, 4);
  assert.deepEqual(finish(moving).game.position, { row: 0, col: 4 });
});
test('B: one held touch recognizes right/down/left relative to recent movement', () => {
  let touch = initialTouch();
  let movement = createMovement(level);
  const recognized: string[] = [];
  for (const [x, y] of [[30, 0], [180, 0], [180, 25], [150, 25]]) {
    const input = recognizeDirection(touch, x!, y!);
    touch = input.touch;
    if (input.direction) {
      recognized.push(input.direction);
      movement = finish(requestMovement(level, movement, input.direction));
    }
  }
  assert.deepEqual(recognized, ['right', 'down', 'left']);
  assert.equal(movement.game.moves, 3);
  assert.deepEqual(movement.game.position, { row: 2, col: 0 });
});
test('C: a buffered turn begins at the current slide endpoint, never mid-corridor', () => {
  const right = requestMovement(level, createMovement(level), 'right');
  const buffered = requestMovement(level, right, 'down');
  assert.equal(buffered.active, right.active);
  assert.equal(buffered.pending, 'down');
  assert.deepEqual(buffered.game.position, level.start);
  const turned = finish(buffered);
  assert.equal(turned.phase, 'sliding');
  assert.equal(turned.pending, null);
  assert.equal(turned.game.moves, 1);
  assert.deepEqual(turned.active?.origin, { row: 0, col: 4 });
  assert.deepEqual(turned.active?.path.at(-1), { row: 2, col: 4 });
});
test('D: a wall-adjacent command leaves position, moves, and history unchanged', () => {
  const idle = createMovement(level);
  assert.equal(requestMovement(level, idle, 'down'), idle);
  assert.equal(requestMovement(level, idle, 'left'), idle);
});
test('E: a separate released flick is retained during an animation', () => {
  let moving = requestMovement(level, createMovement(level), 'right');
  const secondFlick = recognizeDirection(initialTouch(), 0, 16);
  moving = requestMovement(level, moving, secondFlick.direction!);
  initialTouch();
  const down = finish(moving);
  assert.equal(down.active?.path.length, 2);
  assert.deepEqual(finish(down).game.position, { row: 2, col: 4 });
});
test('F: undo reverses exactly one of several slides made during a held touch', () => {
  const first = finish(requestMovement(level, createMovement(level), 'right'));
  const second = finish(requestMovement(level, first, 'down'));
  const third = finish(requestMovement(level, second, 'left'));
  assert.equal(third.game.moves, 3);
  const restored = resetMovement(level, third, undo(third.game));
  assert.deepEqual(restored.game, second.game);
  assert.equal(restored.phase, 'idle');
  assert.equal(restored.pending, null);
});
test('G: holding still or continuing straight emits no repeated automatic moves', () => {
  const first = recognizeDirection(initialTouch(), 30, 0);
  let touch = first.touch;
  for (const x of [30, 30, 35, 80, 160, 160]) {
    const input = recognizeDirection(touch, x, 0);
    assert.equal(input.direction, null);
    touch = input.touch;
  }
  const stopped = finish(requestMovement(level, createMovement(level), 'right'));
  assert.equal(stopped.active, null);
  assert.equal(stopped.game.moves, 1);
});
test('latest requested direction replaces the buffer instead of growing a queue', () => {
  const moving = requestMovement(level, createMovement(level), 'right');
  const down = requestMovement(level, moving, 'down');
  const left = requestMovement(level, down, 'left');
  assert.equal(left.pending, 'left');
  const next = finish(left);
  assert.deepEqual(next.active?.path.at(-1), level.start);
  assert.equal(finish(next).phase, 'idle');
});
test('a blocked pending direction is discarded without a move or undo entry', () => {
  const moving = requestMovement(level, createMovement(level), 'right');
  const next = finish(requestMovement(level, moving, 'up'));
  assert.equal(next.phase, 'idle');
  assert.equal(next.pending, null);
  assert.equal(next.game.moves, 1);
  assert.equal(next.game.history.length, 1);
});
test('completion clears the buffer and rejects additional directions', () => {
  const corridor: Level = { id: 0, name: 'Line', start: { row: 0, col: 0 }, grid: ['....'] };
  let state = requestMovement(corridor, createMovement(corridor), 'right');
  state = requestMovement(corridor, state, 'left');
  state = finishMovement(corridor, state, state.active!.id);
  assert.equal(state.phase, 'completing');
  assert.equal(state.pending, null);
  assert.equal(state.active, null);
  assert.equal(state.game.moves, 1);
  assert.equal(requestMovement(corridor, state, 'left'), state);
});
test('restart and undo clear pending inputs and stale animation callbacks are ignored', () => {
  const first = finish(requestMovement(level, createMovement(level), 'right'));
  const active = requestMovement(level, first, 'down');
  const queued = requestMovement(level, active, 'left');
  for (const nextGame of [initialGame(level), undo(queued.game)]) {
    const cleared = resetMovement(level, queued, nextGame);
    assert.equal(cleared.active, null);
    assert.equal(cleared.pending, null);
    assert.equal(finishMovement(level, cleared, active.active!.id), cleared);
    const fresh = requestMovement(level, cleared, 'right');
    assert.notEqual(fresh.active?.id, active.active!.id);
    assert.equal(finishMovement(level, fresh, active.active!.id), fresh);
  }
});
test('duplicate completion callbacks cannot commit a slide twice or finish the next slide', () => {
  const moving = requestMovement(level, createMovement(level), 'right');
  const turned = finish(requestMovement(level, moving, 'down'));
  assert.equal(finishMovement(level, turned, moving.active!.id), turned);
  const stopped = finish(turned);
  assert.equal(finishMovement(level, stopped, turned.active!.id), stopped);
  assert.equal(stopped.game.moves, 2);
});
test('paint and undo snapshots are committed separately at each buffered stop', () => {
  const right = requestMovement(level, createMovement(level), 'right');
  const next = finish(requestMovement(level, right, 'down'));
  const expected = commitSlide(initialGame(level), slide(level, level.start, 'right'));
  assert.deepEqual(next.game, expected);
  assert.deepEqual(next.game.painted, ['0,0', '0,1', '0,2', '0,3', '0,4']);
  assert.deepEqual(undo(finish(next).game), expected);
});
test('hysteresis rejects taps, ambiguous diagonals, and small accidental reversals', () => {
  const idle = initialTouch();
  assert.equal(recognizeDirection(idle, 4, 5).direction, null);
  assert.equal(recognizeDirection(idle, 20, 19).direction, null);
  const right = recognizeDirection(idle, 30, 0).touch;
  assert.equal(recognizeDirection(right, 15, 0).direction, null);
  assert.equal(recognizeDirection(right, 7, 0).direction, 'left');
});
test('slow intentional turns accumulate while small straight-line drift is absorbed', () => {
  let touch = recognizeDirection(initialTouch(), 30, 0).touch;
  for (const [x, y] of [[34, 4], [37, 8], [39, 12], [40, 16]]) {
    const input = recognizeDirection(touch, x!, y!);
    assert.equal(input.direction, null);
    touch = input.touch;
  }
  assert.equal(recognizeDirection(touch, 40, 21).direction, 'down');
});

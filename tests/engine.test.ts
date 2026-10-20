import test from 'node:test';
import assert from 'node:assert/strict';
import { animationPlan, commitSlide, complete, floorTiles, initialGame, key, Level, MS_PER_TILE, paint, reachedTiles, slide, swipeDirection, undo } from '../src/game/engine';
import { levels } from '../src/game/levels';
import { solve } from '../src/game/solver';
const corridor: Level = { id: 0, name: 'Test', start: { row: 0, col: 0 }, grid: ['.....#', '######'] };
test('one swipe traverses four tiles and stops before a wall', () => {
  assert.deepEqual(slide(corridor, corridor.start, 'right'), [1,2,3,4].map(col => ({row:0,col})));
});
test('stops at open board boundary in all directions', () => {
  const level = { ...corridor, grid: ['...', '...', '...'] };
  for (const [direction, end] of [['right', {row:1,col:2}], ['left', {row:1,col:0}], ['up', {row:0,col:1}], ['down', {row:2,col:1}]] as const) {
    assert.deepEqual(slide(level, {row:1,col:1}, direction).at(-1), end);
  }
});
test('blocked slide preserves state identity, history, and move count', () => {
  const initial = initialGame(corridor);
  assert.equal(commitSlide(initial, slide(corridor, initial.position, 'down')), initial);
  assert.deepEqual(slide(corridor, {row:0,col:4}, 'right'), []);
});
test('start is painted immediately; every traversed tile is painted by completion', () => {
  const initial = initialGame(corridor);
  assert.deepEqual(initial.painted, ['0,0']);
  const next = commitSlide(initial, slide(corridor, initial.position, 'right'));
  assert.equal(next.moves, 1);
  assert.equal(next.painted.length, 5);
  assert.deepEqual(initial.painted, ['0,0']);
});
test('revisiting paint never duplicates the tile count', () => {
  const first = commitSlide(initialGame(corridor), slide(corridor, corridor.start, 'right'));
  const second = commitSlide(first, slide(corridor, first.position, 'left'));
  assert.equal(second.painted.length, 5);
  assert.equal(second.moves, 2);
});
test('undo restores position, exact paint set and moves across multiple slides', () => {
  const level = levels[0]!;
  const initial = initialGame(level);
  const first = commitSlide(initial, slide(level, initial.position, 'right'));
  const second = commitSlide(first, slide(level, first.position, 'down'));
  assert.deepEqual(undo(second), first);
  assert.deepEqual(undo(undo(second)), initial);
  assert.equal(undo(initial), initial);
});
test('restart clears paint, moves, and history while keeping the start painted', () => {
  const moved = commitSlide(initialGame(corridor), slide(corridor, corridor.start, 'right'));
  assert.equal(moved.moves, 1);
  assert.deepEqual(initialGame(corridor), {position:corridor.start, painted:['0,0'], moves:0, history:[]});
});
test('completion requires every floor tile', () => {
  assert.equal(complete(corridor, initialGame(corridor)), false);
  assert.equal(complete(corridor, commitSlide(initialGame(corridor), slide(corridor, corridor.start, 'right'))), true);
});
test('animation destination and duration agree with collision path', () => {
  const path = slide(corridor, corridor.start, 'right');
  assert.deepEqual(animationPlan(corridor.start, path), {from:corridor.start, destination:{row:0,col:4}, distance:4, duration:200});
  assert.equal(MS_PER_TILE, 50);
  assert.equal(animationPlan(corridor.start, path.slice(0, 1)).duration, 50);
  assert.equal(animationPlan(corridor.start, []).duration, 0);
  assert.deepEqual(animationPlan(corridor.start, []).destination, corridor.start);
});
test('paint progression only counts tile centers physically reached', () => {
  const duration = animationPlan(corridor.start, slide(corridor, corridor.start, 'right')).duration;
  assert.deepEqual([0, 49, 50, 100, 150, 200].map(ms => reachedTiles(4, ms / duration)), [0, 0, 1, 2, 3, 4]);
  assert.equal(reachedTiles(4, 0), 0);
  assert.equal(reachedTiles(4, 0.24), 0);
  assert.equal(reachedTiles(4, 0.25), 1);
  assert.equal(reachedTiles(4, 0.74), 2);
  assert.equal(reachedTiles(4, 1), 4);
  const path = slide(corridor, corridor.start, 'right');
  assert.deepEqual(paint(['0,0'], path.slice(0, reachedTiles(4, 0.5))), ['0,0','0,1','0,2']);
});
test('swipes use dominant axis and reject small gestures', () => {
  assert.equal(swipeDirection(13, 0), null);
  assert.equal(swipeDirection(70, 23), 'right');
  assert.equal(swipeDirection(-70, 23), 'left');
  assert.equal(swipeDirection(3, -50), 'up');
  assert.equal(swipeDirection(3, 50), 'down');
});
for (const level of levels) test(`level ${level.id} solver produces a fully painted legal replay`, () => {
  const solution = solve(level);
  assert.ok(solution, 'must be solvable');
  let state = initialGame(level);
  for (const direction of solution) {
    const path = slide(level, state.position, direction);
    assert.ok(path.length);
    assert.deepEqual(animationPlan(state.position, path).destination, path.at(-1));
    for (const tile of path) assert.equal(level.grid[tile.row]?.[tile.col], '.');
    state = commitSlide(state, path);
  }
  assert.equal(complete(level, state), true);
  assert.equal(state.painted.length, floorTiles(level).length);
  assert.ok(state.painted.includes(key(level.start)));
});
test('solver rejects a connected maze whose middle branch cannot be reached', () => {
  const impossible: Level = { id:0, name:'Impossible', start:{row:0,col:0}, grid:['...', '#.#', '#.#'] };
  assert.equal(solve(impossible), null);
});

/** Rating boundaries, non-destructive migrations, and monotonic replay/save achievements. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ratingThresholds, starsForMoves } from '../src/game/ratings';
import { completeLevel, emptyProgress, mergeProgress, parseProgress, totalStars } from '../src/game/progression';
import { levels } from '../src/game/levels';

test('rating thresholds give short puzzles breathing room and define both boundaries for every maze', () => {
  assert.deepEqual(ratingThresholds(5), { three: 6, two: 8 });
  assert.deepEqual(ratingThresholds(11), { three: 13, two: 17 });
  assert.deepEqual(ratingThresholds(33), { three: 39, two: 50 });
  for (const level of levels) {
    const optimal = level.minimumMoves, { three, two } = ratingThresholds(optimal);
    assert.equal(starsForMoves(optimal, optimal), 3); assert.equal(starsForMoves(three, optimal), 3);
    assert.equal(starsForMoves(three + 1, optimal), 2); assert.equal(starsForMoves(two, optimal), 2);
    assert.equal(starsForMoves(two + 1, optimal), 1); assert.equal(starsForMoves(10000, optimal), 1);
  }
  for (const invalid of [0, -1, 1.5, NaN, Infinity]) assert.throws(() => ratingThresholds(invalid), RangeError);
  for (const invalid of [0, 4, 5.5, NaN, Infinity]) assert.throws(() => starsForMoves(invalid, 5), RangeError);
});
test('old completions earn one baseline star without inventing historical move counts', () => {
  for (const raw of ['{"unlocked":3,"finished":true}', '{"version":2,"unlocked":4,"completed":[1,2,3],"finished":false}']) {
    const migrated = parseProgress(raw, 20);
    assert.equal(migrated.version, 3); assert.equal(migrated.unlocked, 4); assert.equal(migrated.finished, false);
    assert.equal(totalStars(migrated), 3);
    for (const id of [1, 2, 3]) assert.deepEqual(migrated.records[id], { bestMoves: null, stars: 1 });
    assert.deepEqual(parseProgress(JSON.stringify(migrated), 20), migrated);
  }
});
test('replay improves best moves and stars independently while slower replays retain all achievements', () => {
  let progress = completeLevel(emptyProgress, 0, 20, { moves: 10, optimalMoves: 5 });
  assert.deepEqual(progress.records[1], { bestMoves: 10, stars: 1 });
  progress = completeLevel(progress, 0, 20, { moves: 8, optimalMoves: 5 });
  assert.deepEqual(progress.records[1], { bestMoves: 8, stars: 2 });
  progress = completeLevel(progress, 0, 20, { moves: 6, optimalMoves: 5 });
  assert.deepEqual(progress.records[1], { bestMoves: 6, stars: 3 });
  assert.equal(completeLevel(progress, 0, 20, { moves: 12, optimalMoves: 5 }), progress);
  assert.equal(completeLevel(progress, 0, 20, { moves: 6, optimalMoves: 5 }), progress);
  progress = completeLevel(progress, 0, 20, { moves: 5, optimalMoves: 5 });
  assert.deepEqual(progress.completed, [1]); assert.equal(progress.unlocked, 2);
  assert.deepEqual(progress.records[1], { bestMoves: 5, stars: 3 });
  assert.equal(totalStars(progress), 3); assert.deepEqual(parseProgress(JSON.stringify(progress), 20), progress);
});
test('locked and invalid results cannot grant completion or ratings', () => {
  assert.equal(completeLevel(emptyProgress, 19, 20, { moves: 33, optimalMoves: 33 }), emptyProgress);
  for (const moves of [0, 4, 5.5, NaN, Infinity]) assert.equal(completeLevel(emptyProgress, 0, 20, { moves, optimalMoves: 5 }), emptyProgress);
});
test('malformed per-level records never erase valid completed levels or unlocks', () => {
  const progress = parseProgress(JSON.stringify({ version: 3, unlocked: 5, completed: [1, 2, 3, 4], records: {
    1: { bestMoves: 6, stars: 3 }, 2: { bestMoves: -2, stars: 99 },
    3: { bestMoves: '8', stars: 2.5 }, 4: null, 20: { bestMoves: 33, stars: 3 },
  } }), 20);
  assert.equal(progress.unlocked, 5); assert.deepEqual(progress.completed, [1, 2, 3, 4]);
  assert.deepEqual(progress.records[1], { bestMoves: 6, stars: 3 });
  for (const id of [2, 3, 4]) assert.deepEqual(progress.records[id], { bestMoves: null, stars: 1 });
  assert.equal(progress.records[20], undefined); assert.equal(totalStars(progress), 6);
});
test('recovering storage and late queued saves retain the lowest moves and highest historical stars', () => {
  const older = completeLevel(emptyProgress, 0, 20, { moves: 10, optimalMoves: 5 });
  const newer = completeLevel(older, 0, 20, { moves: 5, optimalMoves: 5 });
  for (const merged of [mergeProgress(older, newer, 20), mergeProgress(newer, older, 20)]) {
    assert.deepEqual(merged.records[1], { bestMoves: 5, stars: 3 });
    assert.deepEqual(merged.completed, [1]); assert.equal(merged.unlocked, 2);
  }
  const historic = parseProgress('{"version":3,"unlocked":2,"completed":[1],"records":{"1":{"bestMoves":8,"stars":3}}}', 20);
  const merged = mergeProgress(historic, newer, 20);
  assert.deepEqual(merged.records[1], { bestMoves: 5, stars: 3 });
});
test('the complete campaign awards at most sixty stars and replays cannot lower the total', () => {
  let progress = emptyProgress;
  for (const [index, level] of levels.entries()) progress = completeLevel(progress, index, 20, { moves: level.minimumMoves, optimalMoves: level.minimumMoves });
  assert.equal(totalStars(progress), 60); assert.equal(progress.finished, true);
  const replayed = completeLevel(progress, 0, 20, { moves: 40, optimalMoves: 5 });
  assert.equal(replayed, progress); assert.equal(totalStars(parseProgress(JSON.stringify(progress), 20)), 60);
});

/** Campaign structure, exact solver targets, migration, unlocks, and phone-layout regressions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { levels, stages, stageForLevel } from '../src/game/levels';
import { complete, commitSlide, floorTiles, initialGame, slide } from '../src/game/engine';
import { solve } from '../src/game/solver';
import { canPlayLevel, completeLevel, continueIndex, emptyProgress, levelStatus, nextLevelIndex, parseProgress } from '../src/game/progression';
import * as model from '../src/game/progression';
import { fitBoardWidth } from '../src/components/paintGeometry';

test('20 original layouts form four ordered difficulty stages with stable IDs', () => {
  assert.equal(levels.length, 20); assert.deepEqual(levels.map(l => l.id), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.deepEqual(stages.map(s => s.name), ['Beginner', 'Intermediate', 'Advanced', 'Expert']);
  assert.ok(stages.every(s => s.levels.length === 5));
  const signatures = new Set<string>();
  for (const level of levels) {
    assert.equal(level.grid.length > 0, true); assert.ok(level.grid.every(row => row.length === level.grid[0]!.length && /^[.#]+$/.test(row)));
    assert.ok(stageForLevel(level.id)); assert.ok(level.focus.length > 10);
    // Reject rotated/reflected copies too, rather than accepting renamed layouts as new puzzles.
    let rows = level.grid.map(row => [...row]); const variants: string[] = [];
    for (let i = 0; i < 4; i++) {
      variants.push(rows.map(r => r.join('')).join('/'), rows.map(r => r.slice().reverse().join('')).join('/'));
      rows = rows[0]!.map((_, c) => rows.map(row => row[c]!).reverse());
    }
    const canonical = variants.sort()[0]!; assert.ok(!signatures.has(canonical), 'Duplicate topology: ' + level.name); signatures.add(canonical);
  }
});
test('the original three levels retain exactly their layouts, names, starts, and order', () => {
  assert.deepEqual(levels.slice(0, 3).map(({ id, name, grid, start }) => ({ id, name, grid, start })), [
    { id: 1, name: 'First light', start: { row: 0, col: 0 }, grid: ['.....','####.','.....','.####','.....'] },
    { id: 2, name: 'Around the bend', start: { row: 0, col: 0 }, grid: ['......','.####.','.#....','.#.###','.#....','....#.'] },
    { id: 3, name: 'The quiet labyrinth', start: { row: 0, col: 0 }, grid: ['.......','.#.###.','.#...#.','.#.#.#.','.#...#.','.###.#.','.....#.'] },
  ]);
});
test('every stored minimum is an exact shortest legal full-paint solution and difficulty never steps backwards', () => {
  let previous = 0;
  for (const level of levels) {
    const moves = solve(level); assert.ok(moves, 'Unsolvable: ' + level.id);
    assert.equal(moves.length, level.minimumMoves, 'Stale minimum: ' + level.id);
    assert.ok(moves.length >= previous); previous = moves.length;
    let game = initialGame(level);
    for (const direction of moves) { const path = slide(level, game.position, direction); assert.ok(path.length); game = commitSlide(game, path); }
    assert.ok(complete(level, game));
  }
  const means = stages.map(s => s.levels.reduce((sum, l) => sum + l.minimumMoves, 0) / 5);
  const area = stages.map(s => s.levels.reduce((sum, l) => sum + floorTiles(l).length, 0) / 5);
  for (let i = 1; i < 4; i++) { assert.ok(means[i]! > means[i - 1]!); assert.ok(area[i]! > area[i - 1]!); }
});
test('legacy players who finished Level 3 keep three completions and continue at Level 4', () => {
  const progress = parseProgress('{"unlocked":3,"finished":true}', 20);
  assert.deepEqual(progress, { version: 3, unlocked: 4, completed: [1, 2, 3], finished: false, records: { 1: { bestMoves: null, stars: 1 }, 2: { bestMoves: null, stars: 1 }, 3: { bestMoves: null, stars: 1 } } });
  assert.equal(continueIndex(progress, 20), 3); assert.equal(levelStatus(progress, 2, 20), 'completed');
  assert.equal(levelStatus(progress, 3, 20), 'unlocked'); assert.equal(levelStatus(progress, 4, 20), 'locked');
  assert.deepEqual(parseProgress(JSON.stringify(progress), 20), progress);
});
test('partial legacy saves infer only levels known to have been completed', () => {
  assert.deepEqual(parseProgress('{"unlocked":2,"finished":false}', 20).completed, [1]);
  assert.deepEqual(parseProgress('{"unlocked":3,"finished":false}', 20).completed, [1, 2]);
  assert.equal(parseProgress('{"unlocked":999}', 20).unlocked, 3);
  for (const raw of [null, '', '{', 'null', '[]', 'false']) assert.deepEqual(parseProgress(raw, 20), emptyProgress);
});
test('modern completed IDs are validated and finished is derived from all twenty levels', () => {
  const progress = parseProgress('{"version":2,"unlocked":2,"completed":[3,1,1,99,-1,"2",2.5],"finished":true}', 20);
  assert.deepEqual(progress.completed, [1, 3]); assert.equal(progress.finished, false); assert.equal(progress.unlocked, 4);
  assert.equal(continueIndex(progress, 20), 1);
  assert.equal(parseProgress('{"version":2,"unlocked":20,"completed":[],"finished":true}', 20).finished, false);
});
test('completions unlock one subsequent level, permit replay, and never duplicate progress', () => {
  let progress = emptyProgress;
  assert.equal(completeLevel(progress, 1, 20), progress); assert.equal(nextLevelIndex(progress, 0, 20), null);
  for (let index = 0; index < 20; index++) {
    assert.ok(canPlayLevel(progress, index, 20));
    progress = completeLevel(progress, index, 20);
    assert.equal(progress.completed.length, index + 1); assert.equal(progress.unlocked, Math.min(20, index + 2));
    assert.equal(completeLevel(progress, 0, 20), progress);
    assert.deepEqual(parseProgress(JSON.stringify(progress), 20), progress);
    assert.equal(nextLevelIndex(progress, index, 20), index === 19 ? null : index + 1);
  }
  assert.equal(progress.finished, true); assert.equal(continueIndex(progress, 20), 0);
  for (const index of [-1, 20, 100, 0.5, NaN, Infinity]) assert.equal(canPlayLevel(progress, index, 20), false);
});
test('phone sizing contains square and rectangular mazes on both axes without negative dimensions', () => {
  for (const width of [0, 280, 320, 430, 768]) for (const height of [0, 160, 320, 680]) for (const level of levels) {
    const cols = level.grid[0]!.length, rows = level.grid.length, size = fitBoardWidth(cols, rows, width, height);
    assert.ok(Number.isFinite(size) && size >= 0 && size <= 480);
    assert.ok(size <= Math.max(0, width - 24) + 1e-8); assert.ok(size / cols * rows <= Math.max(0, height - 24) + 1e-8);
  }
});
test('the existing storage key loads legacy data non-destructively and round-trips the migrated completion record', async () => {
  const compiled = ts.transpileModule(readFileSync('src/storage/progression.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  let raw = '{"unlocked":3,"finished":true}'; let writes = 0; let readFails = false;
  const exports = {} as { PROGRESS_KEY: string; loadProgress: (count: number) => Promise<model.Progress>; saveProgress: (p: model.Progress, count: number) => Promise<model.Progress> };
  runInNewContext(compiled, { exports, require: (name: string) => {
    if (name === '../game/progression') return model;
    if (name === '@react-native-async-storage/async-storage') return { __esModule: true, default: {
      getItem: async (key: string) => { assert.equal(key, '@chromaze/progression/v1'); if (readFails) throw Error('Unavailable'); return raw; },
      setItem: async (_key: string, value: string) => { writes++; raw = value; },
    } };
    throw Error(name);
  } });
  const migrated = await exports.loadProgress(20); assert.equal(writes, 0); assert.equal(migrated.unlocked, 4);
  const next = completeLevel(migrated, 3, 20); await exports.saveProgress(next, 20);
  assert.equal(writes, 1); assert.deepEqual(await exports.loadProgress(20), next);
  readFails = true;
  await assert.rejects(exports.saveProgress(emptyProgress, 20)); assert.equal(writes, 1);
  readFails = false;
  const retained = await exports.saveProgress(completeLevel(emptyProgress, 0, 20), 20);
  assert.deepEqual(retained.completed, [1, 2, 3, 4]); assert.equal(retained.unlocked, 5);
  const improved = completeLevel(retained, 0, 20, { moves: 5, optimalMoves: 5 });
  await exports.saveProgress(improved, 20);
  const recovered = await exports.saveProgress(retained, 20);
  assert.deepEqual(recovered.records[1], { bestMoves: 5, stars: 3 });
  assert.deepEqual((await exports.loadProgress(20)).records[1], recovered.records[1]);
});

test('merging a recovered save retains disk achievements and newer session completions', () => {
  const disk = parseProgress('{"unlocked":3,"finished":true}', 20);
  const session = completeLevel(emptyProgress, 0, 20);
  const recovered = model.mergeProgress(disk, session, 20);
  assert.deepEqual(recovered.completed, [1, 2, 3]); assert.equal(recovered.unlocked, 4);
  const newer = completeLevel(recovered, 3, 20);
  assert.deepEqual(model.mergeProgress(newer, recovered, 20).completed, [1, 2, 3, 4]);
});

/** Offline authoring safety, solver outcomes, transformed duplicates, and stable catalog lookups. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { analyzeLevel, analyzeCampaign, compareLayouts, parseAscii, markdownReport } from '../scripts/level-tools/analysis';
import { createLevelCatalog } from '../src/game/catalog';
import { levels, stages, catalog } from '../src/game/levels';

const line = { id: 21, name: 'A new line', focus: 'Read a simple wall stop.', grid: ['...'], start: { row: 0, col: 0 }, minimumMoves: 1 };
test('ASCII authoring preserves rectangular geometry and validates exactly one start', () => {
  assert.deepEqual(parseAscii('@..#\r\n##..\r\n'), { grid: ['...#', '##..'], start: { row: 0, col: 0 } });
  for (const input of ['', '...', '@@.', '@x.', '@..\n..', '@ .']) {
    assert.throws(() => parseAscii(input));
  }
});
test('malformed layout and metadata are reported without invoking the solver', () => {
  for (const draft of [null, {}, { ...line, id: 0 }, { ...line, id: 1.5 }, { ...line, name: '' }, { ...line, focus: '' },
    { ...line, grid: [] }, { ...line, grid: ['..', '.'] }, { ...line, grid: ['.x.'] }, { ...line, grid: ['###'] },
    { ...line, start: { row: 0, col: 9 } }, { ...line, start: { row: 0, col: 0.5 } },
    { ...line, grid: ['#..'] }, { ...line, minimumMoves: 0 }, { ...line, grid: ['.#.'] }]) {
    const result = analyzeLevel(draft); assert.equal(result.status, 'invalid'); assert.equal(result.optimalMoves, null); assert.ok(result.errors.length);
  }
});
test('analysis distinguishes solvability, stale minima, and budget exhaustion and reports useful metrics', () => {
  const result = analyzeLevel(line);
  assert.equal(result.status, 'valid'); assert.equal(result.columns, 3); assert.equal(result.rows, 1);
  assert.equal(result.floorCount, 3); assert.equal(result.optimalMoves, 1); assert.equal(result.estimatedDifficulty, 'Beginner');
  assert.equal(analyzeLevel({ ...line, minimumMoves: 2 }).status, 'invalid');
  assert.equal(analyzeLevel({ ...line, minimumMoves: undefined }, { verifyMinimum: false }).optimalMoves, 1);
  const impossible = analyzeLevel({ ...line, grid: ['...', '...', '...'] });
  assert.equal(impossible.status, 'unsolvable'); assert.equal(impossible.optimalMoves, null);
  const limited = analyzeLevel(line, { solverLimit: 1 }); assert.equal(limited.status, 'state-limit'); assert.equal(limited.optimalMoves, null);
});
test('duplicate comparison ignores names, start choices, padding, rotation, and reflection', () => {
  const original = { ...line, grid: ['..#.', '.#..', '....'] };
  let rows = original.grid.map(row => [...row]);
  for (let i = 0; i < 4; i++) {
    for (const grid of [rows.map(r => r.join('')), rows.map(r => r.slice().reverse().join(''))]) {
      const match = compareLayouts(original, { ...line, id: 22, grid }); assert.equal(match?.kind, 'duplicate'); assert.equal(match?.similarity, 1);
    }
    rows = rows[0]!.map((_, col) => rows.map(row => row[col]!).reverse());
  }
  const padded = { ...line, grid: ['######', '#..#.#', '#.#..#', '#....#', '######'], start: { row: 1, col: 1 } };
  assert.equal(compareLayouts(original, padded)?.kind, 'duplicate');
});
test('near duplicates use floor overlap rather than counting matching walls', () => {
  const ring = { ...line, grid: ['....', '.##.', '.##.', '....'] };
  const changed = { ...line, id: 22, grid: ['....', '..#.', '.##.', '....'] };
  const match = compareLayouts(ring, changed); assert.equal(match?.kind, 'near'); assert.equal(match?.changedCells, 1); assert.ok(match!.similarity >= 0.9);
  assert.equal(compareLayouts(ring, { ...line, grid: ['....', '....', '....', '....'] }), null);
});
test('campaign analysis aggregates all errors and emits a report without changing production data', () => {
  const report = analyzeCampaign(levels); assert.equal(report.levels.length, 20); assert.deepEqual(report.errors, []);
  assert.ok(report.levels.every(row => row.status === 'valid' && row.optimalMoves !== null));
  const markdown = markdownReport(report); assert.match(markdown, /Floor/); assert.match(markdown, /Optimal/); assert.match(markdown, /Estimated/);
  const broken = analyzeCampaign([levels[0], { ...line, id: 1 }, { ...line, id: 4, grid: ['.#.'] }]);
  assert.ok(broken.errors.some(message => /ID/.test(message))); assert.ok(broken.levels.some(row => row.status === 'invalid'));
});
test('catalog interface preserves stable one-based IDs and can index hundreds of stage entries', () => {
  assert.equal(catalog.getLevel(1), levels[0]); assert.equal(catalog.stageForLevel(20)?.name, 'Expert');
  assert.equal(catalog.getLevel(0), undefined); assert.equal(catalog.getLevel(21), undefined);
  const source = Array.from({ length: 25 }, (_, group) => ({ id: 'world-' + group, name: 'World ' + group, description: 'Five authored puzzles.',
    levels: Array.from({ length: 5 }, (_, i) => ({ ...line, id: group * 5 + i + 1 })) }));
  const expanded = createLevelCatalog(source); assert.equal(expanded.levels.length, 125); assert.equal(expanded.getLevel(125)?.id, 125);
  assert.equal(expanded.stageForLevel(125)?.id, 'world-24');
  assert.throws(() => createLevelCatalog([{ ...stages[0]!, levels: [{ ...line, id: 2 }] }]), /ID/);
  assert.throws(() => createLevelCatalog([stages[0]!, stages[0]!]), /stage/i);
});
test('CLI authors verified JSON safely, validates candidates, and returns failure for invalid data', () => {
  const folder = mkdtempSync(join(tmpdir(), 'chromaze-author-'));
  const input = join(folder, 'maze.txt'), output = join(folder, 'level.json');
  const run = (args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'scripts/levels.ts', ...args], { encoding: 'utf8', timeout: 30000 });
  try {
    writeFileSync(input, '@..');
    const args = ['author', '--input', input, '--output', output, '--id', '21', '--name', 'A new line', '--focus', 'Read a simple wall stop.'];
    const authored = run(args); assert.equal(authored.status, 0, authored.stderr);
    const saved = readFileSync(output, 'utf8'); assert.deepEqual(JSON.parse(saved), line);
    assert.notEqual(run(args).status, 0); assert.equal(readFileSync(output, 'utf8'), saved);
    assert.equal(run(['validate', '--input', output]).status, 0);
    const strict = run(['validate', '--strict', '--json']); assert.notEqual(strict.status, 0);
    assert.ok(JSON.parse(strict.stdout).similar.some((pair: { kind: string }) => pair.kind === 'near'));
    writeFileSync(output, JSON.stringify({ ...levels[0], id: 21 })); assert.notEqual(run(['validate', '--input', output]).status, 0);
    writeFileSync(output, JSON.stringify({ ...line, minimumMoves: 4 })); assert.notEqual(run(['validate', '--input', output]).status, 0);
    writeFileSync(input, '@..\n...\n...'); assert.notEqual(run(['author', '--input', input, '--id', '22', '--name', 'Impossible', '--focus', 'Try the center.']).status, 0);
    assert.notEqual(run(['validate', '--unexpected']).status, 0);
    assert.notEqual(run(['validate', '--limit', '0']).status, 0);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

test('production entry graph never imports developer tools, the solver, or Node builtins', () => {
  const pending = [resolve('App.tsx')], seen = new Set<string>();
  while (pending.length) {
    const file = pending.pop()!; if (seen.has(file)) continue; seen.add(file);
    assert.ok(!file.includes(resolve('scripts')) && !file.endsWith(join('game', 'solver.ts')), file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*\(|require\s*\()['"]([^'"]+)['"]/g)) {
      const target = match[1]!; assert.ok(!target.startsWith('node:'), file);
      if (!target.startsWith('.')) continue;
      const base = resolve(dirname(file), target), resolved = [base + '.ts', base + '.tsx', join(base, 'index.ts'), join(base, 'index.tsx')].find(existsSync);
      if (resolved) pending.push(resolved);
    }
  }
  assert.ok(seen.has(resolve('src/game/catalog.ts'))); assert.ok(seen.has(resolve('src/game/stages/index.ts')));
});

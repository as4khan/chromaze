/** Offline maze validation, exact solver analysis, and orientation-independent layout comparisons. */
import { Level, Point, commitSlide, complete, floorTiles, initialGame, isFloor, key, slide } from '../../src/game/engine';
import { solve } from '../../src/game/solver';
import { CampaignLevel } from '../../src/game/stages/types';

export type Analysis = {
  id: number | null; name: string; columns: number; rows: number; floorCount: number; optimalMoves: number | null;
  estimatedDifficulty: string; status: 'valid' | 'invalid' | 'unsolvable' | 'state-limit'; errors: string[];
};
export type Similarity = { kind: 'duplicate' | 'near'; similarity: number; changedCells: number };
export type CampaignAnalysis = { levels: Analysis[]; errors: string[]; similar: (Similarity & { first: number; second: number })[] };

/** Reject malformed/unsafe inputs before the engine or exponential solver sees them. */
function layoutErrors(input: unknown, verifyMinimum: boolean): string[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['Level must be an object'];
  const value = input as Partial<CampaignLevel>, errors: string[] = [];
  if (!Number.isSafeInteger(value.id) || value.id! < 1) errors.push('ID must be a positive integer');
  for (const field of ['name', 'focus'] as const) if (typeof value[field] !== 'string' || !value[field]!.trim()) errors.push(field + ' must be nonempty text');
  if (verifyMinimum && (!Number.isSafeInteger(value.minimumMoves) || value.minimumMoves! < 1)) errors.push('minimumMoves must be a positive integer');
  if (!Array.isArray(value.grid) || !value.grid.length || !value.grid.every(row => typeof row === 'string' && row.length > 0 && /^[.#]+$/.test(row) && row.length === value.grid![0]!.length)) {
    errors.push('Grid must be nonempty rectangular rows containing only . and #'); return errors;
  }
  if (!value.start || !Number.isInteger(value.start.row) || !Number.isInteger(value.start.col) || !isFloor(value as Level, value.start)) {
    errors.push('Start must be an integer coordinate on a floor tile'); return errors;
  }
  const tiles = floorTiles(value as Level);
  if (tiles.length < 2) errors.push('A playable maze needs at least two floor tiles');
  // Walking connectivity is a cheap prerequisite; only the slide-and-paint solver proves solvability.
  const queue: Point[] = [value.start], seen = new Set([key(value.start)]);
  for (let i = 0; i < queue.length; i++) for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
    const point = { row: queue[i]!.row + dr, col: queue[i]!.col + dc };
    if (isFloor(value as Level, point) && !seen.has(key(point))) { seen.add(key(point)); queue.push(point); }
  }
  if (seen.size !== tiles.length) errors.push('Floor tiles are disconnected from the start');
  return errors;
}

/** Convert an ASCII draft: @ is the single start, . is floor, # is wall; CRLF is accepted. */
export function parseAscii(text: string): { grid: string[]; start: Point } {
  const rows = text.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
  if (!rows[0]?.length || !rows.every(row => row.length === rows[0]!.length && /^[.@#]+$/.test(row))) throw new Error('ASCII grid must be rectangular and contain only @, ., and #');
  const starts: Point[] = [];
  rows.forEach((row, r) => [...row].forEach((tile, col) => { if (tile === '@') starts.push({ row: r, col }); }));
  if (starts.length !== 1) throw new Error('ASCII grid needs exactly one @ start');
  return { grid: rows.map(row => row.replace('@', '.')), start: starts[0]! };
}

/** Move-based stage estimate matches the current campaign bands, not a claim of human-tested difficulty. */
export const estimateDifficulty = (moves: number): string => moves <= 13 ? 'Beginner' : moves <= 18 ? 'Intermediate' : moves <= 22 ? 'Advanced' : 'Expert';

/** Bound each search independently; an exhausted budget is unknown, never proof of an unsolvable maze. */
export function analyzeLevel(input: unknown, { verifyMinimum = true, solverLimit = 300000 } = {}): Analysis {
  if (!Number.isSafeInteger(solverLimit) || solverLimit < 1) throw new Error('Solver limit must be a positive integer');
  const errors = layoutErrors(input, verifyMinimum), value = input as CampaignLevel | null;
  const result: Analysis = { id: Number.isSafeInteger(value?.id) ? value!.id : null, name: typeof value?.name === 'string' ? value.name : 'Invalid level',
    columns: 0, rows: 0, floorCount: 0, optimalMoves: null, estimatedDifficulty: 'Unrated', status: 'invalid', errors };
  if (errors.length) return result;
  const level = value!;
  result.columns = level.grid[0]!.length; result.rows = level.grid.length; result.floorCount = floorTiles(level).length;
  try {
    const solution = solve(level, solverLimit);
    if (!solution) { result.status = 'unsolvable'; result.errors.push('No full-paint slide solution exists'); return result; }
    let game = initialGame(level);
    for (const direction of solution) {
      const path = slide(level, game.position, direction);
      if (!path.length) throw new Error('Solver replay contained a blocked move');
      game = commitSlide(game, path);
    }
    if (!complete(level, game)) throw new Error('Solver replay did not paint every floor tile');
    result.optimalMoves = solution.length; result.estimatedDifficulty = estimateDifficulty(solution.length);
    if (verifyMinimum && level.minimumMoves !== solution.length) result.errors.push('Stale minimumMoves: stored ' + level.minimumMoves + ', solved ' + solution.length);
    result.status = result.errors.length ? 'invalid' : 'valid';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.status = message.startsWith('Solver exceeded ') ? 'state-limit' : 'invalid'; result.errors.push(message);
  }
  return result;
}

/** Trim all-wall outer padding so adding an empty frame cannot disguise a copied layout. */
function trimmedGrid(level: Level): string[] {
  const tiles = floorTiles(level);
  const top = Math.min(...tiles.map(p => p.row)), bottom = Math.max(...tiles.map(p => p.row));
  const left = Math.min(...tiles.map(p => p.col)), right = Math.max(...tiles.map(p => p.col));
  return level.grid.slice(top, bottom + 1).map(row => row.slice(left, right + 1));
}
/** Compare all eight square symmetries, including rectangular 90-degree rotations; starts are ignored. */
export function compareLayouts(first: Level, second: Level): Similarity | null {
  const base = trimmedGrid(first); let rows = trimmedGrid(second).map(row => [...row]);
  let best: Similarity | null = null;
  for (let turn = 0; turn < 4; turn++) {
    for (const candidate of [rows, rows.map(row => row.slice().reverse())]) {
      // shortcut: near matches require equal trimmed dimensions; add topology matching if scaled copies become common.
      if (candidate.length !== base.length || candidate[0]!.length !== base[0]!.length) continue;
      let intersection = 0, floorSum = 0, changedCells = 0;
      base.forEach((row, r) => [...row].forEach((cell, c) => {
        const a = cell === '.', b = candidate[r]![c] === '.';
        floorSum += Number(a) + Number(b); if (a && b) intersection++; if (a !== b) changedCells++;
      }));
      const similarity = floorSum ? 2 * intersection / floorSum : 0;
      if (!changedCells) return { kind: 'duplicate', similarity: 1, changedCells: 0 };
      // Floor Dice overlap avoids high scores caused by large, mostly-wall grids.
      if (similarity >= 0.9 && (!best || similarity > best.similarity)) best = { kind: 'near', similarity, changedCells };
    }
    rows = rows[0]!.map((_, col) => rows.map(row => row[col]!).reverse());
  }
  return best;
}

/** Analyze every row and pair; accumulate failures so one bad draft does not hide the next. */
export function analyzeCampaign(inputs: readonly unknown[], solverLimit = 300000): CampaignAnalysis {
  const levels = inputs.map(input => analyzeLevel(input, { solverLimit }));
  const errors = levels.flatMap((level, index) => level.errors.map(error => 'Level ' + (level.id ?? 'at row ' + (index + 1)) + ': ' + error));
  const ids = levels.map(level => level.id).filter((id): id is number => id !== null).sort((a, b) => a - b);
  if (!inputs.length || ids.some((id, index) => id !== index + 1)) errors.push('Campaign IDs must be unique and consecutive from 1; never renumber published levels');
  const similar: CampaignAnalysis['similar'] = [];
  const comparable = inputs.map(input => layoutErrors(input, false).length === 0);
  for (let i = 0; i < inputs.length; i++) for (let j = i + 1; j < inputs.length; j++) {
    if (!comparable[i] || !comparable[j]) continue;
    const match = compareLayouts(inputs[i] as Level, inputs[j] as Level);
    if (match) {
      const pair = { ...match, first: (inputs[i] as Level).id, second: (inputs[j] as Level).id }; similar.push(pair);
      if (pair.kind === 'duplicate') errors.push('Duplicate layouts: levels ' + pair.first + ' and ' + pair.second);
    }
  }
  return { levels, errors, similar };
}

/** A stable Markdown report can be committed/reviewed; JSON output uses the same analysis object. */
export function markdownReport(report: CampaignAnalysis): string {
  const safe = (text: string) => text.replace(/\|/g, '\\|').replace(/[\r\n]/g, ' ');
  const rows = report.levels.map(level => '| ' + [level.id ?? '?', safe(level.name), level.columns + ' × ' + level.rows, level.floorCount,
    level.optimalMoves ?? 'Unknown', level.estimatedDifficulty, level.status].join(' | ') + ' |');
  return ['# Chromaze level analysis', '', '| ID | Name | Grid | Floor | Optimal moves | Estimated difficulty | Status |',
    '| --- | --- | --- | --- | --- | --- | --- |', ...rows, '', 'Difficulty is a move-count estimate: Beginner ≤13, Intermediate ≤18, Advanced ≤22, Expert >22. Playtesting is still required.',
    '', '## Validation errors', '', ...(report.errors.length ? report.errors.map(error => '- ' + safe(error)) : ['None.']),
    '', '## Layout similarity', '', ...(report.similar.length ? report.similar.map(pair => '- Levels ' + pair.first + ' / ' + pair.second + ': ' + pair.kind + ', ' + (pair.similarity * 100).toFixed(1) + '% floor overlap, ' + pair.changedCells + ' changed cells.') : ['No exact or ≥90% near matches.']),
    '', 'Comparison ignores start position and all-wall outer padding, and checks rotations/reflections at equal normalized dimensions. Near matches need design review; scaled or reshaped copies can escape this heuristic.', ''].join('\n');
}

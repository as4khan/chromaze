/** Developer-only CLI for ASCII authoring, batch validation, and Markdown/JSON campaign analysis. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stages } from '../src/game/stages';
import { CampaignLevel } from '../src/game/stages/types';
import { analyzeCampaign, analyzeLevel, compareLayouts, markdownReport, parseAscii } from './level-tools/analysis';

// Validation must still run when a draft breaks the stricter production catalog's ID ordering.
const levels = stages.flatMap(stage => stage.levels);

/** Keep parsing explicit: misspelled flags and invalid budgets must fail instead of silently skipping checks. */
function options(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i]!;
    if (!['--input', '--output', '--id', '--name', '--focus', '--limit', '--strict', '--json'].includes(key)) throw new Error('Unknown option: ' + key);
    if (key in result) throw new Error('Repeated option: ' + key);
    if (key === '--strict' || key === '--json') result[key] = true;
    else { const value = args[++i]; if (!value || value.startsWith('--')) throw new Error('Missing value for ' + key); result[key] = value; }
  }
  return result;
}

function required(flags: Record<string, string | boolean>, key: string): string {
  const value = flags[key]; if (typeof value !== 'string' || !value.trim()) throw new Error('Required option: ' + key); return value;
}

/** CLI failures leave drafts and production data intact; authored files are created exclusively, never overwritten. */
function main(): void {
  const [command, ...args] = process.argv.slice(2);
  if (command === '--help' || command === 'help' || !command) {
    console.log('levels validate|report [--input candidate.json] [--output report.md] [--json] [--strict] [--limit 300000]\n' +
      'levels author --input maze.txt --id 21 --name "Maze name" --focus "Puzzle intent" [--output level.json] [--strict] [--limit 300000]'); return;
  }
  if (!['author', 'validate', 'report'].includes(command)) throw new Error('Unknown command: ' + command);
  const flags = options(args), limit = flags['--limit'] === undefined ? 300000 : Number(flags['--limit']);
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Solver limit must be a positive integer');
  const input = typeof flags['--input'] === 'string' ? resolve(flags['--input']) : null;
  const output = typeof flags['--output'] === 'string' ? resolve(flags['--output']) : null;
  if (input && output === input) throw new Error('Input and output must be different files');
  if (command === 'author') {
    if (flags['--json']) throw new Error('Author already emits JSON; --json is only for analysis');
    const draft = { id: Number(required(flags, '--id')), name: required(flags, '--name'), focus: required(flags, '--focus'),
      ...parseAscii(readFileSync(required(flags, '--input'), 'utf8')) };
    if (levels.some(level => level.id === draft.id)) throw new Error('ID is already published; existing levels must remain unchanged');
    const analysis = analyzeLevel(draft, { verifyMinimum: false, solverLimit: limit });
    if (analysis.status !== 'valid') throw new Error(analysis.status + ': ' + analysis.errors.join('; '));
    const level: CampaignLevel = { ...draft, minimumMoves: analysis.optimalMoves! };
    const matches = levels.flatMap(existing => { const match = compareLayouts(existing, level); return match ? [{ id: existing.id, ...match }] : []; });
    for (const match of matches) console.error('Layout ' + match.kind + ' of published level ' + match.id + ' (' + (match.similarity * 100).toFixed(1) + '% overlap)');
    if (matches.some(match => match.kind === 'duplicate' || flags['--strict'])) throw new Error('Draft needs layout review; no file written');
    const json = JSON.stringify(level, null, 2) + '\n';
    if (output) { writeFileSync(output, json, { flag: 'wx' }); console.log('Created ' + output + ' (' + level.minimumMoves + ' optimal moves)'); }
    else process.stdout.write(json);
    return;
  }
  for (const key of ['--id', '--name', '--focus']) if (flags[key] !== undefined) throw new Error(key + ' is only for author');
  // Candidate JSON supplements the published catalog, so duplicate/ID checks include existing levels and other drafts.
  const candidates: unknown = input ? JSON.parse(readFileSync(input, 'utf8')) : [];
  const report = analyzeCampaign([...levels, ...(Array.isArray(candidates) ? candidates : [candidates])], limit);
  // Stages are scalable data files, but duplicate/empty stage IDs and metadata still need publication checks.
  const stageIds = new Set<string>();
  for (const stage of stages) {
    if (stageIds.has(stage.id) || !stage.id.trim() || !stage.name.trim() || !stage.description.trim()) report.errors.push('Invalid or duplicate stage metadata: ' + stage.id);
    stageIds.add(stage.id);
  }
  const content = flags['--json'] ? JSON.stringify(report, null, 2) + '\n' : markdownReport(report);
  if (output) { writeFileSync(output, content); console.log('Report written to ' + output); }
  else process.stdout.write(content);
  if (report.errors.length || (flags['--strict'] && report.similar.some(pair => pair.kind === 'near'))) process.exitCode = 1;
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }

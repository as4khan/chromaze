/** Pure campaign progress, personal records, and non-destructive legacy save migration. */
import { StarRating, starsForMoves } from './ratings';
export type LevelRecord = Readonly<{ bestMoves: number | null; stars: StarRating }>;
export type Progress = Readonly<{ version: 3; unlocked: number; completed: readonly number[]; finished: boolean; records: Readonly<Record<number, LevelRecord>> }>;
export const emptyProgress: Progress = { version: 3, unlocked: 1, completed: [], finished: false, records: {} };
const LEGACY_LEVEL_COUNT = 3;
/** Validate stored IDs/records; old completions keep one star without inventing their unknown move counts. */
export function parseProgress(raw: string | null, count: number): Progress {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyProgress;
    const data = value as { version?: unknown; unlocked?: unknown; completed?: unknown; finished?: unknown; records?: unknown };
    const modern = data.version === 2 || data.version === 3 || Array.isArray(data.completed);
    const saved = typeof data.unlocked === 'number' && Number.isFinite(data.unlocked) ? Math.floor(data.unlocked) : 1;
    const legacyCount = Math.min(count, LEGACY_LEVEL_COUNT);
    const completed = modern ? [...new Set((Array.isArray(data.completed) ? data.completed : [])
      .filter((id): id is number => Number.isInteger(id) && id >= 1 && id <= count))].sort((a, b) => a - b)
      : Array.from({ length: data.finished === true ? legacyCount : Math.max(0, Math.min(legacyCount, saved) - 1) }, (_, i) => i + 1);
    const unlocked = Math.max(1, Math.min(count, Math.max(modern ? saved : Math.min(legacyCount, saved), ...completed.map(id => id + 1))));
    const stored = data.records && typeof data.records === 'object' && !Array.isArray(data.records) ? data.records as Record<string, unknown> : {};
    const records: Record<number, LevelRecord> = {};
    // A stray record never unlocks a maze or grants completion; only validated completed IDs receive records.
    for (const id of completed) {
      const candidate = stored[id];
      const record = candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate as { bestMoves?: unknown; stars?: unknown } : {};
      const bestMoves = typeof record.bestMoves === 'number' && Number.isSafeInteger(record.bestMoves) && record.bestMoves > 0 ? record.bestMoves : null;
      const stars = record.stars === 2 || record.stars === 3 ? record.stars : 1;
      records[id] = { bestMoves, stars };
    }
    return { version: 3, unlocked, completed, records, finished: completed.length === count };
  } catch { return emptyProgress; }
}
/** UI callbacks and navigation both enforce the same one-based unlock boundary. */
export const canPlayLevel = (progress: Progress, index: number, count: number) =>
  Number.isInteger(index) && index >= 0 && index < count && index < progress.unlocked;
/** Merge moves and stars independently so old queues or future threshold tuning cannot downgrade rewards. */
function mergeRecord(before?: LevelRecord, after?: LevelRecord): LevelRecord {
  const moves = [before?.bestMoves, after?.bestMoves].filter((value): value is number => typeof value === 'number');
  return { bestMoves: moves.length ? Math.min(...moves) : null, stars: Math.max(before?.stars ?? 1, after?.stars ?? 1) as StarRating };
}
/** Commit/replay an unlocked zero-based index; an omitted result supports migrations with unknown moves. */
export function completeLevel(progress: Progress, index: number, count: number, result?: { moves: number; optimalMoves: number }): Progress {
  if (!canPlayLevel(progress, index, count)) return progress;
  let achieved: LevelRecord = { bestMoves: null, stars: 1 };
  if (result) {
    try { achieved = { bestMoves: result.moves, stars: starsForMoves(result.moves, result.optimalMoves) }; }
    catch { return progress; }
  }
  const id = index + 1, previous = progress.records[id], record = mergeRecord(previous, achieved);
  if (progress.completed.includes(id) && previous?.bestMoves === record.bestMoves && previous?.stars === record.stars) return progress;
  const completed = progress.completed.includes(id) ? progress.completed : [...progress.completed, id].sort((a, b) => a - b);
  return { version: 3, completed, records: { ...progress.records, [id]: record },
    unlocked: Math.min(count, Math.max(progress.unlocked, index + 2)), finished: completed.length === count };
}
/** Continue the first unfinished unlocked level; a fully completed campaign replays from Level 1. */
export function continueIndex(progress: Progress, count: number): number {
  for (let id = 1; id <= Math.min(count, progress.unlocked); id++) if (!progress.completed.includes(id)) return id - 1;
  return 0;
}
/** A final/locked next level returns Home instead of indexing outside the catalog. */
export const nextLevelIndex = (progress: Progress, index: number, count: number): number | null =>
  canPlayLevel(progress, index + 1, count) ? index + 1 : null;
export const levelStatus = (progress: Progress, index: number, count: number) =>
  !canPlayLevel(progress, index, count) ? 'locked' : progress.completed.includes(index + 1) ? 'completed' : 'unlocked';
/** Union completions and strongest records so storage recovery and late queued saves cannot reduce progress. */
export function mergeProgress(before: Progress, after: Progress, count: number): Progress {
  const completed = [...new Set([...before.completed, ...after.completed])].filter(id => id >= 1 && id <= count).sort((a, b) => a - b);
  const records = Object.fromEntries(completed.map(id => [id, mergeRecord(before.records[id], after.records[id])]));
  return { version: 3, completed, records, unlocked: Math.min(count, Math.max(before.unlocked, after.unlocked, ...completed.map(id => id + 1))), finished: completed.length === count };
}
/** Count earned stars once per completed level, including migrated one-star completions. */
export const totalStars = (progress: Progress) => progress.completed.reduce((sum, id) => sum + (progress.records[id]?.stars ?? 1), 0);

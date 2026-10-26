/** Production-facing catalog boundary: plain stage data in, stable level-ID lookups out; no solver or I/O. */
import { CampaignLevel, Stage } from './stages/types';

export type LevelCatalog = Readonly<{
  stages: readonly Stage[]; levels: readonly CampaignLevel[];
  getLevel: (id: number) => CampaignLevel | undefined;
  stageForLevel: (id: number) => Stage | undefined;
}>;

/** Stage/file order defines progression; reject ID gaps/reordering instead of silently loading the wrong save. */
export function createLevelCatalog(stages: readonly Stage[]): LevelCatalog {
  const stageIds = new Set<string>(), byId = new Map<number, CampaignLevel>(), stageByLevel = new Map<number, Stage>();
  const levels: CampaignLevel[] = [];
  for (const stage of stages) {
    if (!stage.id.trim() || stageIds.has(stage.id)) throw new Error('Duplicate or empty stage ID: ' + stage.id);
    if (!stage.levels.length) throw new Error('Empty stage: ' + stage.id);
    stageIds.add(stage.id);
    for (const level of stage.levels) {
      if (level.id !== levels.length + 1) throw new Error('Level IDs must follow stage order consecutively from 1: ' + level.id);
      levels.push(level); byId.set(level.id, level); stageByLevel.set(level.id, stage);
    }
  }
  if (!levels.length) throw new Error('Campaign must contain levels');
  return { stages, levels, getLevel: id => byId.get(id), stageForLevel: id => stageByLevel.get(id) };
}

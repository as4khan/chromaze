/** Local level-loading facade; future validated stage data can use the same catalog boundary. */
import { stages as localStages } from './stages';
import { createLevelCatalog } from './catalog';
export const catalog = createLevelCatalog(localStages);
// Preserve existing screen/solver imports and the original progression order.
export const { levels, stages, stageForLevel } = catalog;

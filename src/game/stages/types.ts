/** Serializable campaign metadata extends the unchanged engine level shape. */
import { Level } from '../engine';
export type CampaignLevel = Level & Readonly<{ minimumMoves: number; focus: string }>;
export type Stage = Readonly<{ id: string; name: string; description: string; levels: readonly CampaignLevel[] }>;

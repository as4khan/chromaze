/** Cosmetic catalog shared by selection, rendering, and persistence; it never changes game rules. */
export type BallId = 'amethyst' | 'spearmint' | 'sunset' | 'coral' | 'cobalt' | 'prismatic';
export type BallAppearance = { id: BallId; name: string; asset: string; description: string; paint: string[]; shading: string[] };
export const appearances: readonly BallAppearance[] = [
  { id: 'amethyst', name: 'Amethyst', asset: '01_amethyst.png', description: 'Lavender gloss', paint: ['#A78BFA'], shading: ['#F8F4FF', '#E4D9FF', '#A78BFA', '#6440B9'] },
  { id: 'spearmint', name: 'Spearmint', asset: '02_spearmint.png', description: 'Cool mint', paint: ['#5CD6C0'], shading: ['#ECFFFB', '#BAFFF1', '#5CD6C0', '#168A85'] },
  { id: 'sunset', name: 'Sunset', asset: '03_sunset.png', description: 'Warm amber', paint: ['#F5B971'], shading: ['#FFF0D7', '#FFD49C', '#F5B971', '#C96949'] },
  { id: 'coral', name: 'Coral', asset: '04_coral.png', description: 'Soft rose', paint: ['#F58D9B'], shading: ['#FFF0EA', '#FFC1BD', '#F58D9B', '#B94978'] },
  { id: 'cobalt', name: 'Cobalt', asset: '05_cobalt.png', description: 'Electric blue', paint: ['#648EFF'], shading: ['#E1F4FF', '#8BD8FF', '#648EFF', '#3445B1'] },
  { id: 'prismatic', name: 'Prismatic', asset: '06_prismatic.png', description: 'Lavender into indigo', paint: ['#DDC7FF', '#B899F9', '#5F74DA'], shading: ['#FFF1FF', '#DDC7FF', '#B899F9', '#5F74DA'] },
];
// Supplied PNGs all share this art-space center/radius; transparent padding must not shrink the live ball.
export const BALL_ART = { size: 512, centerX: 256, centerY: 254, radius: 182 };
/** Unknown or obsolete IDs fall back to Amethyst for existing players and corrupt stored preferences. */
export function ballAppearance(id: unknown): BallAppearance {
  return appearances.find(ball => ball.id === id) ?? appearances[0]!;
}
/** Parse only the cosmetic preference; progression and in-progress paint are deliberately independent. */
export function parseBallPreference(raw: string | null): BallId {
  try { return ballAppearance(JSON.parse(raw ?? 'null')).id; } catch { return 'amethyst'; }
}

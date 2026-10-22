# Visual Kit v1 integration

Home uses native Space Grotesk lettering, the transparent brand symbol, an upright live Skia maze preview, and existing Play/Continue/replay routes. App and Android adaptive icons use the supplied PNGs; a standalone install/rebuild is needed to inspect launcher icons (Expo Go does not show a project's launcher icon).

Action glyphs are decorative beside accessible text labels. The HUD uses the existing palette and progress values. Completion uses one short transform/opacity reveal that respects system reduced motion; its actions scroll when space is tight. The ball stays in Skia and uses the supplied equipped-ball PNG, with catalog shading as a decode fallback. Paint uses one opaque ribbon clipped to the shared floor silhouette. The ribbon follows the ball's animation progress and matches committed coverage; tile fades and wet-paint sheen were removed to prevent commit flashes. Paint coverage uses the movement clock with no per-frame React update; droplets have a separate cosmetic fade clock.

Expo haptics is the only new dependency, selected by Expo for SDK 57. Each accepted slide completion emits a light stop tick, or a success notification on level completion. Unsupported/disabled hardware is allowed to stay silent. Feedback is not awaited by movement or persistence, and stale callbacks do not emit it.

## Device verification

- iPhone: small and large screen sizes, safe areas, larger text, Home/Continue/replay, HUD wrapping, and all completion actions. Check reduced motion with the system preference enabled.
- Compare long slides and buffered turns to the prior build: 50 ms per tile, smooth trail edges, no paint ahead of the ball, no added pauses or missed inputs. Verify Undo, Restart, Home during motion, completion, and relaunch with saved progress.
- Feel stop/success feedback on physical iPhone and Android hardware. Check silent/low-power/disabled-haptics behavior without expecting feedback on every device.
- Android standalone install: inspect adaptive icon crop. iOS standalone install: inspect app icon. Tablet: verify board size cap and readable centered content.

No native device or simulator visual/performance approval is implied by TypeScript, unit tests, or Metro export.

## Milestone 1.2.2 cosmetics

Home → Choose ball exposes Amethyst, Spearmint, Sunset, Coral, Cobalt, and Prismatic with immediate equip, selected-state accessibility, and storage retry. Each ball paints its own catalog color; Prismatic uses a board-anchored lavender/indigo gradient shared by committed and active coverage. Grid-space paint snapshots publish atomically with motion, and resizing does not restart the clock. A 12-slot UI-thread droplet pool emits at most once per 40 ms, fades in 180–260 ms, clears on Undo/Restart, and respects Reduced Motion. These droplets use the same floor clip and never count as paint. Idle expiry advances to zero before drawing sleeps.

On iPhone, check all six choices and a cold restart, rapid selection followed by Done, matching Home/gameplay colors, long slides and tight buffered turns, repainting, Undo/Restart, completion/next-level, large text, and 60/120 Hz motion. Check Reduce Motion and background/resume. No additional dependency is needed for this milestone.

## Motion visibility tuning

Droplets are now larger (4.5–10% of a tile radius), more opaque, and emitted 0.38–0.66 tiles behind the ball with narrower sideways spread. Their linear 180–260 ms fade keeps them readable instead of disappearing early or hiding beneath the ball. The same 12-slot pool and 40 ms emission cap remain. A short, lighter same-hue wet streak follows the ball on the movement clock, including over previously painted paths. It fades to zero at both ends of the slide, stays floor-clipped, respects Reduced Motion, and never changes the underlying permanent paint. Check visual intensity and tight turns on iPhone.

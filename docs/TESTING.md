# Milestone 1.2.2 customization verification

All 60 automated tests and TypeScript validation pass. Tests cover the six supplied PNG decodes and source-derived colors, invalid/missing preference fallback, independent persistence, ordered rapid writes and recovery after failure, bounded particle size/opacity/lifetime, the real particle callback's final idle expiry, all six paint shaders through commits/turns/Undo/Restart/completion, Prismatic color variation, and floor-clipped splatters. The previous movement/control and paint-seam raster tests remain enabled.

The paint snapshot now travels with motion in one UI-thread update. Geometry stays in grid units to avoid restarting a slide when the board resizes. Particle callbacks never change React game state; expired idle frames stop updating drawing values. No movement constants, touch recognition, collision rules, or progression storage changed. No dependencies were added.

Native selector layout, screen-reader behavior, touch latency, actual particle intensity, 60/120 Hz frame pacing, and real device persistence still need iPhone verification. Software raster checks and Hermes exports cannot certify native visual behavior. See VISUAL-KIT.md for the device checklist.

# Milestone 1.2.1 paint verification

The renderer now combines committed cells and the animated full-width ribbon into one opaque mint path, clipped to the same rounded floor outline used for the unpainted floor. This replaces the narrower unmasked stroke, per-tile alpha transitions, overlapping bridge draws, and transient sheen. The leading edge follows the moving cell footprint continuously; the paint count still advances only at tile-center crossings.

CanvasKit, already installed with Skia, rasterizes the production geometry in tests. Coverage includes long slides at fractional cell sizes, all four directions, floor-mask containment, no interior seams, buffered corner handoffs, matching before/after-commit coverage for all three level solutions, Undo, Restart, and completion. A regression probe of the former fade formula confirmed last-tile edge opacity of about 0.733 at 99% slide progress, followed by opacity 1 on commit.

Validation: all 45 tests, TypeScript, and iOS/Android Hermes exports pass. Software-Skia frame inspection supports the geometry checks; it does not exercise the native component or certify iPhone frame pacing. On iPhone, check long slides, rapid buffered turns, revisits, board resizing, background/resume, Undo/Restart, final-tile completion, and paint edges at 60/120 Hz. Speed remains 50 ms per tile; controls, engine rules, storage, and ball styling are unchanged.

# Milestone 1.1.1 speed verification

October 20, 2026: the centralized MS_PER_TILE setting changed from 80 to 50 ms. A four-tile slide now targets 200 ms instead of 320 ms. The updated timing regression failed before the constant changed, then all 30 tests passed. Assertions also cover one-tile and blocked-slide durations and paint-count crossings at 50 ms intervals. TypeScript and git diff --check passed.

The existing linear UI-thread animation, synchronized paint, latest-direction buffer, and direct completion handoff were retained. No control, collision, undo, restart, completion, progression, or dependency architecture was changed. iPhone motion feel and corner-handoff latency remain unverified; check both flicks and continuous turns at 60/120 Hz, watch for paint flashes, and confirm Undo/Restart after a faster sequence.

# Milestone 1.1 verification

October 20, 2026: movement and input tests were expanded from 15 to 30. The new control tests were first run against no-op implementations: 14 failed and the blocked-input identity case passed. They then passed against the implemented state machine, along with the original engine tests.

Coverage includes scenarios A–G from the brief, latest-only buffering, blocked pending inputs, completion clearing input, restart/undo clearing input, stale/duplicate animation callbacks, separate paint/undo snapshots, directional hysteresis, and gradual turns after a long drag. A continuous touch can issue several directions; it cannot enqueue more than one future slide.

| Milestone 1.1 check | Result |
| --- | --- |
| `npm.cmd test` in the updated checkout | 30 tests pass |
| `npm.cmd run typecheck` | Pass |
| In-memory Babel transforms using Expo's installed SDK 57 preset | GameScreen, MazeBoard, controls, and engine transform successfully; their UI callbacks/helpers are compiled as worklets |
| `git diff --check` | Pass |
| Focused independent source review | No important issues found; reviewer read the current files but could not independently access the base Git diff |

The Babel check resolves `babel-preset-expo` relative to the installed `expo/package.json`; npm stores this preset under Expo's own `node_modules`. It creates no bundle or generated source. Package files, dependency versions, level layouts, and progression storage are unchanged.

Native gestures, touch latency, 60/120 Hz frame pacing, paint appearance, UI-thread handoff timing, header appearance, and iPhone background/resume remain unverified. No physical-device session, native rebuild, or new Hermes export has been performed for this milestone. See [DEVICE-QA.md](DEVICE-QA.md).

## Previous milestone baseline

Verified October 19, 2026, with Expo 57.0.30, React Native 0.86.3, React 19.2.3, Skia 2.6.2, Reanimated 4.5.1, Gesture Handler 2.32.0, and TypeScript 6.0.3.

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | Pass |
| `npm.cmd test` | 15 tests pass |
| `npm.cmd run verify:levels` | All 3 solvable; shortest solutions: 5, 11, 11 slides |
| `npm.cmd exec -- expo install --check` | Dependencies up to date for SDK 57 |
| `npm.cmd exec -- expo export --platform all --output-dir dist` | iOS and Android Hermes bundles exported successfully |

Tests cover wall/boundary collision, continuous multi-cell path calculation, blocked moves, initial and traversed paint, duplicate suppression, undo snapshots, restart, completion, animation destination/duration, tile-center painting thresholds, dominant swipe axis, legal replays of all levels, and rejection of an unsolvable connected maze.

The renderer and native gesture system have not been executed on a device or emulator. Exporting bundles is not native compilation, a simulator run, visual review, or proof of refresh-rate performance. No native screenshot review was possible. See [DEVICE-QA.md](DEVICE-QA.md) for the acceptance checks.

`npm install` reports 26 dependency advisories (7 moderate, 19 high) in the final SDK 57 dependency graph. The compatible `npm audit fix` attempt did not clear the inherited tooling findings. A forced fix suggested incompatible Expo versions, so none was applied. Reassess before distribution.

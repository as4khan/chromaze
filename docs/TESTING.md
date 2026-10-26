# Milestone 2.2 level design tools

October 25, 2026: all 128 tests pass, TypeScript passes, and full campaign validation passes for the unchanged 20 layouts. The generated [LEVEL-ANALYSIS.md](LEVEL-ANALYSIS.md) records dimensions, floor counts, verified optimal moves, move-based estimated difficulty, and two near-match warnings (10/12 and 12/15); there are no exact duplicates or validation errors. Strict mode intentionally returns nonzero for those warnings.

Tool tests cover malformed ASCII/JSON metadata, disconnected and connected-but-unsolvable grids, exact solution replay, stale minima, state-budget exhaustion, all eight symmetry transforms, wall-padding normalization, floor-based near similarity, batch ID collisions/gaps, report output, safe author-file creation, CLI error exit codes, and 125-level catalog lookups. A production-entry import walk confirms scripts, the solver, and Node builtins are absent from gameplay's module graph. Existing movement, paint, cosmetic, star-rating, migration, and navigation tests remain enabled. Source hashes confirm prior gameplay, all stage data, progression, preferences, and dependency lockfile are unchanged; only the production catalog facade is reorganized.

The authoring workflow and future validated-data loading boundary are documented in [LEVEL-AUTHORING.md](LEVEL-AUTHORING.md). No backend or dependencies were added. No native UI changed, and a new device session was not run. Difficulty and near-match scores remain design-review aids, not substitutes for playtesting; scaled/different-size copies may evade the equal-dimension comparison.

# Milestone 2.1 star ratings and personal records

Validation: all 119 tests pass, TypeScript passes, iOS/Android Hermes bundles export successfully, and git diff --check passes. No new dependencies were added.

October 25, 2026: thresholds, version-3 save migration, replay improvements, independent best-move/highest-star merges, invalid record recovery, all-60-star completion, and stale-write storage round-trips are covered by automated tests. The real App navigation callbacks verify improved and slower replays. A native-view mock runs the real GameScreen finish and Undo/Restart callbacks, checking final committed moves, stale callback rejection, result content, and stable animation callbacks during recovered saves. These are callback/content checks, not native layout or animation performance tests.

The original storage key, gameplay, level data, 50 ms/tile speed, solver, paint renderer, splatters, all six cosmetics, and dependencies remain unchanged. See [CAMPAIGN.md](CAMPAIGN.md) for thresholds and migration policy. Device checks remain: completion scrolling at large text sizes, star art, reduced motion, reward feel, slower replay retention, Undo/re-finish, and persisted totals after relaunch.

# Expo SDK 58 upgrade verification

October 23, 2026: upgraded from SDK 57 to the SDK 58 compatible patch set (expo 58.0.19, React 19.3.0, React Native 0.88.0, Skia 2.14.0, Reanimated 4.7.1, Gesture Handler 3.3.0, Worklets 0.13.0, and Safe Area Context 5.10.1). Expo selected the matching font, status-bar, and haptics versions. The removed legacy splash config migrated to the expo-splash-screen plugin with the existing #111827 background. Application source, game rules, levels, and saved-data keys were unchanged by this upgrade.

Validation: 108 tests pass, TypeScript passes, dependency alignment passes, Expo Doctor passes 20/20 checks, and iOS/Android Hermes exports pass. Current setup instructions now target SDK 58; records below describe their original SDK 57 verification environments.

Stop any old Metro session, then run `npm.cmd start -- --clear` and scan its new QR code using Expo Go for SDK 58. Native launch, gestures, painting, haptics, persistence, and frame pacing still need an iPhone check. The custom splash background needs a native build to verify; Expo Go does not reproduce the release splash screen fully.

npm audit reports five high-severity dependency findings through Expo CLI (node-forge and zod). No SDK-compatible complete fix was offered; the proposed forced fix downgrades Expo to 44.0.6 and was not applied. Recheck upstream patches before distribution.

# Milestone 2.0 campaign verification

October 23, 2026: all 108 automated tests pass; TypeScript validation, the 20-level offline verifier, and final iOS/Android Hermes bundle exports pass. Tests preserve the original first three levels, reject rotated/reflected duplicate layouts, assert stage growth and nondecreasing minimum moves, and replay every minimum solution. Campaign coverage includes legacy/malformed saves, old Level-3 finishers, unlocks, replay, full completion, serialized storage recovery, and board fitting across square/rectangular phone/tablet dimensions.

Navigation tests exercise the real App callbacks with mocked native primitives: locked selections, Home/selector/game transitions, Continue after migration, ball-selector access, replay, next-level unlocks, and Level 20 returning Home. They do not mount native views or run native gestures.

Existing movement, appearance, splatter, and paint tests now include all 20 campaign solutions. Software-Skia checks retain strict floor-interior fill and wall clipping. Dense fractional-pixel boundaries showed at most 8/255 alpha variation at antialiased edge pixels; only boundary comparisons allow that measured tolerance. Fully solid/empty pixels and all six appearance color comparisons retain their strict checks. The production paint renderer, engine, controls, solver, ball preferences, and dependencies are unchanged.

See [CAMPAIGN.md](CAMPAIGN.md) for exact minimum moves, migration behavior, and remaining device checks. Native layout, accessibility, 60/120 Hz performance, and subjective difficulty remain unverified.

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

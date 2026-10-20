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

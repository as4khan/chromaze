# Chromaze

An original sliding-ball painting puzzle for iOS and Android. Milestone 2.0 adds a 20-level campaign, level selection, and migrated local progression, still targeting **Expo SDK 58**.

## Run on your phone

Use Node.js 22.13+ on the 22 LTS line or 24.3+ on the 24 LTS line and an Expo Go app supporting SDK 58. From this folder:

```powershell
npm.cmd ci
npm.cmd start -- --clear
```

Scan the terminal QR code with your phone (Camera on iOS, Expo Go on Android). Keep the computer and phone on the same network. Allow Node through the local firewall if prompted. On macOS/Linux, use `npm` in place of `npm.cmd`. Android emulator users can press `a`; the iOS simulator requires macOS. No native project generation or custom development client is required by this prototype.

After upgrading from SDK 57, stop the old Metro session and run `npm.cmd start -- --clear` before scanning the new QR code in Expo Go for SDK 58. Keep Expo and its native dependencies aligned with `npm.cmd exec -- expo install --check`.

## Play

Flick anywhere in the gameplay region and release, or keep your thumb down and drag through successive directions. Initial input needs 14 points of travel; turns need 18 and reversals 22, with a 1.25 dominant-axis ratio to reject diagonal jitter. Continued straight dragging updates the thumb anchor without generating extra moves. Holding still does nothing.

Each command slides to the next wall or floor boundary, at a configurable 50 ms per tile. During a slide, only the latest requested direction is buffered; it is attempted immediately after the current slide commits. A blocked direction is discarded without counting a move. Releasing your finger resets touch recognition, not the active slide or buffer. Undo, restart, completion, and leaving the level clear pending input.

The start tile is already painted. The equipped ball’s matching paint follows the animated ball and each tile becomes painted as it is reached. Paint every floor tile to finish. Undo restores exactly one completed slide's position, paint, and move count, including slides made during a continuous drag. Restart restores the starting state. Undo and Restart are disabled during movement; Home safely cancels it. Completion unlocks the next level locally; finishing Level 20 returns to a replay state on Home. Choose level opens four scrollable stages with completed, unlocked, and locked mazes. Continue opens the first unfinished unlocked maze.

Individual completed levels, best moves, highest star ratings, unlocks, and the selected ball persist locally. Completed mazes can be replayed to improve a three-star rating based on the verified optimum; slower runs never reduce records. Home and Choose level display total stars out of 60. Old three-level saves migrate automatically: players who finished Level 3 continue at Level 4. Leaving a level or closing the app starts that level fresh. Undoing a completed level does not revoke an earned unlock.

## Commands

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run verify:levels
npm.cmd run levels:report -- --output docs/LEVEL-ANALYSIS.md
npm.cmd exec -- expo install --check
npm.cmd exec -- expo export --platform all --output-dir dist
```

The solver uses breadth-first search over stopping position **and painted floor mask**, and replays the resulting directions in tests. It proves paint coverage under the same pure collision rules used by gameplay, rather than merely checking floor connectivity. `verify:levels` checks legal full-paint solution replays and reports grid dimensions, floor counts, exact minimum moves, estimated difficulty, and transformed duplicate/near-match findings. Its state-space cap protects against accidental exponential searches on future larger levels.

Current verification and device-testing limits are recorded in [docs/TESTING.md](docs/TESTING.md).

See [docs/LEVEL-AUTHORING.md](docs/LEVEL-AUTHORING.md) for ASCII authoring, candidate validation, JSON reports, strict mode, and adding future world/stage packs.

## Code map

- `App.tsx`, `index.ts`: app entry, fonts, safe areas, navigation, and progression lifecycle.
- `src/screens/`: Home, level selection, ball selection, gameplay, and the completion interface.
- `src/components/`: Skia maze/ball/trail rendering and accessible buttons.
- `src/game/engine.ts`: pure movement, collision, painting, state snapshots, undo, and animation plans.
- `src/game/controls.ts`: worklet-safe touch recognition and the idle/sliding/completing state machine with one pending direction.
- `src/game/levels.ts`, `src/game/stages/`, `solver.ts`: the stage catalog, original layouts, and offline solvability verification.
- `src/game/progression.ts`: pure unlock, completion, replay, and legacy-save migration rules.
- `docs/CAMPAIGN.md`: level catalog, minimum moves, storage contract, and campaign device checks.
- `src/storage/`: versioned AsyncStorage progression, validation, and corrupt-data recovery.
- `src/theme.ts`: palette; `PRODUCT.md`, `DESIGN.md`: product and visual constraints.
- `tests/`, `scripts/verify-levels.ts`: automated checks and solution output.
- `docs/DEVICE-QA.md`: phone acceptance checklist and remaining device verification.
- `app.json`, `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`: Expo and development setup.

## Rendering and state

Collision logic computes each complete slide before animation. Reanimated updates the motion geometry and progress together on the UI thread; Skia derives the ball center, rolling highlight, and continuous clipped paint ribbon from that motion. The highlight's travel phase survives turns. Paint is tagged with a slide ID to keep stale progress from revealing the next path.

Gesture recognition also runs on the UI thread. Only deliberate commands, reached tile centers, and slide completions cross to JS. The memoized board avoids rerendering on progress-label updates. A completed slide commits one immutable snapshot; a buffered slide is selected in that same state transition, without an intermediate idle render or artificial timer. Stale callbacks cannot commit an old slide twice. Completion appears only after the final movement finishes.

No source, graphics, audio, or layouts from AMAZE!!! are used. Gameplay reference: [CrazyLabs' AMAZE](https://www.crazylabs.com/games-console/amaze/). Dependency compatibility follows [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), including its bundled [Skia](https://docs.expo.dev/versions/v58.0.0/sdk/skia/) and [Reanimated](https://docs.expo.dev/versions/v58.0.0/sdk/reanimated/) versions.

## Scope and next steps

This is a native prototype, with no web target configured. It deliberately excludes ads, purchases, authentication, multiplayer, leaderboards, procedural generation, and advanced puzzle mechanics. The board fits both square and rectangular-row grids to the available width and height.

Native visual appearance, real touch latency, refresh-rate performance, background/resume behavior, and persistence across actual phone launches require device verification. Automated tests and JavaScript/Hermes bundling do not replace those checks. The UI labels controls and progress for screen readers, but the spatial puzzle currently requires swipe input and is not fully accessible without vision.

Before the next milestone, run the device checklist on both platforms, tune movement and difficulty through playtesting, add native gesture/animation integration tests, and consider non-swipe input. Dependency audit findings inherited through Expo tooling should be reassessed before distribution; avoid `npm audit fix --force`, which may select incompatible SDK versions.

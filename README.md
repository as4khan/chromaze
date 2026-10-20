# Chromaze

An original sliding-ball painting puzzle for iOS and Android. Milestone 1 is a three-level Expo Go prototype targeting **Expo SDK 57**.

## Run on your phone

Use a recent Node.js LTS release and an Expo Go app supporting SDK 57. From this folder:

```powershell
npm.cmd ci
npm.cmd start -- --clear
```

Scan the terminal QR code with your phone (Camera on iOS, Expo Go on Android). Keep the computer and phone on the same network. Allow Node through the local firewall if prompted. On macOS/Linux, use `npm` in place of `npm.cmd`. Android emulator users can press `a`; the iOS simulator requires macOS. No native project generation or custom development client is required by this prototype.

If a previous SDK 58 Metro session is running, stop it before starting this project. SDK 57 is intentional; avoid upgrading Expo independently of its native dependencies.

## Play

Swipe anywhere in the gameplay region. Once a gesture crosses 22 points, its dominant axis selects the direction. The ball slides continuously to the next wall or floor boundary, at 100 ms per tile. A swipe produces one slide, and additional input during that slide is ignored. Blocked swipes do not count as moves.

The start tile is already painted. A mint trail follows the animated ball and each tile becomes painted as it is reached. Paint every floor tile to finish. Undo restores the last completed slide's position, paint, and move count; Restart restores the starting state. Controls are disabled during movement. Completion unlocks the next level locally; finishing level 3 returns to a replay state on Home.

Only unlocks and completion persist. Leaving a level or closing the app starts that level fresh. Undoing a completed level does not revoke an earned unlock.

## Commands

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run verify:levels
npm.cmd exec -- expo install --check
npm.cmd exec -- expo export --platform all --output-dir dist
```

The solver uses breadth-first search over stopping position **and painted floor mask**, and replays the resulting directions in tests. It proves paint coverage under the same pure collision rules used by gameplay, rather than merely checking floor connectivity. `verify:levels` prints playable solution sequences. Its state-space cap protects against accidental exponential searches on future larger levels.

Current verification: **15 tests pass**, TypeScript passes, Expo's SDK 57 dependency check passes, and iOS/Android Hermes exports succeed. Full results and limits: [docs/TESTING.md](docs/TESTING.md).

## Code map

- `App.tsx`, `index.ts`: app entry, fonts, safe areas, navigation, and progression lifecycle.
- `src/screens/`: Home, gameplay, and the completion interface.
- `src/components/`: Skia maze/ball/trail rendering and accessible buttons.
- `src/game/engine.ts`: pure movement, collision, painting, state snapshots, undo, and animation plans.
- `src/game/levels.ts`, `solver.ts`: original handcrafted layouts and solvability verification.
- `src/storage/`: versioned AsyncStorage progression, validation, and corrupt-data recovery.
- `src/theme.ts`: palette; `PRODUCT.md`, `DESIGN.md`: product and visual constraints.
- `tests/`, `scripts/verify-levels.ts`: automated checks and solution output.
- `docs/DEVICE-QA.md`: phone acceptance checklist and remaining device verification.
- `app.json`, `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`: Expo and development setup.

## Rendering and state

Collision logic computes the entire slide before animation. Reanimated runs a linear progress value on the UI thread; Skia derives the ball center, rolling highlight, continuous trail endpoint, and paint fade from it. The JS thread receives tile-center crossings for the progress label, rather than per-frame position updates. A successful slide commits one immutable snapshot only after its animation finishes. The completion interface appears after that commit.

No source, graphics, audio, or layouts from AMAZE!!! are used. Gameplay reference: [CrazyLabs' AMAZE](https://www.crazylabs.com/games-console/amaze/). Dependency compatibility follows [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), including its bundled [Skia](https://docs.expo.dev/versions/v57.0.0/sdk/skia/) and [Reanimated](https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/) versions.

## Scope and next steps

This is a native prototype, with no web target configured. It deliberately excludes ads, purchases, authentication, multiplayer, leaderboards, procedural generation, and advanced puzzle mechanics. The board currently assumes the included square, rectangular-row grids.

Native visual appearance, real touch latency, refresh-rate performance, background/resume behavior, and persistence across actual phone launches require device verification. Automated tests and JavaScript/Hermes bundling do not replace those checks. The UI labels controls and progress for screen readers, but the spatial puzzle currently requires swipe input and is not fully accessible without vision.

Before the next milestone, run the device checklist on both platforms, tune movement and difficulty through playtesting, add native gesture/animation integration tests, and consider haptics and non-swipe input. Dependency audit findings inherited through Expo tooling should be reassessed before distribution; avoid `npm audit fix --force`, which may select incompatible SDK versions.

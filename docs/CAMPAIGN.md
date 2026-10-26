# Campaign: Milestone 2.0

The campaign contains 20 static, original layouts in four five-level stages. Levels 1–3 preserve their original names, starts, and floor grids. New authored layouts use pockets, loops, offset lanes, linked courts, and return routes, with solver-assisted stopper-wall refinement. There is no procedural generation at runtime.

| Level | Stage | Name | Columns × rows | Minimum moves | Puzzle focus |
| --- | --- | --- | --- | --- | --- |
| 1 | Beginner | First light | 5 × 5 | 5 | Follow the first connected path. |
| 2 | Beginner | Around the bend | 6 × 6 | 11 | Explore the return around the bend. |
| 3 | Beginner | The quiet labyrinth | 7 × 7 | 11 | Use the walls to reach the inner loop. |
| 4 | Beginner | The switchback | 7 × 7 | 12 | Use wall stops to change lanes. |
| 5 | Beginner | Crosscurrent | 7 × 5 | 13 | Approach crossings from a new side. |
| 6 | Intermediate | Pocket compass | 7 × 7 | 14 | Plan a return through the center. |
| 7 | Intermediate | Courtyard | 7 × 7 | 14 | Connect the rim and inner court. |
| 8 | Intermediate | Inner harbor | 9 × 9 | 15 | Use the loop to reach each inner channel. |
| 9 | Intermediate | Pinwheel | 9 × 9 | 18 | Alternate outer and inner lanes. |
| 10 | Intermediate | Staggered landings | 9 × 9 | 18 | Choose stopping lanes to cover staggered branches. |
| 11 | Advanced | Sundial | 9 × 9 | 19 | Link courts from unequal approaches. |
| 12 | Advanced | Glasshouse | 9 × 9 | 19 | Revisit lanes to access cross-links. |
| 13 | Advanced | Long way home | 11 × 9 | 20 | Plan returns between the rim and inner lanes. |
| 14 | Advanced | Twin galleries | 9 × 9 | 21 | Choose which gallery to clear first. |
| 15 | Advanced | The crossing | 9 × 9 | 22 | Use blocked crossings as deliberate stops. |
| 16 | Expert | Braided avenues | 11 × 11 | 26 | Coordinate several linked return routes. |
| 17 | Expert | Offset atrium | 11 × 11 | 28 | Enter each chamber from the right approach. |
| 18 | Expert | Tidal chambers | 11 × 11 | 30 | Plan transfers between the two halves. |
| 19 | Expert | Double helix | 11 × 11 | 31 | Unwind alternating offsets and revisit the right lanes. |
| 20 | Expert | Switchyard | 11 × 11 | 33 | Combine stop planning and corridor revisits. |

Minimum moves count legal slides, not tile crossings. The existing breadth-first solver searches stopping position and painted-floor mask; the verifier replays every shortest route through the production engine. Minimum moves never decrease through the campaign; average floor count and average minimum moves increase at each stage. Tests reject duplicate layouts even under rotation/reflection. These checks establish solvability and objective length, not subjective difficulty: route discovery and balance still need phone playtesting.

## Data and saves

Stage files live in src/game/stages/. src/game/levels.ts provides the existing ordered catalog and stage metadata. IDs stay one-based and stable; gameplay indices stay zero-based. Plain serializable level data and pure progression rules are separate from AsyncStorage. A future remote loader can supply the same data shape; no backend, network client, or speculative repository layer is implemented. Keep existing IDs stable when extending the campaign and verify new data before publishing.

The original AsyncStorage key, `@chromaze/progression/v1`, is retained. The record now carries `version: 3`, per-level personal records, individual completed IDs, the highest unlocked ID, and campaign completion derived from all 20 completions. Legacy unlocked progress implies earlier levels are complete. Legacy `{unlocked:3,finished:true}` becomes completed [1,2,3], unlocked 4, finished false. Reads migrate in memory without overwriting the stored record; the next successful level completion persists the migrated data. Malformed data falls back safely. Cosmetic preferences use their existing independent key.

Completing an unlocked level opens the next, replay never removes progress, and Continue selects the first unfinished unlocked level. Full completion offers replay from Level 1 and keeps all levels selectable. Level 20’s completion action returns Home. Serialized writes re-read and merge stored achievements before saving, and late save results merge with current session progress. A storage read failure prevents overwrite; the alert explains that another completion retries saving. In-level position and Undo history are not saved.

## Device acceptance

- Scroll all four stages; verify status text, disabled locks, accessible labels, Home, Android Back, replay, and Continue. Check small/large text and short phones.
- Upgrade an old Level-3-complete save: Home must show 3/20 and Continue Level 4. Relaunch after another completion; confirm all earlier completions and the selected ball survive.
- Play rectangular Levels 5 and 13 and 11×11 Expert boards on small and large phones. Check board edges, controls, header wrapping, and the completion panel after rotation/resizing.
- Finish Level 20, return Home, replay earlier mazes, and relaunch with 20/20 complete.
- Exercise quick flicks, continuous drags and buffered turns at 60/120 Hz, repainting, Undo, Restart, all six balls/paint colors, splatters, completion haptics, and background/resume.
- Check storage failure/recovery on a development device; successful retry must retain earlier disk achievements.

Native selector layout, screen-reader behavior, motion performance, and puzzle balance have not been verified on a physical device. Automated callback navigation, software-Skia coverage, and bundle exports do not replace those checks.

## Star ratings and replay (Milestone 2.1)

The existing solver-verified minimumMoves metadata supplies the optimum; no solver runs on the phone. src/game/ratings.ts owns thresholds: three stars through optimum + max(1, floor(optimum × 0.2)); two through optimum + max(3, ceil(optimum × 0.5)); one for any valid finish. For Level 1 (optimum 5), that means three stars in 5–6 moves, two in 7–8, and one in 9 or more. Each completion shows the run rating, moves, optimal moves, retained personal best, and thresholds. The existing 280 ms reduced-motion-aware completion reveal and success haptic are reused, with static amber star art and no new particle loop.

Version-3 saves retain the original storage key and all earlier unlocks/completions. Per-level records contain bestMoves (positive integer or null) and highest stars. Existing completions receive one baseline star; historical move counts remain unknown until replayed. The selector explicitly offers “Replay to set a best.” Slower runs, tied runs, Undo, Restart, storage recovery, and old queued writes never reduce earned achievements. Personal best uses the current run’s committed move count, so Undo continues to rewind moves just as before. Best moves and highest stars merge independently. Home and the selector show earned stars out of 60, separate from completion progress.

On iPhone, verify short-screen/large-text scrolling in completion, all three rating appearances, new-best feedback, slower replay retention, Undo/re-finish, restart, totals, and persistence after relaunch. Reduce Motion should retain immediate readable results without additional motion.

## Developer tools (Milestone 2.2)

See [LEVEL-AUTHORING.md](LEVEL-AUTHORING.md) for offline authoring, solver checks, transformed duplicates, and the stage/catalog boundary. [LEVEL-ANALYSIS.md](LEVEL-ANALYSIS.md) is generated from the current 20 unchanged levels. Two near-match pairs (10/12 and 12/15) are flagged for design review; no existing puzzle is modified or removed.

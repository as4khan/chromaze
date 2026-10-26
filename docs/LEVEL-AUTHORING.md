# Level authoring and publication

All tools run locally in Node through the existing tsx dependency. They never run in gameplay, modify saved progression, or rewrite published levels. No backend or new dependency is required.

## Commands

Run from the repository root (use npm instead of npm.cmd on macOS/Linux):

```powershell
npm.cmd run levels:validate
npm.cmd run verify:levels
npm.cmd run levels:report -- --output docs/LEVEL-ANALYSIS.md
npm.cmd run levels:report -- --json --output level-analysis.json
npm.cmd run levels:validate -- --input level-drafts/candidates.json
npm.cmd run levels:validate -- --strict
```

verify:levels is retained as an alias for full validation. The old direct scripts/verify-levels.ts entry point also delegates to the same tool. Report commands produce output even when validation fails, and return a nonzero exit code for malformed layouts, unsolvable levels, stale optimal counts, ID gaps/collisions, or exact duplicates. --strict also fails on near-match warnings. The preserved campaign currently has two warnings (10/12 and 12/15), so strict mode intentionally fails until those layouts receive design review; ordinary validation passes. No allowlist hides these findings.

--input JSON supplements the published catalog; it accepts one level object or an array of draft objects. It is not a replacement catalog. This catches collisions with published puzzles as well as between candidates. Candidate IDs must fill the next consecutive slots. --limit 300000 controls the maximum BFS states per level. A state-limit result means unverified, not unsolvable; redesign the maze or explicitly increase the budget and rerun. Solver state growth can be exponential even on small grids. Report files may be overwritten by an explicit --output; draft authoring never overwrites files, and input/output paths must differ.

## Author a draft

Create a plain-text rectangular grid using . for floor, # for walls, and exactly one @ for the starting floor tile. Use no indentation or spaces. CRLF and LF are both accepted. This deliberately simple demonstration needs one slide:

```text
@..
```

Save it as level-drafts/maze.txt (create the folder first), then run:

```powershell
npm.cmd run levels:author -- --input level-drafts/maze.txt --id 21 --name "First draft" --focus "Read a simple wall stop." --output level-drafts/level-021.json
npm.cmd run levels:validate -- --input level-drafts/level-021.json
```

Authoring validates geometry/connectivity, solves and replays the puzzle, checks against published layouts, and writes a complete JSON object with the exact minimumMoves. Omit --output to print JSON. An existing output file or published ID is rejected; choose a new path for a revision. Exact duplicates and unsolved/state-limited drafts are not written. Near matches warn on stderr and can be rejected with --strict. A draft is not automatically added to gameplay.

## Organize and publish

The original four data files in src/game/stages/ remain unchanged. src/game/stages/index.ts is the ordered world/stage manifest. For another pack, create a focused file exporting a readonly CampaignLevel array (usually 5–10 puzzles); place verified draft objects there, then register a Stage entry in the manifest. Stage IDs must be unique stable strings, and name/description must be nonempty. Keep catalog order and level IDs consecutive from 1. Never renumber, reorder, or change published puzzles: saves and personal records use their stable IDs. Run validation before publication and rerun tests after increasing campaign size; existing campaign-specific tests currently assert 20 levels and 60 stars and must be updated deliberately when expanding those targets.

The production src/game/levels.ts facade exports the same levels, stages, and stageForLevel imports as before, plus catalog. src/game/catalog.ts accepts plain serializable Stage[] data and exposes levels/stages, getLevel(id), and stageForLevel(id). Lookup maps avoid scanning every stage during play. The factory rejects ID gaps/reordering and duplicate/empty stage IDs. This is a synchronous data boundary, not a network client. A future Supabase adapter can fetch and validate stage data, order it explicitly, and pass it to createLevelCatalog before navigation starts; no database, credentials, async navigation, or speculative cache is implemented now. Untrusted remote JSON will still need runtime validation at that adapter boundary.

## Interpret the report

- Grid dimensions and floor count describe the actual authored grid, including any all-wall padding.
- Optimal moves are the exact breadth-first full-paint minimum, verified by replay through the gameplay engine; walking connectivity alone is insufficient.
- Estimated difficulty uses the current campaign’s move-count bands: Beginner ≤13, Intermediate ≤18, Advanced ≤22, Expert >22. This estimate helps sort a backlog; it does not prove strategic depth or human difficulty.
- Duplicate detection compares all eight rotations/reflections and strips all-wall outer padding. Names, IDs, and start positions do not excuse an otherwise copied layout.
- Near detection uses floor Dice overlap (2 × overlapping floor / total floor in both layouts), at least 90% after transformation. It avoids artificial similarity from matching walls. Pairs show the overlap score and changed-cell count. Only equal trimmed dimensions are compared; scaled/distorted copies can escape detection, and high overlap may still produce meaningfully different movement. Treat warnings as design-review prompts.

See [LEVEL-ANALYSIS.md](LEVEL-ANALYSIS.md) for the current generated report. Playtest candidate routes, texture readability, ball movement and paint on dense boards before publishing; automated geometry and shortest-route checks do not replace that judgment.

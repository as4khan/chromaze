# Native acceptance checks

These checks require Expo Go on an iPhone and Android phone. They have not yet been performed. Native screenshots, touch latency, frame pacing, actual GPU rendering, and app persistence cannot be verified by the engine tests or Metro exports.

1. Launch, verify bundled fonts and Skia render, then tap Play.
2. Level 1: flick right from floor, wall, and empty space in the board region, immediately releasing your finger. It must cross four tiles in about 200 ms and stop exactly at the last center. Repeat right: no move increment.
3. While rolling right, request down. It must start only at the right wall. Test both a separate released flick and a continuous right-to-down thumb turn. Add a later left request before the rightward slide finishes: only left should run next, with no long queue.
4. Hold one touch and trace right, down, left through level 1, timing each next turn near its stopping point. No lift should be required. Try tiny jitter, slow turns, diagonal strokes, and deliberate reversals. Initial input needs 14 points; a turn 18; reversal 22; the major axis must dominate by 1.25. After a long straight drag, a short perpendicular turn must still register. Holding still or continuing straight must not create extra moves.
5. Watch the mint trail behind the ball. Nothing ahead of it should paint. Count increments at each reached tile center, and revisits do not increase it.
6. Undo after multiple turns in one touch: exactly one completed slide, including its paint and move count, is restored. Restart returns to one painted start tile and zero moves. Undo/Restart remain disabled during motion. Home and Android Back can leave mid-slide; re-entering must have no leftover buffered motion.
7. Solve level 1: right, down, left, down, right. Completion must wait until the last slide ends. Undo from completion must restore the previous slide's exact state. Next Level loads the next maze at its start.
8. Complete all levels; final completion returns home. Close and reopen the app: unlocks and the finished state persist. Playing from level 1 must not reduce unlocks.
9. Test a small phone and tablet, large text settings, and background/resume halfway through a slide. No cropped board, stuck input, unexpected reset, or accidental navigation. Verify Home and the title do not overlap; this checkout has no settings gear, so existing controls are preserved.
10. Check smooth motion on 60 Hz and 120 Hz iPhones. Film repeated buffered turns if possible: look for pauses, backward jumps, paint flashes, and a reset in the ball highlight. The next slide still requires a JS completion/state handoff, whose latency needs real-device measurement. Adjust `MS_PER_TILE` only after playing; do not replace linear multi-tile travel with per-cell easing.

Before the next milestone: capture iOS/Android screenshots, tune tactile feedback and difficulty on devices, and add native gesture/animation integration coverage.

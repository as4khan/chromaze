# Native acceptance checks

These checks require Expo Go on an iPhone and Android phone. They have not yet been performed. Native screenshots, touch latency, frame pacing, actual GPU rendering, and app persistence cannot be verified by the engine tests or Metro exports.

1. Launch, verify bundled fonts and Skia render, then tap Play.
2. Level 1: swipe right from floor, wall, and empty space in the board region. One swipe must cross four tiles in about 400 ms and stop exactly at the last center. Repeat right: no move increment.
3. Swipe left halfway through a right slide. That gesture must be ignored, including if it stays down until the slide ends. A new swipe after release must work.
4. Try short drags, taps, diagonal swipes, slow drags, and a long held drag. A gesture triggers at most one move after the 22-point threshold; diagonal input follows the dominant axis.
5. Watch the mint trail behind the ball. Nothing ahead of it should paint. Count increments at each reached tile center, and revisits do not increase it.
6. Undo multiple moves: verify position, every painted tile, and move count. Restart returns to one painted start tile and zero moves. Controls remain disabled during motion.
7. Solve level 1: right, down, left, down, right. Completion must wait until the last slide ends. Undo from completion must restore the previous slide's exact state. Next Level loads the next maze at its start.
8. Complete all levels; final completion returns home. Close and reopen the app: unlocks and the finished state persist. Playing from level 1 must not reduce unlocks.
9. Test a small phone and tablet, large text settings, system back on Android, and background/resume halfway through a slide. No cropped board, stuck input, unexpected reset, or accidental navigation.
10. Check smooth motion on 60 Hz and higher-refresh devices. Adjust `MS_PER_TILE` only after playing; do not replace the linear multi-tile slide with per-cell animations.

Before the next milestone: capture iOS/Android screenshots, tune tactile feedback and difficulty on devices, and add native gesture/animation integration coverage.

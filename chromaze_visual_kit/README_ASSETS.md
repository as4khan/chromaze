# Chromaze visual kit — concept pack v1

Created from `as4khan/chromaze`'s `DESIGN.md`, `PRODUCT.md`, `src/theme.ts`, and `src/components/MazeBoard.tsx` (main branch, 2026-10-20). Original shapes, not traced from AMAZE!!!.

## Asset index
- `logos/chromaze_app_icon.png`: full 1024x1024 opaque app icon for an Expo `icon` entry.
- `logos/chromaze_adaptive_foreground.png`: transparent centered symbol for Android adaptive icon foreground, with `backgroundColor: "#111827"`.
- `logos/chromaze_symbol.*`: transparent standalone logo symbol.
- `logos/chromaze_wordmark.*`: transparent horizontal logotype. Its SVG text uses an Inter fallback for the game's Space Grotesk; use native Space Grotesk for text in UI.
- `logos/chromaze_lockup_dark.*`: symbol, wordmark and tagline on a dark surface.
- `balls/01_amethyst.*` to `06_prismatic.*`: transparent, 512x512 raster plus scalable SVG cosmetic ball design options. The amethyst design matches the current lavender ball role; the rest are concepts, not implemented mechanics.
- `ui/`: 10 simple action glyphs in two palette colors. SVG source 64x64; PNG raster 256x256. Three optional level badges.
- `backgrounds/maze_pattern_dark.*`: subtle decor (keep away from puzzle grid for legibility).
- `backgrounds/chromaze_splash_portrait.*`: 1242x2688 splash *concept illustration*; not a complete Expo splash configuration.
- `previews/`: a contact sheet and a conceptual home mockup, not screenshots of the running app.

## Expo integration
1. Copy the chosen PNG files to `assets/brand/` or an equivalent folder in the repository.
2. Set Expo config paths with care (example only; existing `app.json` currently has no `icon` entry):

```json
{
  "expo": {
    "icon": "./assets/brand/chromaze_app_icon.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/brand/chromaze_adaptive_foreground.png",
        "backgroundColor": "#111827"
      }
    }
  }
}
```

3. Do not replace the gameplay ball Skia renderer with a `Image` element every frame. Keep its live center, trail, and gradient driven by the same Reanimated progress. You can use these PNGs for selection screens, previews or cosmetic unlocks; implement cosmetics in Skia later if desired.
4. Display wordmark using existing bundled Space Grotesk in React Native wherever possible; PNG wordmark is useful for marketing/static placement.
5. These art files are *concepts* and require visual device QA for iOS and Android. Expo SDK 57 compatibility and movement performance are unchanged because no source code is modified.
6. Theme colors: background #111827; wall #2F3B52; paint #5CD6C0; ball #A78BFA; accent #F5B971; text #F3F5FA.

## Suggested Codex handoff
"Use the supplied Chromaze visual kit PNG assets. Add the app icon and Android adaptive icon to Expo config; keep existing gameplay, Skia ball movement, paint synchronization and gesture semantics exactly unchanged. Use visuals sparingly on Home and completion only, behind a feature flag if needed. Ensure PNG transparency is respected, test on iOS and Android, run typecheck/tests/Expo checks, and summarize modified files. Do not add new mechanics or dependencies."

# Chromaze

## Platform and stack
Native iOS and Android, built with Expo SDK 58, React Native and TypeScript. The user's Expo Go app now requires SDK 58; keep Expo and native dependencies aligned with that SDK. Skia renders the game; Gesture Handler interprets swipes; Reanimated drives motion; AsyncStorage persists completed levels, unlocks, and ball preferences.

## Purpose
An original puzzle game where each swipe sends a ball to the next wall, painting every floor tile it crosses. Success is a responsive 20-level campaign across Beginner, Intermediate, Advanced, and Expert stages, with synchronized motion and paint, reliable undo/restart, replayable unlocked levels, and persistent progression. The first three layouts remain unchanged.

## Constraints
Use AMAZE!!! as a mechanical reference only. Original layouts and graphics. One directional command means one uninterrupted slide. Quick flicks and continuous thumb dragging coexist; the latest command during movement is buffered and attempted at the next stop. Each slide remains separately undoable. No monetization, accounts, multiplayer, procedural levels, or advanced puzzle mechanisms in this milestone.

## Brand commitments
Chromaze; modern dark presentation, background #111827, walls #2F3B52, mint paint #5CD6C0, lavender ball #A78BFA, amber accent #F5B971. Maze and responsiveness take priority over decoration.

## Open decisions
Long-term audience, sound, playtested difficulty tuning, and accessibility alternatives to swiping remain open. Optional haptics are already implemented. See docs/CAMPAIGN.md for verified minimum moves and device acceptance checks.

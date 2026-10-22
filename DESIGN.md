---
name: Chromaze
description: A quiet dark field for a responsive sliding-ball painting maze.
colors:
  background: "#111827"
  wall: "#2F3B52"
  paint: "#5CD6C0"
  ball: "#A78BFA"
  accent: "#F5B971"
  text: "#F3F5FA"
  muted: "#AEBBD0"
  floor: "#1D293D"
  recess: "#0B1220"
typography:
  display:
    fontFamily: SpaceGrotesk_700Bold
    fontSize: 44px
    letterSpacing: -1.6px
  headline:
    fontFamily: SpaceGrotesk_600SemiBold
    fontSize: 32px
    letterSpacing: -1px
  body:
    fontFamily: SpaceGrotesk_400Regular
    fontSize: 15px
  label:
    fontFamily: SpaceGrotesk_600SemiBold
    fontSize: 16px
rounded:
  button: 16px
  board: 22px
  completion: 20px
spacing:
  action-gap: 12px
  screen: 24px
components:
  button-primary:
    backgroundColor: "{colors.paint}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: 15px 24px
  button-secondary:
    backgroundColor: "{colors.wall}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: 15px 24px
  board-frame:
    backgroundColor: "{colors.recess}"
    rounded: "{rounded.board}"
    padding: 10px
  completion:
    backgroundColor: "{colors.background}"
    rounded: "{rounded.completion}"
    padding: 24px
---

# Design System: Chromaze

## Overview

**Creative North Star: "Find your flow. Leave your color."**

The game is the focal surface: a quiet dark field, a substantial centered board, connected painted corridors, and the equipped visual-kit ball. Original layouts and graphics support the sliding-and-painting mechanic. This records the implemented direction, not a newly approved visual concept.

**Key Characteristics:**
- Maze and responsiveness take priority over decoration.
- Dark tonal surfaces with mint progress, lavender motion, and amber counters.
- Space Grotesk, clear weight changes, and tabular counters.

Source-derived documentation only. Native visual inspection and device performance checks remain pending; TypeScript and Metro bundling cannot certify the final native appearance. CSS units in frontmatter translate React Native logical units for portability.

## Colors

### Primary

Mint remains the brand/primary-action color. Equipped appearance colors drive floor paint, the progress indicator, completion accents, and splatters; Amethyst paints lavender. Prismatic uses a board-anchored lavender-to-indigo gradient.

### Secondary

Amethyst is the default ball. Home opens a scrollable six-ball selector with supplied PNG previews and matching color swatches; every design is immediately available.

### Tertiary

Amber identifies the move count and storage/loading messages.

### Neutral

Background is the quiet page field; wall provides maze walls and secondary controls; floor marks unpainted paths; recess frames the board. Text and muted separate primary copy from instructions and metadata. The shared appearance catalog owns art-space geometry, ball shading, and paint colors.

## Typography

Space Grotesk is bundled through its Expo font package in regular, medium, semibold, and bold. Font loading errors allow system fallback text; that appearance is not verified.

Display is the home wordmark; headline is the level heading; body is the home subtitle; label is button copy. Other observed sizes include instructions (17 with 26 line height), hints and metadata (13), the move count (30), and completion percentage (52). Progress and moves use tabular numerals.

## Layout

Safe areas protect system UI. Gameplay uses a centered column capped at 620 logical units, with 24-unit horizontal padding. For the current square levels, the board canvas size is the smaller of the available play area width minus 24, height minus 24, and 480. Its recess frame adds 10 units on each side. The play area grows between the status header and bottom controls.

Home scrolls when needed. The visual-kit concept informs an upright original maze preview sized to the viewport (up to 340 units), with a transparent brand symbol and native Space Grotesk wordmark; content is capped at 420 units. Home is not the gameplay sizing model. Short-height and small-device layouts still require native inspection.

## Elevation & Depth

Tonal layering gives the maze depth. The renderer offsets the recess by 3 units and draws the actual supplied PNG through Skia with its transparent padding compensated; catalog shading is the decode fallback. Paint is a single opaque cosmetic fill, clipped to the shared floor silhouette; it has no per-tile fades or transient sheen. The completion panel uses a native shadow (black, vertical offset 8, opacity 0.4, radius 18) and Android elevation 8. Ordinary controls have no shadow.

## Shapes

Controls use gently rounded corners; the board frame and completion panel use broader corners. Maze wall slabs use 16-unit corners; floor corners scale to 15% of a cell and connect across neighboring floor tiles. The ball remains circular.

## Components

- **Buttons:** Primary mint and secondary wall-tone fills; minimum height 54. Decorative visual-kit glyphs accompany text labels. Pressed opacity is 0.8 with scale 0.98; disabled opacity is 0.35. No custom keyboard-focus or hover styling exists in the native source.
- **Progress:** A six-unit appearance-colored fill on a wall-tone track, with painted/total text and an accessible progress value.
- **Maze board:** Skia reads UI-thread motion geometry and progress, updated atomically. Movement is linear at 50 ms per tile; a full-width ribbon follows the animated cell footprint and becomes permanent with identical coverage. Shared winding removes internal tile seams, and floor clipping constrains both live and committed paint. The supplied ball texture shares the existing continuous position transform. Committed grid-space paint is published atomically with the next motion; resizing changes only its drawing scale. A fixed pool of at most 12 small droplets emits no faster than one per 40 ms, fades in 180–260 ms, and is clipped by the same floor silhouette. Reduced Motion disables droplets. JS receives deliberate commands, reached tile centers, and slide completions; progress-label updates do not rerender the memoized board. One latest direction is buffered during each slide. Undo and restart disable while sliding; Home cancels safely. The header uses a fixed Home slot and a flexible, single-line title so the controls cannot overlap.
- **Completion:** Appears after the slide commits. Percentage and copy communicate success independently of motion; the panel fades and settles from scale 0.97 to 1 over 280 ms, respecting system reduced motion. Content scrolls within the measured play area. It offers next/home and undo actions.
- **Navigation:** Home/continue actions enter gameplay; Choose ball opens a separate scrollable selection screen with Back/Done and Android Back handling. There is no tab bar.

## Do's and Don'ts

### Do:
- **Do** keep the responsive maze primary.
- **Do** preserve the established dark palette and original visual identity.
- **Do** keep ball movement and paint synchronized.

### Don't:
- **Don't** use the mechanical reference game's layouts or graphics.
- **Don't** treat source checks as native visual approval.

## Visual Kit v1

Launcher branding uses the supplied app icon and Android adaptive foreground on the established navy background. Gameplay glyphs and the Home symbol are bundled PNGs; concept previews are never displayed as UI. All six ball PNGs in assets/balls are bundled for preview and Skia gameplay; SVG sources remain available. The selected ID is stored separately from progression, defaults to Amethyst, and has serialized writes plus retry UI. There are no cosmetic unlocks or purchases. Optional Expo SDK 57 haptics provide one light stop tick per committed slide and a success response on completion, without awaiting hardware in the movement path. See docs/VISUAL-KIT.md for native device checks.

# Ball assets

Chromaze Visual Kit v1 supplies Amethyst, Spearmint, Sunset, Coral, Cobalt, and Prismatic as 512×512 transparent PNGs with SVG sources. All six PNGs are used by native selection previews and the existing Skia gameplay canvas. No unlocking or purchase is required.

Appearance names, paint colors, shading fallbacks, and the common art-space center/radius live in src/appearance.ts. Literal Metro asset imports live in src/assets.ts. Gameplay compensates for transparent padding so every design has the same visible radius and animated center. PNGs include their own highlights/shadows; SVGs are retained as editable source.

The default is Amethyst; its paint is lavender. Prismatic paints a spatial lavender/indigo gradient. Cosmetic preference storage is independent of level progression. See docs/VISUAL-KIT.md for device checks.

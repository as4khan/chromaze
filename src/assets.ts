/** Static Metro asset references for branding, actions, and the six Skia-compatible ball textures. */
export const brand = { symbol: require('../assets/brand/chromaze_symbol.png') };
export const icons = {
  play: require('../assets/ui/play_light.png'), home: require('../assets/ui/home_light.png'),
  undo: require('../assets/ui/undo_light.png'), restart: require('../assets/ui/restart_light.png'),
  next: require('../assets/ui/next_light.png'), moves: require('../assets/ui/moves_mint.png'),
  paint: require('../assets/ui/paint_mint.png'), sparkle: require('../assets/ui/sparkle_mint.png'),
};

// Keep Metro requires literal; appearance.ts owns all cosmetic names, colors, and art-space geometry.
export const ballImages = {
  amethyst: require('../assets/balls/01_amethyst.png'), spearmint: require('../assets/balls/02_spearmint.png'),
  sunset: require('../assets/balls/03_sunset.png'), coral: require('../assets/balls/04_coral.png'),
  cobalt: require('../assets/balls/05_cobalt.png'), prismatic: require('../assets/balls/06_prismatic.png'),
};

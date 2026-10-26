/** Raster regressions use Skia's already-installed CanvasKit backend, without native UI or new dependencies. */
import test from 'node:test';
import assert from 'node:assert/strict';
import CanvasKitInit from 'canvaskit-wasm';
import { readFileSync } from 'node:fs';
import { appearances, ballAppearance, BallAppearance } from '../src/appearance';
import { Droplet, dropletOpacity, makeDroplet } from '../src/components/splatterModel';
import { committedPaint, floorOutline, movingWake, paintRibbon } from '../src/components/paintGeometry';
import { commitSlide, complete, floorTiles, initialGame, Level, reachedTiles, slide, undo } from '../src/game/engine';
import { createMovement, finishMovement, requestMovement, resetMovement } from '../src/game/controls';
import { levels } from '../src/game/levels';
import { solve } from '../src/game/solver';

const kit = CanvasKitInit({ locateFile: () => require.resolve('canvaskit-wasm/bin/canvaskit.wasm') });
type State = ReturnType<typeof createMovement>;

/** Rasterize the production silhouette, snapshot, and ribbon as one opaque clipped fill. */
async function raster(level: Level, state: State, progress = 0, cell = 17.3, floorOnly = false, appearance: BallAppearance = ballAppearance('spearmint'), splashes?: { drops: Droplet[]; now: number }) {
  const ck = await kit;
  const width = Math.ceil(level.grid[0]!.length * cell), height = Math.ceil(level.grid.length * cell);
  const surface = ck.MakeSurface(width, height)!;
  const canvas = surface.getCanvas();
  const floor = ck.Path.MakeFromSVGString(floorOutline(level, cell))!;
  const base = ck.Path.MakeFromSVGString(committedPaint(level, state.game.painted, 1))!;
  const builder = new ck.PathBuilder();
  builder.addPath(base);
  if (state.active) {
    const a = state.active, end = a.path.at(-1)!;
    const r = paintRibbon(a.origin.row, a.origin.col, end.row, end.col, progress, 1);
    builder.addRect(ck.XYWHRect(r.x, r.y, r.width, r.height));
  }
  const path = builder.detachAndDelete();
  const paint = new ck.Paint();
  paint.setAntiAlias(true); paint.setColor(ck.parseColorString(appearance.paint[0]!));
  const shader = appearance.paint.length > 1 ? ck.Shader.MakeLinearGradient([0, 0],
    [level.grid[0]!.length, level.grid.length], appearance.paint.map(c => ck.parseColorString(c)), null, ck.TileMode.Clamp) : null;
  if (shader) paint.setShader(shader);
  canvas.clear(ck.TRANSPARENT);
  if (floorOnly) canvas.drawPath(floor, paint);
  else {
    canvas.clipPath(floor, ck.ClipOp.Intersect, true); canvas.save(); canvas.scale(cell, cell);
    canvas.drawPath(path, paint);
    if (splashes) for (const d of splashes.drops) {
      const t = Math.max(0, Math.min(1, (splashes.now - d.born) / d.life));
      paint.setAlphaf(dropletOpacity(d, splashes.now));
      canvas.drawOval(ck.XYWHRect(d.x + d.vx * t - d.radius, d.y + d.vy * t - d.radius * d.aspect,
        d.radius * 2, d.radius * d.aspect * 2), paint);
    }
    canvas.restore();
  }
  surface.flush();
  const image = surface.makeImageSnapshot();
  const pixels = image.readPixels(0, 0, { width, height, colorType: ck.ColorType.RGBA_8888,
    alphaType: ck.AlphaType.Unpremul, colorSpace: ck.ColorSpace.SRGB })!;
  const result = Uint8Array.from(pixels);
  image.delete(); shader?.delete(); paint.delete(); path.delete(); base.delete(); floor.delete(); surface.dispose();
  return { pixels: result, width, height };
}
function equalCoverage(a: Uint8Array, b: Uint8Array) {
  assert.equal(a.length, b.length);
  // CanvasKit varies by up to 8/255 alpha at fractional boundary edges on dense layouts.
  // Fully solid/empty pixels remain exact; interior-fill and wall-containment tests stay strict.
  for (let i = 3; i < a.length; i += 4) {
    const edge = (a[i]! > 0 && a[i]! < 255) || (b[i]! > 0 && b[i]! < 255);
    assert.ok(Math.abs(a[i]! - b[i]!) <= (edge ? 8 : 0), 'Paint coverage changed at pixel ' + (i - 3) / 4 + ': ' + a[i] + ' vs ' + b[i]);
  }
}

test('long slides fill behind the ball continuously without internal tile seams', async () => {
  const level: Level = { id: 1, name: 'Long', start: { row: 0, col: 0 }, grid: ['............'] };
  const moving = requestMovement(level, createMovement(level), 'right');
  let last = (await raster(level, moving, 0)).pixels;
  for (const t of [0.01, 0.12, 0.33, 0.61, 0.99, 1]) {
    const frame = await raster(level, moving, t);
    for (let i = 3; i < last.length; i += 4) assert.ok(frame.pixels[i]! + 1 >= last[i]!, 'Paint flickered backwards');
    const front = paintRibbon(0, 0, 0, 11, t, 17.3).width;
    for (let x = 4; x < Math.floor(front) - 1; x++) {
      assert.equal(frame.pixels[(8 * frame.width + x) * 4 + 3], 255, 'Seam behind the ribbon at x=' + x);
    }
    // The visual front advances continuously; progress still counts only reached centers.
    assert.equal(reachedTiles(11, t), Math.min(11, Math.floor(11 * t + 0.00001)));
    last = frame.pixels;
  }
});

for (const direction of ['up', 'down', 'left', 'right'] as const) test('ribbon follows the moving footprint without overshoot: ' + direction, () => {
  const level: Level = { id: 1, name: 'Cross', start: { row: 2, col: 2 }, grid: ['.....', '.....', '.....', '.....', '.....'] };
  const end = slide(level, level.start, direction).at(-1)!;
  for (const t of [0, 0.03, 0.5, 0.99, 1]) {
    const r = paintRibbon(2, 2, end.row, end.col, t, 20);
    const col = 2 + (end.col - 2) * t, row = 2 + (end.row - 2) * t;
    assert.equal(r.x, Math.min(2, col) * 20); assert.equal(r.y, Math.min(2, row) * 20);
    assert.ok(Math.abs(r.x + r.width - (Math.max(2, col) + 1) * 20) < 1e-8);
    assert.ok(Math.abs(r.y + r.height - (Math.max(2, row) + 1) * 20) < 1e-8);
  }
  assert.deepEqual(paintRibbon(2, 2, end.row, end.col, -1, 20), paintRibbon(2, 2, end.row, end.col, 0, 20));
  assert.deepEqual(paintRibbon(2, 2, end.row, end.col, 2, 20), paintRibbon(2, 2, end.row, end.col, 1, 20));
});

for (const level of levels) test('level ' + level.id + ': turns, revisits, commit, and completion preserve raster coverage', async () => {
  let state = createMovement(level);
  const solution = solve(level)!;
  for (let i = 0; i < solution.length; i++) {
    if (!state.active) state = requestMovement(level, state, solution[i]!);
    assert.ok(state.active);
    const ending = (await raster(level, state, 1)).pixels;
    // Queue the next direction before finishing, exercising the same handoff as continuous thumb dragging.
    if (solution[i + 1]) state = requestMovement(level, state, solution[i + 1]!);
    state = finishMovement(level, state, state.active!.id);
    equalCoverage(ending, (await raster(level, state, 0)).pixels);
  }
  assert.equal(state.phase, 'completing'); assert.equal(complete(level, state.game), true);
  const painted = (await raster(level, state)).pixels;
  const floor = (await raster(level, state, 0, 17.3, true)).pixels;
  // Outer antialiasing differs between drawing and clipping; every fully interior floor pixel must be opaque.
  for (let i = 3; i < floor.length; i += 4) if (floor[i] === 255) assert.equal(painted[i], 255, 'Unfilled interior floor');
  assert.equal(state.game.painted.length, floorTiles(level).length);
});

test('floor clipping bounds all partial frames, including edges next to walls', async () => {
  const level = levels[1]!;
  let state = createMovement(level);
  const floor = (await raster(level, state, 0, 17.3, true)).pixels;
  for (const direction of solve(level)!) {
    const moving = requestMovement(level, state, direction);
    for (const t of [0, 0.15, 0.49, 0.78, 0.99, 1]) {
      const paint = (await raster(level, moving, t)).pixels;
      for (let i = 3; i < paint.length; i += 4) assert.ok(paint[i]! <= floor[i]! + 1, 'Paint escaped the floor mask');
    }
    state = finishMovement(level, moving, moving.active!.id);
  }
});

test('Undo and Restart remove paint and reject stale animation completions', async () => {
  const level = levels[0]!;
  const initial = createMovement(level);
  const first = requestMovement(level, initial, 'right');
  const stopped = finishMovement(level, first, first.active!.id);
  const second = requestMovement(level, stopped, 'down');
  const twice = finishMovement(level, second, second.active!.id);
  equalCoverage((await raster(level, resetMovement(level, twice, undo(twice.game)))).pixels, (await raster(level, stopped)).pixels);
  const restarted = resetMovement(level, second);
  equalCoverage((await raster(level, restarted)).pixels, (await raster(level, initial)).pixels);
  assert.equal(finishMovement(level, restarted, second.active!.id), restarted);
});

test('revisiting a painted corridor never changes its opacity or coverage', async () => {
  const level = levels[0]!;
  const right = requestMovement(level, createMovement(level), 'right');
  const stopped = finishMovement(level, right, right.active!.id);
  const reference = (await raster(level, stopped)).pixels;
  const reverse = requestMovement(level, stopped, 'left');
  for (const t of [0, 0.03, 0.37, 0.73, 0.99, 1]) equalCoverage(reference, (await raster(level, reverse, t)).pixels);
});

for (const appearance of appearances) test(appearance.name + ': supplied PNG decodes and colored paint survives turns, commits, Undo, Restart, and completion', async () => {
  const ck = await kit;
  const image = ck.MakeImageFromEncoded(readFileSync('assets/balls/' + appearance.asset));
  assert.ok(image); assert.equal(image.width(), 512); assert.equal(image.height(), 512);
  const center = image.readPixels(256, 254, { width: 1, height: 1, colorType: ck.ColorType.RGBA_8888,
    alphaType: ck.AlphaType.Unpremul, colorSpace: ck.ColorSpace.SRGB })!;
  assert.equal(center[3], 255); image.delete();
  const level = levels[0]!; let state = createMovement(level);
  const initial = (await raster(level, state, 0, 23.7, false, appearance)).pixels;
  for (const direction of solve(level)!) {
    const previous = state;
    const moving = requestMovement(level, state, direction);
    const ending = (await raster(level, moving, 1, 23.7, false, appearance)).pixels;
    state = finishMovement(level, moving, moving.active!.id);
    const committed = (await raster(level, state, 0, 23.7, false, appearance)).pixels;
    for (let i = 0; i < ending.length; i++) assert.ok(Math.abs(ending[i]! - committed[i]!) <= 1, 'Color or coverage changed on commit');
    equalCoverage((await raster(level, resetMovement(level, state, undo(state.game)), 0, 23.7, false, appearance)).pixels,
      (await raster(level, previous, 0, 23.7, false, appearance)).pixels);
  }
  assert.equal(complete(level, state.game), true);
  equalCoverage((await raster(level, resetMovement(level, state), 0, 23.7, false, appearance)).pixels, initial);
});

test('Prismatic uses spatial color variation without changing the permanent geometry', async () => {
  const level = levels[0]!; const moving = requestMovement(level, createMovement(level), 'right');
  const prism = await raster(level, moving, 1, 20, false, ballAppearance('prismatic'));
  const mint = await raster(level, moving, 1, 20);
  equalCoverage(prism.pixels, mint.pixels);
  const left = Array.from(prism.pixels.slice((10 * prism.width + 10) * 4, (10 * prism.width + 10) * 4 + 3));
  const right = Array.from(prism.pixels.slice((10 * prism.width + 85) * 4, (10 * prism.width + 85) * 4 + 3));
  assert.notDeepEqual(left, right);
});

test('cosmetic droplets remain clipped to the floor, expire, and leave tile counts untouched', async () => {
  const level = levels[1]!, state = createMovement(level);
  const snapshot = JSON.stringify(state);
  const floor = (await raster(level, state, 0, 20, true)).pixels;
  const drops = Array.from({ length: 12 }, (_, i) => makeDroplet(i, 1000, 0, i % 3, 1, 0));
  for (const appearance of appearances) {
    const frame = (await raster(level, state, 0, 20, false, appearance, { drops, now: 1080 })).pixels;
    for (let i = 3; i < frame.length; i += 4) if (floor[i] === 0) assert.equal(frame[i], 0, 'Droplet outside floor');
    const expired = (await raster(level, state, 0, 20, false, appearance, { drops, now: 1500 })).pixels;
    equalCoverage(expired, (await raster(level, state, 0, 20, false, appearance)).pixels);
  }
  assert.equal(JSON.stringify(state), snapshot);
});

test('wet wake follows behind the ball in every direction and vanishes at both handoff endpoints', () => {
  for (const [row, col] of [[0, 4], [0, -4], [4, 0], [-4, 0]]) {
    assert.equal(movingWake(0, 0, row!, col!, 0).opacity, 0);
    assert.equal(movingWake(0, 0, row!, col!, 1).opacity, 0);
    for (const t of [0.05, 0.25, 0.5, 0.9, 0.99]) {
      const wake = movingWake(0, 0, row!, col!, t);
      const dx = Math.sign(col!), dy = Math.sign(row!), travel = 4 * t;
      const start = (wake.from.x - 0.5) * dx + (wake.from.y - 0.5) * dy;
      const end = (wake.to.x - 0.5) * dx + (wake.to.y - 0.5) * dy;
      assert.ok(start >= -1e-8 && start <= end && end <= travel);
      assert.ok(wake.opacity > 0 && wake.opacity <= 0.55);
    }
    assert.equal(movingWake(0, 0, row!, col!, 0.5).opacity, 0.55);
  }
  assert.equal(movingWake(0, 0, 0, 0, 0.5).opacity, 0);
});

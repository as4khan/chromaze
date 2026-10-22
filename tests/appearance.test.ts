/** Cosmetic catalog, preference I/O, and droplet regressions without native hardware. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { appearances, ballAppearance, BallId, parseBallPreference } from '../src/appearance';
import { dropletOpacity, makeDroplet, SPLATTER_LIMIT, SPLATTER_INTERVAL } from '../src/components/splatterModel';

const compiled = ts.transpileModule(readFileSync('src/storage/preferences.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
/** Only replace AsyncStorage's native transport; validation and write ordering execute the real module. */
function preferences(storage: { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> }) {
  const exports = {} as { BALL_KEY: string; loadBall: () => Promise<BallId>; saveBall: (id: BallId) => Promise<void> };
  runInNewContext(compiled, { exports, require: (name: string) => {
    if (name === '@react-native-async-storage/async-storage') return { __esModule: true, default: storage };
    if (name === '../appearance') return { parseBallPreference };
    throw Error('Unexpected import: ' + name);
  } });
  return exports;
}
test('all six available balls have matching supplied assets and distinct paint appearances', () => {
  assert.deepEqual(appearances.map(b => b.id), ['amethyst', 'spearmint', 'sunset', 'coral', 'cobalt', 'prismatic']);
  assert.equal(new Set(appearances.map(b => b.paint.join(','))).size, 6);
  for (const ball of appearances) {
    assert.equal(ballAppearance(ball.id), ball);
    const png = readFileSync('assets/balls/' + ball.asset);
    assert.equal(png.readUInt32BE(16), 512); assert.equal(png.readUInt32BE(20), 512);
    const svg = readFileSync('assets/balls/' + ball.asset.replace('.png', '.svg'), 'utf8');
    for (const color of [...ball.paint, ...ball.shading]) assert.ok(svg.includes(color), 'Color must derive from supplied art: ' + color);
  }
  assert.equal(ballAppearance('prismatic').paint.length, 3);
});
test('existing players and malformed or obsolete preferences default to Amethyst', () => {
  for (const raw of [null, '', '{', 'null', 'false', '12', '{}', '[]', '"retired"']) assert.equal(parseBallPreference(raw), 'amethyst');
  for (const ball of appearances) assert.equal(parseBallPreference(JSON.stringify(ball.id)), ball.id);
});
test('each equipped ball persists and reloads using a separate cosmetic key', async () => {
  const values = new Map<string, string>([['@chromaze/progression/v1', '{"unlocked":3,"finished":true}']]);
  const store = { getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { values.set(key, value); } };
  const prefs = preferences(store);
  assert.notEqual(prefs.BALL_KEY, '@chromaze/progression/v1');
  for (const ball of appearances) { await prefs.saveBall(ball.id); assert.equal(await preferences(store).loadBall(), ball.id); }
  assert.equal(values.get('@chromaze/progression/v1'), '{"unlocked":3,"finished":true}');
});
test('rapid selections serialize writes and recover after an earlier failed save', async () => {
  const started: string[] = [];
  let release!: () => void;
  const first = new Promise<void>(resolve => { release = resolve; });
  let value: string | null = null;
  const prefs = preferences({ getItem: async () => value, setItem: async (_key, next) => {
    started.push(next);
    if (next === '"coral"') { await first; throw Error('Storage temporarily unavailable'); }
    value = next;
  } });
  const old = prefs.saveBall('coral');
  const latest = prefs.saveBall('cobalt');
  // Allow the first queued operation to start, without allowing it to finish.
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(started, ['"coral"']);
  release(); await assert.rejects(old); await latest;
  assert.deepEqual(started, ['"coral"', '"cobalt"']); assert.equal(await prefs.loadBall(), 'cobalt');
});
test('storage read failure is reported instead of silently overwriting the saved preference', async () => {
  const prefs = preferences({ getItem: async () => { throw Error('Unavailable'); }, setItem: async () => {} });
  await assert.rejects(prefs.loadBall());
});
test('droplets stay bounded, varied, cosmetic, and fade in 180–260 ms including after resume', () => {
  const drops = Array.from({ length: 40 }, (_, i) => makeDroplet(i, 1000, 2, 3, 1, 0));
  assert.ok(SPLATTER_LIMIT <= 16); assert.ok(SPLATTER_INTERVAL >= 35);
  assert.ok(new Set(drops.map(d => d.radius)).size > 10); assert.ok(new Set(drops.map(d => d.alpha)).size > 10);
  for (const d of drops) {
    assert.ok(d.radius >= 0.045 && d.radius <= 0.101); assert.ok(d.life >= 150 && d.life <= 300);
    assert.ok(d.x <= 3.12 && Math.abs(d.y - 2.5) <= 0.341, 'Emit visibly behind the ball and inside the corridor');
    assert.ok(d.alpha >= 0.65 && d.alpha <= 0.9);
    assert.ok(dropletOpacity(d, 1000 + d.life / 2) >= 0.325, 'Drops remain visible halfway through fading');
    assert.equal(dropletOpacity(d, 1000), d.alpha);
    assert.ok(dropletOpacity(d, 1100) < d.alpha); assert.equal(dropletOpacity(d, 1000 + d.life), 0);
    assert.equal(dropletOpacity(d, 100000), 0);
  }
});

test('the real particle frame callback expires the final droplets before sleeping and keeps a fixed pool', () => {
  const source = ts.transpileModule(readFileSync('src/components/Splatter.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const shared: { value: unknown }[] = [];
  let frame: ((info: { timestamp: number }) => void) | undefined;
  const exports = {} as { Splatter: (props: unknown) => unknown };
  runInNewContext(source, { exports, require: (name: string) => {
    if (name === 'react') return { useEffect: (fn: () => void) => fn(), useRef: (value: unknown) => ({ current: value }) };
    if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null };
    if (name === '@shopify/react-native-skia') return {};
    if (name === './splatterModel') return { makeDroplet, dropletOpacity, SPLATTER_LIMIT, SPLATTER_INTERVAL };
    if (name === 'react-native-reanimated') return { useReducedMotion: () => false,
      useSharedValue: (value: unknown) => { const v = { value }; shared.push(v); return v; },
      useFrameCallback: (callback: (info: { timestamp: number }) => void) => { frame = callback; } };
    throw Error('Unexpected import: ' + name);
  } });
  const progress = { value: 0.5 };
  exports.Splatter({ motion: { value: { id: 1, distance: 4, fromRow: 0, fromCol: 0, toRow: 0, toCol: 4 } },
    progress, activeId: 1, historyLength: 0, cell: 20, appearance: appearances[0], width: 100, height: 100 });
  assert.ok(frame);
  for (let time = 0; time <= 1000; time += 40) frame({ timestamp: time });
  const drops = shared[0]!.value as ReturnType<typeof makeDroplet>[];
  assert.equal(drops.length, SPLATTER_LIMIT);
  progress.value = 1;
  frame({ timestamp: 1100 }); frame({ timestamp: 1500 });
  const clock = shared[1]!.value as number;
  for (const drop of drops) assert.equal(dropletOpacity(drop, clock), 0, 'A last partially faded droplet froze while idle');
  frame({ timestamp: 1700 }); assert.equal(shared[1]!.value, clock, 'Idle frames should not update Skia');
});

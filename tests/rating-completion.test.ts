/** Exercise the actual screen finish/Undo callbacks and result content without a native runtime. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as engine from '../src/game/engine';
import * as controls from '../src/game/controls';
import * as catalog from '../src/game/levels';
import * as ratings from '../src/game/ratings';
import * as geometry from '../src/components/paintGeometry';
import { solve } from '../src/game/solver';
import { ballAppearance } from '../src/appearance';
import { theme } from '../src/theme';

type Node = { type: any; props: Record<string, any> };
function fixture(initialBest: number | null = null, detours = 0) {
  const level = catalog.levels[0]!;
  const solution: engine.Direction[] = [...Array.from({ length: detours }, () => ['right', 'left'] as const).flat(), ...solve(level)!];
  let movement = controls.createMovement(level);
  for (const direction of solution.slice(0, -1)) { movement = controls.requestMovement(level, movement, direction); movement = controls.finishMovement(level, movement, movement.active!.id); }
  movement = controls.requestMovement(level, movement, solution.at(-1)!);
  const slots: any[] = []; let cursor = 0, best = initialBest;
  const reports: [number, number][] = [];
  const state = (initial: any) => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
    return [slots[i], (next: any) => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; };
  const memo = (factory: () => any, deps: any[]) => { const i = cursor++, prev = slots[i];
    if (!prev || deps.some((v, j) => !Object.is(v, prev.deps[j]))) slots[i] = { deps, value: factory() }; return slots[i].value; };
  const ref = (value: any) => { const [stored] = state(() => ({ current: value })); return stored; };
  const react = { useState: state, useRef: ref, useMemo: memo, useCallback: (fn: any, deps: any[]) => memo(() => fn, deps), useEffect: () => {} };
  const jsx = (type: any, props: any) => ({ type, props });
  const builder = () => { const gesture: any = {}; for (const method of ['minDistance', 'maxPointers', 'enabled', 'onBegin', 'onUpdate', 'onEnd', 'onFinalize']) gesture[method] = (value: any) => { gesture[method + 'Value'] = value; return gesture; }; return gesture; };
  const exports = {} as { GameScreen: (props: any) => Node };
  const compiled = ts.transpileModule(readFileSync('src/screens/GameScreen.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(compiled, { exports, require: (name: string) => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react-native') return { BackHandler: { addEventListener: () => ({ remove() {} }) }, Image: 'Image', View: 'View', Text: 'Text', ScrollView: 'Scroll', useWindowDimensions: () => ({ height: 800 }), StyleSheet: { create: (v: any) => v } };
    if (name === 'react-native-gesture-handler') return { Gesture: { Pan: builder }, GestureDetector: 'Detector' };
    if (name === 'react-native-reanimated') return { __esModule: true, default: { View: 'AnimatedView' }, runOnJS: (fn: any) => fn, useSharedValue: ref, useAnimatedStyle: (fn: any) => fn(), withTiming: (v: any) => v, ReduceMotion: { System: 'system' } };
    if (name === '../game/engine') return engine;
    if (name === '../game/controls') return { ...controls, createMovement: () => movement };
    if (name === '../game/levels') return catalog;
    if (name === '../game/ratings') return ratings;
    if (name === '../components/paintGeometry') return geometry;
    if (name === '../theme') return { theme };
    if (name === '../feedback') return { slideFeedback: async () => {} };
    if (name === '../assets') return { icons: {} };
    if (name.startsWith('../components/')) { const key = name.split('/').at(-1)!; return { [key]: key }; }
    throw Error(name);
  } });
  const onComplete = (index: number, moves: number) => { reports.push([index, moves]); best = Math.min(moves, best ?? moves); };
  const props = { index: 0, onHome() {}, onNext() {}, onComplete, appearance: ballAppearance('amethyst') };
  const render = () => { cursor = 0; return exports.GameScreen({ ...props, personalBest: best }); };
  const all = (node: any, match: (node: Node) => boolean): Node[] => Array.isArray(node) ? node.flatMap(n => all(n, match)) : !node || typeof node !== 'object' ? [] : [...(match(node) ? [node] : []), ...all(node.props?.children, match)];
  const find = (type: string) => { const node = all(render(), n => n.type === type || n.type?.name === type)[0]; assert.ok(node, type); return node; };
  all(render(), n => !!n.props?.onLayout)[0]!.props.onLayout({ nativeEvent: { layout: { width: 320, height: 400 } } });
  return { find, all, reports, render, setBest: (value: number) => { best = value; }, renderResult: () => { const node = find('Completion'); cursor = 100; return node.type(node.props); },
    lastDirection: solution.at(-1)! };
}
test('completion reports the final committed move, ignores stale callbacks, and retains awards through Undo/Restart', () => {
  const game = fixture(), board = game.find('MazeBoard');
  assert.equal(board.props.game.moves, 4); board.props.onFinish(board.props.active.id);
  assert.deepEqual(game.reports, [[0, 5]]);
  board.props.onFinish(board.props.active.id); assert.equal(game.reports.length, 1);
  let result = game.find('Completion'); assert.equal(result.props.moves, 5); assert.equal(result.props.optimalMoves, 5);
  assert.equal(result.props.previousBest, null); assert.equal(result.props.personalBest, 5);
  const rendered = game.renderResult();
  assert.equal(game.all(rendered, n => n.type === 'RatingStars')[0]!.props.value, 3);
  assert.ok(game.all(rendered, n => n.props?.children === 'New personal best').length);
  result.props.onUndo(); assert.equal(game.find('MazeBoard').props.game.moves, 4);
  const gesture = game.find('Detector').props.gesture; gesture.onBeginValue();
  const d = game.lastDirection; gesture.onEndValue({ translationX: d === 'right' ? 30 : d === 'left' ? -30 : 0, translationY: d === 'down' ? 30 : d === 'up' ? -30 : 0 });
  const replay = game.find('MazeBoard'); replay.props.onFinish(replay.props.active.id);
  result = game.find('Completion'); assert.equal(result.props.previousBest, 5); assert.equal(result.props.personalBest, 5);
  assert.equal(game.reports.length, 2);
  game.all(game.renderResult(), n => n.type === 'Button' && n.props.label === 'Undo last slide')[0]!.props.onPress();
  game.all(game.render(), n => n.type === 'Button' && n.props.label === 'Restart')[0]!.props.onPress();
  const restarted = game.find('MazeBoard'); assert.equal(restarted.props.game.moves, 0); assert.equal(restarted.props.game.history.length, 0);
  assert.deepEqual(game.reports, [[0, 5], [0, 5]]);
});
test('a recovered personal best during a slide does not change the animation finish callback', () => {
  const game = fixture(10), finish = game.find('MazeBoard').props.onFinish;
  game.setBest(8); assert.equal(game.find('MazeBoard').props.onFinish, finish);
  const board = game.find('MazeBoard'); finish(board.props.active.id);
  assert.equal(game.find('Completion').props.previousBest, 8);
});

for (const [detours, stars, moves] of [[1, 2, 7], [2, 1, 9]] as const) test(stars + '-star replay shows run efficiency while retaining the stronger personal best', () => {
  const game = fixture(5, detours), board = game.find('MazeBoard');
  board.props.onFinish(board.props.active.id);
  const result = game.find('Completion'); assert.equal(result.props.moves, moves); assert.equal(result.props.personalBest, 5);
  const rendered = game.renderResult();
  assert.equal(game.all(rendered, n => n.type === 'RatingStars')[0]!.props.value, stars);
  assert.equal(game.all(rendered, n => n.props?.children === 'New personal best').length, 0);
});

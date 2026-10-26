/** Exercise real App navigation, replay ratings, and save callbacks with native views replaced in Node. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { levels } from '../src/game/levels';
import * as progression from '../src/game/progression';
import * as appearance from '../src/appearance';
import { theme } from '../src/theme';

type Element = { type: unknown; props: Record<string, any> };
/** Only native views, hooks scheduling, and storage are stubbed; the App callback logic is unchanged. */
async function appFixture(initial = progression.emptyProgress) {
  const slots: unknown[] = []; let cursor = 0;
  const saves: progression.Progress[] = [];
  const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props });
  const react = {
    useState: (value: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = value;
      return [slots[i], (next: unknown) => { slots[i] = typeof next === 'function' ? (next as (v: unknown) => unknown)(slots[i]) : next; }]; },
    useRef: (value: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = { current: value }; return slots[i]; },
    useEffect: (callback: () => void) => { const i = cursor++; if (!(i in slots)) { slots[i] = true; callback(); } },
    useCallback: (callback: unknown) => callback,
  };
  const exports = {} as { default: () => Element };
  const source = ts.transpileModule(readFileSync('App.tsx', 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  runInNewContext(source, { exports, require: (name: string) => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react-native') return { ActivityIndicator: 'Spinner', Text: 'Text', View: 'View', StyleSheet: { create: (v: unknown) => v } };
    if (name === 'react-native-gesture-handler') return { GestureHandlerRootView: 'GestureRoot' };
    if (name === 'react-native-safe-area-context') return { SafeAreaProvider: 'SafeProvider', SafeAreaView: 'SafeView' };
    if (name === 'expo-status-bar') return { StatusBar: 'StatusBar' };
    if (name === '@expo-google-fonts/space-grotesk') return { useFonts: () => [true, null] };
    if (name.startsWith('./src/screens/')) { const screen = name.split('/').at(-1)!; return { [screen]: screen }; }
    if (name === './src/game/levels') return { levels };
    if (name === './src/game/progression') return progression;
    if (name === './src/appearance') return appearance;
    if (name === './src/theme') return { theme };
    if (name === './src/storage/preferences') return { loadBall: async () => 'amethyst', saveBall: async () => {} };
    if (name === './src/storage/progression') return { emptyProgress: progression.emptyProgress, loadProgress: async () => initial,
      saveProgress: async (value: progression.Progress) => { saves.push(value); return value; } };
    throw Error('Unexpected App import: ' + name);
  } });
  const render = () => { cursor = 0; return exports.default(); };
  const find = (node: unknown, name: string): Element | undefined => {
    if (Array.isArray(node)) return node.map(value => find(value, name)).find(Boolean);
    if (!node || typeof node !== 'object') return undefined;
    const element = node as Element;
    return element.type === name ? element : find(element.props?.children, name);
  };
  const screen = (name: string) => { const result = find(render(), name); assert.ok(result, name + ' should be visible'); return result.props; };
  render(); await new Promise<void>(resolve => setImmediate(resolve));
  return { screen, saves, flush: () => new Promise<void>(resolve => setImmediate(resolve)) };
}
test('Home, selector, locked selection, completion, next level, and replay use the same unlock rules', async () => {
  const app = await appFixture();
  app.screen('HomeScreen').onLevels();
  let selection = app.screen('LevelSelectionScreen');
  selection.onPlay(19); selection = app.screen('LevelSelectionScreen');
  selection.onBack(); app.screen('HomeScreen').onLevels();
  app.screen('LevelSelectionScreen').onPlay(0);
  const first = app.screen('GameScreen'); assert.equal(first.index, 0);
  first.onComplete(0, 10); await app.flush();
  first.onNext(); assert.equal(app.screen('GameScreen').index, 1);
  app.screen('GameScreen').onHome(); app.screen('HomeScreen').onLevels();
  selection = app.screen('LevelSelectionScreen'); assert.deepEqual(selection.progress.completed, [1]); assert.equal(selection.progress.unlocked, 2);
  selection.onPlay(0); const replay = app.screen('GameScreen'); replay.onComplete(0, 5); await app.flush();
  assert.deepEqual(app.saves.at(-1)!.completed, [1]);
  assert.deepEqual(app.saves.at(-1)!.records[1], { bestMoves: 5, stars: 3 });
  assert.equal(app.screen('GameScreen').personalBest, 5);
  app.screen('GameScreen').onComplete(0, 12); await app.flush();
  assert.deepEqual(app.saves.at(-1)!.records[1], { bestMoves: 5, stars: 3 });
  app.screen('GameScreen').onHome(); app.screen('HomeScreen').onLevels();
  assert.equal(progression.totalStars(app.screen('LevelSelectionScreen').progress), 3);
});
test('a migrated prototype finisher enters Level 4 and ball selection remains reachable', async () => {
  const migrated = progression.parseProgress('{"unlocked":3,"finished":true}', 20);
  const app = await appFixture(migrated);
  const home = app.screen('HomeScreen'); assert.equal(progression.continueIndex(home.progress, 20), 3);
  home.onCustomize(); app.screen('BallSelectionScreen').onBack();
  app.screen('HomeScreen').onPlay(3); assert.equal(app.screen('GameScreen').index, 3);
});
test('completing Level 20 returns Home with the campaign marked complete', async () => {
  const initial = progression.parseProgress(JSON.stringify({ version: 2, unlocked: 20, completed: Array.from({ length: 19 }, (_, i) => i + 1) }), 20);
  const app = await appFixture(initial); app.screen('HomeScreen').onPlay(19);
  const last = app.screen('GameScreen'); last.onComplete(19, 33); await app.flush(); last.onNext();
  const home = app.screen('HomeScreen'); assert.equal(home.progress.finished, true); assert.equal(home.progress.completed.length, 20);
});

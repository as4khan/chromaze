/** Exercises native feedback boundaries without requiring a device or importing React Native into Node. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Compile the real wrapper and replace only platform/hardware imports; failures remain observable.
const compiled = ts.transpileModule(readFileSync('src/feedback.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function feedback(os: string, fail = false) {
  const calls: unknown[][] = [];
  const emit = (kind: string) => async (value: string) => { calls.push([kind, value]); if (fail) throw Error('No haptic hardware'); };
  const exports = {} as { slideFeedback: (complete: boolean) => Promise<void> };
  runInNewContext(compiled, { exports, require: (name: string) => {
    if (name === 'react-native') return { Platform: { OS: os } };
    if (name === 'expo-haptics') return { notificationAsync: emit('success'), impactAsync: emit('impact'),
      performAndroidHapticsAsync: emit('android'), NotificationFeedbackType: { Success: 'success' },
      ImpactFeedbackStyle: { Light: 'light' }, AndroidHaptics: { Segment_Tick: 'tick' } };
    throw Error('Unexpected import: ' + name);
  } });
  return { run: exports.slideFeedback, calls };
}
test('iOS uses a light stop impact and one distinct completion notification', async () => {
  const f = feedback('ios'); await f.run(false); await f.run(true);
  assert.deepEqual(f.calls, [['impact', 'light'], ['success', 'success']]);
});
test('Android uses its native tick API for a normal stop', async () => {
  const f = feedback('android'); await f.run(false);
  assert.deepEqual(f.calls, [['android', 'tick']]);
});
test('web remains silent for stop and completion', async () => {
  const f = feedback('web'); await f.run(false); await f.run(true); assert.deepEqual(f.calls, []);
});
test('hardware rejection resolves safely on both native platforms', async () => {
  for (const os of ['ios', 'android']) {
    const f = feedback(os, true); await assert.doesNotReject(f.run(false)); await assert.doesNotReject(f.run(true));
  }
});

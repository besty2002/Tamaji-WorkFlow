import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const inputSource = readFileSync(new URL('../src/components/ui/Input.tsx', import.meta.url), 'utf8');

test('Input connects visible labels to inputs for accessibility', () => {
  assert.match(inputSource, /useId/);
  assert.match(inputSource, /htmlFor=\{inputId\}/);
  assert.match(inputSource, /id=\{inputId\}/);
});

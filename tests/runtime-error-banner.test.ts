import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(join(process.cwd(), 'src/main.tsx'), 'utf8');

test('runtime error banner renders untrusted error details as text', () => {
  assert.doesNotMatch(source, /innerHTML/);
  assert.match(source, /textContent/);
  assert.match(source, /実行時エラーが発生しました/);
});

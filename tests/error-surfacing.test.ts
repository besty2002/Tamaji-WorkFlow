import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();

function readSource(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

test('auth profile load errors are surfaced to the UI instead of console only', () => {
  const source = readSource('src/features/auth/AuthContext.tsx');

  assert.doesNotMatch(source, /console\.error/);
  assert.match(source, /authError/);
  assert.match(source, /ErrorState/);
  assert.match(source, /プロフィール情報の取得に失敗しました/);
});

test('business day calculation avoids console side effects for invalid dates', () => {
  const source = readSource('src/lib/utils.ts');

  assert.doesNotMatch(source, /console\.error/);
});

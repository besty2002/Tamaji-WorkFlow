import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const layoutSource = readFileSync(new URL('../src/app/Layout.tsx', import.meta.url), 'utf8');

test('desktop navigation keeps Japanese labels compact without horizontal scrolling', () => {
  assert.doesNotMatch(layoutSource, /overflow-x-auto/);
  assert.match(layoutSource, /md:space-x-0\.5/);
  assert.match(layoutSource, /px-2/);
  assert.match(layoutSource, /text-xs/);
  assert.match(layoutSource, /whitespace-nowrap/);
});

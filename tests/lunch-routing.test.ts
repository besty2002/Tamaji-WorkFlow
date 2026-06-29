import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const router = readFileSync(join(root, 'src/app/router.tsx'), 'utf8');
const layout = readFileSync(join(root, 'src/app/Layout.tsx'), 'utf8');

test('lunch calendar is lazy loaded and routed', () => {
  assert.match(router, /const LunchCalendar = lazy/);
  assert.match(router, /features\/lunch\/LunchCalendar/);
  assert.match(router, /path: '\/lunch'/);
  assert.match(router, /withSuspense\(<LunchCalendar \/>/);
});

test('layout exposes lunch management navigation', () => {
  assert.match(layout, /Utensils/);
  assert.match(layout, /label: 'ランチ管理'/);
  assert.match(layout, /path: '\/lunch'/);
});

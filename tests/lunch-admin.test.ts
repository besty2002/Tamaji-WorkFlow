import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const router = readFileSync(join(root, 'src/app/router.tsx'), 'utf8');
const layout = readFileSync(join(root, 'src/app/Layout.tsx'), 'utf8');

test('lunch settlement screen is routed for managers and admins', () => {
  assert.match(router, /const LunchSettlement = lazy/);
  assert.match(router, /features\/lunch\/LunchSettlement/);
  assert.match(router, /path: '\/lunch\/admin'/);
  assert.match(router, /allowedRoles=\{\['manager', 'admin'\]\}/);
  assert.match(router, /withSuspense\(<LunchSettlement \/>/);
});

test('layout exposes lunch settlement navigation only for managers and admins', () => {
  assert.match(layout, /label: 'ランチ精算'/);
  assert.match(layout, /path: '\/lunch\/admin'/);
  assert.match(layout, /profile\?\.role === 'manager' \|\| profile\?\.role === 'admin'/);
});


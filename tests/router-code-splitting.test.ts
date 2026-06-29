import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const routerSource = readFileSync(new URL('../src/app/router.tsx', import.meta.url), 'utf8');

test('router lazy-loads feature screens instead of statically importing them', () => {
  const staticFeatureImport = /^import\s+\{[^}]+\}\s+from\s+['"]\.\.\/features\//m;

  assert.equal(staticFeatureImport.test(routerSource), false);
  assert.match(routerSource, /lazy\(\(\)\s*=>\s*import\(['"]\.\.\/features\//);
});

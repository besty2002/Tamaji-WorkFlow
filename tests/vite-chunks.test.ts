import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const viteConfigSource = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

test('vite config separates large vendor dependencies into manual chunks', () => {
  assert.match(viteConfigSource, /manualChunks/);
  assert.match(viteConfigSource, /react-vendor/);
  assert.match(viteConfigSource, /supabase-vendor/);
  assert.match(viteConfigSource, /query-vendor/);
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const displaySources = [
  'src/features/requests/Dashboard.tsx',
  'src/features/requests/RequestList.tsx',
  'src/features/manage/ManageRequests.tsx',
].map((target) => readFileSync(join(root, target), 'utf8'));

test('request date displays use natural Japanese date formatting', () => {
  for (const source of displaySources) {
    assert.match(source, /yyyy年 M月 d日/);
    assert.doesNotMatch(source, /yyyy\/MM\/dd/);
  }
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const sources = [
  'src/features/requests/Dashboard.tsx',
  'src/features/requests/RequestList.tsx',
  'src/features/manage/ManageRequests.tsx',
].map((target) => readFileSync(join(root, target), 'utf8'));

test('cancelled request status uses natural Japanese completed-state label', () => {
  for (const source of sources) {
    if (source.includes('cancelled')) {
      assert.match(source, /cancelled: 'キャンセル済み'/);
      assert.doesNotMatch(source, /cancelled: 'キャンセル'/);
    }
  }
});

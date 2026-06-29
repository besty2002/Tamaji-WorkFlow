import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(join(process.cwd(), 'src/features/lunch/LunchCalendar.tsx'), 'utf8');

test('lunch calendar combines calendar view and monthly settlement panel', () => {
  assert.match(source, /ランチ管理/);
  assert.match(source, /今月の合計/);
  assert.match(source, /弁当/);
  assert.match(source, /チンご飯/);
  assert.match(source, /無料日/);
  assert.match(source, /yyyy年 M月/);
  assert.match(source, /\['日', '月', '火', '水', '木', '金', '土'\]/);
});

test('lunch calendar shows participant face and meal markers in date cells', () => {
  assert.match(source, /getFaceEmoji/);
  assert.match(source, /🍱/);
  assert.match(source, /🍚/);
  assert.match(source, /\+ \{dayRecords\.length - 4\} 名/);
});

test('lunch calendar lets the signed-in user save or delete their own record', () => {
  assert.match(source, /from\('lunch_records'\)/);
  assert.match(source, /\.upsert\(/);
  assert.match(source, /\.delete\(\)/);
  assert.match(source, /calculateLunchCost/);
  assert.match(source, /食べない/);
  assert.match(source, /保存しました。/);
  assert.match(source, /削除しました。/);
});

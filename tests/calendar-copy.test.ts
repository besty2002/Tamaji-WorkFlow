import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(join(process.cwd(), 'src/features/calendar/LeaveCalendar.tsx'), 'utf8');

test('leave calendar uses natural Japanese labels and date formats', () => {
  assert.match(source, /休暇カレンダー/);
  assert.match(source, /チームの休暇スケジュールを確認できます。/);
  assert.match(source, /yyyy年 M月/);
  assert.match(source, /yyyy年 M月 d日/);
  assert.match(source, /\['日', '月', '火', '水', '木', '金', '土'\]/);
});

test('leave calendar details use natural Japanese copy', () => {
  assert.match(source, /選択した日付/);
  assert.match(source, /午前半休/);
  assert.match(source, /午後半休/);
  assert.match(source, /休暇中のメンバーはいません。/);
  assert.match(source, /\+ \{dayRequests\.length - 3\} 名/);
});

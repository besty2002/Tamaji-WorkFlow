import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const notificationList = readFileSync(join(root, 'src/features/notifications/NotificationList.tsx'), 'utf8');
const notificationBell = readFileSync(join(root, 'src/components/ui/NotificationBell.tsx'), 'utf8');

test('notification surfaces use natural Japanese labels', () => {
  assert.match(notificationList, /戻る/);
  assert.match(notificationList, /通知/);
  assert.match(notificationList, /すべて既読にする/);
  assert.match(notificationList, /通知はありません/);
  assert.match(notificationList, /新しい通知が届くとここに表示されます。/);
  assert.match(notificationList, /メール送信済み/);
  assert.match(notificationList, /既読/);
  assert.match(notificationBell, /title="通知"/);
});

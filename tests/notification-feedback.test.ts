import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(join(process.cwd(), 'src/features/notifications/NotificationList.tsx'), 'utf8');

test('notification list shows toast feedback when read updates fail', () => {
  assert.match(source, /useToast/);
  assert.match(source, /const \{ showToast \} = useToast\(\)/);
  assert.match(source, /既読への更新に失敗しました。/);
  assert.match(source, /すべて既読にできませんでした。/);
  assert.match(source, /onError: \(err: unknown\) => \{/);
  assert.match(source, /showToast\(\{ variant: 'error', message \}\)/);
});

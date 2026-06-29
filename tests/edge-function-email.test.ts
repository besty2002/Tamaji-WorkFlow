import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(join(process.cwd(), 'supabase/functions/send-notification-email/index.ts'), 'utf8');

test('notification email function avoids logging recipient email addresses and raw provider errors', () => {
  assert.doesNotMatch(source, /console\.log\(`Email sent successfully to \$\{profile\.email\}/);
  assert.doesNotMatch(source, /console\.error\("Resend error:", errorText\)/);
  assert.doesNotMatch(source, /JSON\.stringify\(\{ error: error\.message \}\)/);
  assert.match(source, /logInfo/);
  assert.match(source, /logError/);
});

test('notification email copy is natural Japanese', () => {
  assert.match(source, /通知が届いています/);
  assert.match(source, /詳細を確認する/);
  assert.match(source, /このメールは自動送信されています。/);
});

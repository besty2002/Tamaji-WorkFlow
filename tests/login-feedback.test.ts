import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(join(process.cwd(), 'src/features/auth/LoginForm.tsx'), 'utf8');

test('login form uses shared toast feedback for sign-up success', () => {
  assert.match(source, /useToast/);
  assert.match(source, /const \{ showToast \} = useToast\(\)/);
  assert.match(source, /showToast\(\{\s*variant: 'success'/s);
  assert.doesNotMatch(source, /setError\('アカウントを作成しました。/);
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(join(process.cwd(), 'src/features/profile/ProfileSettings.tsx'), 'utf8');

test('profile settings uses shared toast feedback for update results', () => {
  assert.match(source, /useToast/);
  assert.match(source, /const \{ showToast \} = useToast\(\)/);
  assert.match(source, /showToast\(\{\s*variant: 'success'/);
  assert.match(source, /プロフィールを更新しました。/);
  assert.match(source, /showToast\(\{\s*variant: 'error'/);
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(join(process.cwd(), 'src/features/requests/RequestForm.tsx'), 'utf8');

test('request form uses shared toast feedback for save results', () => {
  assert.match(source, /useToast/);
  assert.match(source, /const \{ showToast \} = useToast\(\)/);
  assert.match(source, /showToast\(\{\s*variant: 'success'/);
  assert.match(source, /下書きを保存しました。/);
  assert.match(source, /休暇申請を送信しました。/);
  assert.match(source, /showToast\(\{\s*variant: 'error'/);
});

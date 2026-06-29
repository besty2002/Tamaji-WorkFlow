import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(join(process.cwd(), 'src/features/requests/RequestForm.tsx'), 'utf8');

test('request form surfaces public holiday loading errors before calculating leave days', () => {
  assert.match(source, /const \{ data, error \} = await supabase\.from\('public_holidays'\)\.select\('date'\)/);
  assert.match(source, /if \(error\) \{/);
  assert.match(source, /祝日データの取得に失敗しました。/);
  assert.match(source, /showToast\(\{ variant: 'error', message \}\)/);
});

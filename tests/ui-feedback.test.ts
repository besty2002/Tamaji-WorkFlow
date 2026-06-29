import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();

function readSource(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

test('shared toast and confirm UI components exist', () => {
  assert.ok(existsSync(join(root, 'src/components/ui/ToastProvider.tsx')));
  assert.ok(existsSync(join(root, 'src/components/ui/useToast.ts')));
  assert.ok(existsSync(join(root, 'src/components/ui/ConfirmDialog.tsx')));
});

test('app renders the toast provider around routed content', () => {
  const source = readSource('src/app/App.tsx');

  assert.match(source, /ToastProvider/);
  assert.match(source, /<ToastProvider>/);
  assert.match(source, /<\/ToastProvider>/);
});

test('feature screens use shared feedback UI instead of browser dialogs', () => {
  const targets = [
    'src/features/requests/RequestList.tsx',
    'src/features/manage/ManageRequests.tsx',
    'src/features/admin/UserManagement.tsx',
  ];

  for (const target of targets) {
    const source = readSource(target);
    assert.doesNotMatch(source, /\balert\s*\(/, `${target} should not call alert()`);
    assert.doesNotMatch(source, /window\.confirm\s*\(/, `${target} should not call window.confirm()`);
  }
});

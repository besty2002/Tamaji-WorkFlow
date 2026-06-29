import assert from 'node:assert/strict';
import test from 'node:test';
import { getErrorMessage } from '../src/lib/errors.ts';

test('maps failed fetch errors to a helpful Supabase connection message', () => {
  const message = getErrorMessage(new Error('Failed to fetch'));

  assert.equal(
    message,
    'Supabase に接続できませんでした。.env.local の設定、Supabase プロジェクト、ネットワーク状態を確認してください。'
  );
});

test('maps missing environment configuration to a setup message', () => {
  const message = getErrorMessage(new Error('Supabase configuration is missing'));

  assert.equal(
    message,
    'Supabase の接続設定が見つかりません。.env.local に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。'
  );
});

test('returns fallback for non-error values', () => {
  assert.equal(getErrorMessage('unknown', '保存に失敗しました。'), '保存に失敗しました。');
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const targetFiles = [
  'src/features/auth/LoginForm.tsx',
  'src/features/requests/RequestForm.tsx',
  'src/features/requests/RequestList.tsx',
  'src/features/admin/UserManagement.tsx',
];

test('Japanese UI copy does not contain mojibake fragments', () => {
  const mojibakePattern = /[縺繧蜑譁螟謨蟷莨逕隲謇蜊蛻邂髯莉譌譛螳豌蜷蠖謫谿閾霄]/;

  for (const target of targetFiles) {
    const source = readFileSync(join(root, target), 'utf8');
    assert.doesNotMatch(source, mojibakePattern, `${target} contains mojibake text`);
  }
});

test('request and user management screens keep natural Japanese labels', () => {
  const requestList = readFileSync(join(root, 'src/features/requests/RequestList.tsx'), 'utf8');
  const requestForm = readFileSync(join(root, 'src/features/requests/RequestForm.tsx'), 'utf8');
  const userManagement = readFileSync(join(root, 'src/features/admin/UserManagement.tsx'), 'utf8');
  const loginForm = readFileSync(join(root, 'src/features/auth/LoginForm.tsx'), 'utf8');

  assert.match(loginForm, /スマートな休暇管理システム/);
  assert.match(loginForm, /メールアドレス/);
  assert.match(loginForm, /パスワード/);
  assert.match(requestForm, /新規休暇申請/);
  assert.match(requestForm, /休暇の種類/);
  assert.match(requestForm, /開始日/);
  assert.match(requestForm, /申請する/);
  assert.match(requestForm, /添付ファイルを表示/);
  assert.match(requestList, /年次有給休暇/);
  assert.match(requestList, /申請をキャンセルしますか？/);
  assert.match(userManagement, /一般社員/);
  assert.match(userManagement, /休暇付与履歴/);
  assert.match(userManagement, /有効な日数を入力してください。/);
});

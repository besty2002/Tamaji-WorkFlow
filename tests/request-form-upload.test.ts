import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(join(process.cwd(), 'src/features/requests/RequestForm.tsx'), 'utf8');

test('request form validates attachment size and file type before saving', () => {
  assert.match(source, /MAX_ATTACHMENT_SIZE_BYTES\s*=\s*5\s*\*\s*1024\s*\*\s*1024/);
  assert.match(source, /ALLOWED_ATTACHMENT_TYPES/);
  assert.match(source, /validateAttachment/);
  assert.match(source, /添付ファイルは5MB以下にしてください。/);
  assert.match(source, /添付できるファイルは PNG、JPG、PDF のみです。/);
});

test('request form file picker advertises the accepted attachment formats', () => {
  assert.match(source, /accept="\.png,\.jpg,\.jpeg,\.pdf,image\/png,image\/jpeg,application\/pdf"/);
});

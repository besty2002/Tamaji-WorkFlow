import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(join(process.cwd(), 'src/features/lunch/LunchSettlement.tsx'), 'utf8');

test('lunch settlement screen shows monthly admin summary in natural Japanese', () => {
  assert.match(source, /ランチ精算/);
  assert.match(source, /月別集計/);
  assert.match(source, /社員別の請求額/);
  assert.match(source, /合計請求額/);
  assert.match(source, /利用社員数/);
  assert.match(source, /弁当数/);
  assert.match(source, /チンご飯数/);
  assert.match(source, /無料提供日/);
});

test('lunch settlement screen supports employee details and CSV download', () => {
  assert.match(source, /CSVをダウンロード/);
  assert.match(source, /選択した社員の利用明細/);
  assert.match(source, /有料日/);
  assert.match(source, /無料日/);
  assert.match(source, /createLunchSettlementCsv/);
  assert.match(source, /lunch-settlement-\$\{format\(currentDate, 'yyyy-MM'\)\}\.csv/);
});


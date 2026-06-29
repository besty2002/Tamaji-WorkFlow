import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateLunchCost,
  createLunchSettlementCsv,
  getLunchMonthRange,
  summarizeLunchRecordsByUser,
  summarizeLunchRecords,
} from '../src/features/lunch/lunchUtils.ts';

test('calculates lunch cost with Monday and Friday free', () => {
  assert.equal(calculateLunchCost({ mealDate: '2026-06-01', hasBento: true, hasRice: true }), 0);
  assert.equal(calculateLunchCost({ mealDate: '2026-06-05', hasBento: true, hasRice: true }), 0);
});

test('calculates lunch cost on paid days', () => {
  assert.equal(calculateLunchCost({ mealDate: '2026-06-02', hasBento: true, hasRice: false }), 400);
  assert.equal(calculateLunchCost({ mealDate: '2026-06-03', hasBento: false, hasRice: true }), 100);
  assert.equal(calculateLunchCost({ mealDate: '2026-06-04', hasBento: true, hasRice: true }), 500);
  assert.equal(calculateLunchCost({ mealDate: '2026-06-06', hasBento: true, hasRice: true }), 500);
});

test('returns zero cost when nothing was eaten', () => {
  assert.equal(calculateLunchCost({ mealDate: '2026-06-02', hasBento: false, hasRice: false }), 0);
});

test('returns the inclusive month range for Supabase queries', () => {
  assert.deepEqual(getLunchMonthRange(new Date('2026-06-15T12:00:00')), {
    start: '2026-06-01',
    end: '2026-06-30',
  });
});

test('summarizes a user monthly lunch bill', () => {
  const summary = summarizeLunchRecords([
    { user_id: 'u1', meal_date: '2026-06-01', has_bento: true, has_rice: true, cost: 0 },
    { user_id: 'u1', meal_date: '2026-06-02', has_bento: true, has_rice: false, cost: 400 },
    { user_id: 'u1', meal_date: '2026-06-03', has_bento: false, has_rice: true, cost: 100 },
    { user_id: 'u1', meal_date: '2026-06-04', has_bento: true, has_rice: true, cost: 500 },
  ]);

  assert.deepEqual(summary, {
    bentoCount: 3,
    riceCount: 3,
    freeCount: 1,
    totalCost: 1000,
  });
});

test('summarizes monthly lunch records by employee for admin settlement', () => {
  const summaries = summarizeLunchRecordsByUser([
    {
      user_id: 'u2',
      meal_date: '2026-06-02',
      has_bento: true,
      has_rice: false,
      cost: 400,
      profiles: { display_name: null, email: 'b@example.com' },
    },
    {
      user_id: 'u1',
      meal_date: '2026-06-01',
      has_bento: true,
      has_rice: true,
      cost: 0,
      profiles: { display_name: '田中 太郎', email: 'tanaka@example.com' },
    },
    {
      user_id: 'u1',
      meal_date: '2026-06-03',
      has_bento: false,
      has_rice: true,
      cost: 100,
      profiles: { display_name: '田中 太郎', email: 'tanaka@example.com' },
    },
  ]);

  assert.deepEqual(summaries, [
    {
      userId: 'u2',
      displayName: 'b',
      email: 'b@example.com',
      bentoCount: 1,
      riceCount: 0,
      freeCount: 0,
      paidCount: 1,
      totalCost: 400,
      records: [
        {
          user_id: 'u2',
          meal_date: '2026-06-02',
          has_bento: true,
          has_rice: false,
          cost: 400,
          profiles: { display_name: null, email: 'b@example.com' },
        },
      ],
    },
    {
      userId: 'u1',
      displayName: '田中 太郎',
      email: 'tanaka@example.com',
      bentoCount: 1,
      riceCount: 2,
      freeCount: 1,
      paidCount: 1,
      totalCost: 100,
      records: [
        {
          user_id: 'u1',
          meal_date: '2026-06-01',
          has_bento: true,
          has_rice: true,
          cost: 0,
          profiles: { display_name: '田中 太郎', email: 'tanaka@example.com' },
        },
        {
          user_id: 'u1',
          meal_date: '2026-06-03',
          has_bento: false,
          has_rice: true,
          cost: 100,
          profiles: { display_name: '田中 太郎', email: 'tanaka@example.com' },
        },
      ],
    },
  ]);
});

test('creates a Japanese CSV for monthly lunch settlement', () => {
  const csv = createLunchSettlementCsv([
    {
      userId: 'u1',
      displayName: '田中 太郎',
      email: 'tanaka@example.com',
      bentoCount: 2,
      riceCount: 1,
      freeCount: 1,
      paidCount: 2,
      totalCost: 900,
      records: [],
    },
  ]);

  assert.equal(
    csv,
    [
      '社員名,メール,弁当数,チンご飯数,無料日利用数,有料日利用数,請求額',
      '田中 太郎,tanaka@example.com,2,1,1,2,900',
    ].join('\n'),
  );
});

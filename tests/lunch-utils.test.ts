import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateLunchCost,
  getLunchMonthRange,
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

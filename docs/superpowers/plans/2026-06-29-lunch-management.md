# Lunch Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lunch management feature where employees record bento and chingohan consumption, see a calendar of participants, and review monthly charges.

**Architecture:** Add a focused `lunch` feature folder with a pure pricing utility and one calendar screen. Store one record per user per date in `public.lunch_records`, protected by RLS so users manage their own records while managers/admins can view all records.

**Tech Stack:** React, TypeScript, React Query, Supabase, date-fns, lucide-react, Node test runner.

---

### Task 1: Pricing Utility

**Files:**
- Create: `src/features/lunch/lunchUtils.ts`
- Test: `tests/lunch-utils.test.ts`

- [ ] Write failing tests for Monday/Friday free pricing and other-day paid pricing.
- [ ] Implement `calculateLunchCost`, `getLunchMonthRange`, and `summarizeLunchRecords`.
- [ ] Run `npm.cmd test` and confirm the lunch utility tests pass.

### Task 2: Database Contract

**Files:**
- Modify: `src/types/database.ts`
- Modify: `supabase/schema.sql`
- Modify: `supabase/rls.sql`
- Test: `tests/lunch-schema.test.ts`

- [ ] Write failing source tests for `LunchRecord` type, `lunch_records` schema, unique `(user_id, meal_date)`, and RLS policies.
- [ ] Add `LunchRecord` type and SQL schema/RLS.
- [ ] Run `npm.cmd test` and confirm schema tests pass.

### Task 3: App Navigation

**Files:**
- Modify: `src/app/router.tsx`
- Modify: `src/app/Layout.tsx`
- Test: `tests/lunch-routing.test.ts`

- [ ] Write failing source tests for `/lunch`, lazy `LunchCalendar`, and `ランチ管理` navigation.
- [ ] Add route and navigation item.
- [ ] Run `npm.cmd test` and confirm routing tests pass.

### Task 4: Lunch Calendar UI

**Files:**
- Create: `src/features/lunch/LunchCalendar.tsx`
- Test: `tests/lunch-ui.test.ts`

- [ ] Write failing source tests for calendar + monthly settlement copy and Supabase operations.
- [ ] Implement calendar-first screen with monthly settlement panel.
- [ ] Support adding, updating, and deleting the signed-in user's record.
- [ ] Show participant face/meal markers in date cells.
- [ ] Run `npm.cmd test` and confirm UI tests pass.

### Task 5: Verification

**Files:**
- No new files.

- [ ] Run `npm.cmd test`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.
- [ ] Report any migration step still needing remote Supabase application.

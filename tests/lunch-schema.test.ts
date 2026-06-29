import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const types = readFileSync(join(root, 'src/types/database.ts'), 'utf8');
const schema = readFileSync(join(root, 'supabase/schema.sql'), 'utf8');
const rls = readFileSync(join(root, 'supabase/rls.sql'), 'utf8');

test('lunch record type describes the database table', () => {
  assert.match(types, /export interface LunchRecord/);
  assert.match(types, /meal_date: string/);
  assert.match(types, /has_bento: boolean/);
  assert.match(types, /has_rice: boolean/);
  assert.match(types, /cost: number/);
});

test('schema defines one lunch record per user per date', () => {
  assert.match(schema, /create table if not exists public\.lunch_records/);
  assert.match(schema, /meal_date date not null/);
  assert.match(schema, /has_bento boolean not null default false/);
  assert.match(schema, /has_rice boolean not null default false/);
  assert.match(schema, /cost integer not null default 0/);
  assert.match(schema, /unique \(user_id, meal_date\)/);
  assert.match(schema, /lunch_records_updated_at/);
});

test('rls lets users manage their own lunch records and managers view all', () => {
  assert.match(rls, /alter table public\.lunch_records enable row level security/);
  assert.match(rls, /drop policy if exists "View lunch records based on role"/);
  assert.match(rls, /create policy "View lunch records based on role"/);
  assert.match(rls, /auth\.uid\(\) = user_id/);
  assert.match(rls, /public\.is_admin_or_manager\(\)/);
  assert.match(rls, /create policy "Users can insert their own lunch records"/);
  assert.match(rls, /create policy "Users can update their own lunch records"/);
  assert.match(rls, /create policy "Users can delete their own lunch records"/);
});

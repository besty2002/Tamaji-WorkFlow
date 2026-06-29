import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const userManagementSource = readFileSync(new URL('../src/features/admin/UserManagement.tsx', import.meta.url), 'utf8');
const rlsSource = readFileSync(new URL('../supabase/rls.sql', import.meta.url), 'utf8');

test('user management screen is restricted to admins in component logic', () => {
  assert.match(userManagementSource, /const canManageUsers = adminProfile\?\.role === 'admin';/);
  assert.doesNotMatch(userManagementSource, /canManageUsers = adminProfile\?\.role === 'admin' \|\| adminProfile\?\.role === 'manager'/);
});

test('profile role and calendar permission updates are admin-only in RLS', () => {
  assert.match(rlsSource, /create or replace function public\.is_admin\(\)/);
  assert.match(rlsSource, /create policy "Admins can update profiles"/);
  assert.doesNotMatch(rlsSource, /create policy "Update profiles based on role"[\s\S]*public\.is_admin_or_manager\(\)/);
});

test('leave grant writes are admin-only in RLS', () => {
  assert.match(rlsSource, /create policy "Admins can update grants"/);
  assert.match(rlsSource, /create policy "Admins can delete grants"/);
  assert.doesNotMatch(rlsSource, /Admins and Managers can manage grants/);
});

test('rls script can be reapplied over existing policies', () => {
  const policyNames = [
    'View profiles based on permission',
    'Users can view their own profile',
    'Users can update their own profile',
    'Admins can view all profiles',
    'Admins can update all profiles',
    'Admins can update profiles',
    'Admins can delete profiles',
    'Admins can delete profiles safely',
    'Everyone can view holidays',
    'Admins can manage holidays',
    'Users can view their own grants',
    'Admins can view all grants',
    'Admins can insert grants',
    'Admins can update grants',
    'Admins can delete grants',
    'View requests based on permission',
    'Users can view their own requests',
    'Users can insert their own requests',
    'Users can update their own draft/submitted requests',
    'Managers and Admins can view all requests',
    'Managers and Admins can update requests',
    'Managers and Admins can update requests (approval/rejection)',
    'Managers and Admins can delete requests',
  ];

  for (const policyName of policyNames) {
    assert.ok(rlsSource.includes(`drop policy if exists "${policyName}"`));
  }
});

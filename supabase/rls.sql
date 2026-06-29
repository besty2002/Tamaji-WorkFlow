-- Enable RLS
alter table public.profiles enable row level security;
alter table public.leave_grants enable row level security;
alter table public.leave_requests enable row level security;
alter table public.public_holidays enable row level security;
alter table public.lunch_records enable row level security;

-- Helper functions to avoid recursive policy checks.
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
end;
$$ language plpgsql security definer;

create or replace function public.is_admin_or_manager()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('manager', 'admin')
  );
end;
$$ language plpgsql security definer;

create or replace function public.check_view_permission()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and (role in ('manager', 'admin') or can_view_all_leaves = true)
  );
end;
$$ language plpgsql security definer;

create or replace function public.prevent_profile_privilege_escalation()
returns trigger as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role
      or new.can_view_all_leaves is distinct from old.can_view_all_leaves then
      raise exception 'Only admins can update profile permissions.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists prevent_profile_privilege_escalation on public.profiles;
create trigger prevent_profile_privilege_escalation
before update on public.profiles
for each row
execute function public.prevent_profile_privilege_escalation();

-- Recreate policies safely when this script is reapplied.
drop policy if exists "View profiles based on permission" on public.profiles;
drop policy if exists "Update profiles based on role" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;
drop policy if exists "Admins can delete profiles" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;
drop policy if exists "Admins can delete profiles safely" on public.profiles;

drop policy if exists "Everyone can view holidays" on public.public_holidays;
drop policy if exists "Admins can manage holidays" on public.public_holidays;

drop policy if exists "Users can view their own grants" on public.leave_grants;
drop policy if exists "Admins and Managers can view all grants" on public.leave_grants;
drop policy if exists "Admins can view all grants" on public.leave_grants;
drop policy if exists "Admins can insert grants" on public.leave_grants;
drop policy if exists "Admins can update grants" on public.leave_grants;
drop policy if exists "Admins can delete grants" on public.leave_grants;

drop policy if exists "View requests based on permission" on public.leave_requests;
drop policy if exists "Users can insert their own requests" on public.leave_requests;
drop policy if exists "Users can update their own draft/submitted requests" on public.leave_requests;
drop policy if exists "Managers and Admins can update requests" on public.leave_requests;
drop policy if exists "Managers and Admins can delete requests" on public.leave_requests;
drop policy if exists "Users can view their own requests" on public.leave_requests;
drop policy if exists "Managers and Admins can view all requests" on public.leave_requests;
drop policy if exists "Managers and Admins can update requests (approval/rejection)" on public.leave_requests;

drop policy if exists "View lunch records based on role" on public.lunch_records;
drop policy if exists "Users can insert their own lunch records" on public.lunch_records;
drop policy if exists "Users can update their own lunch records" on public.lunch_records;
drop policy if exists "Users can delete their own lunch records" on public.lunch_records;

-- Profiles Policies
create policy "View profiles based on permission"
on public.profiles for select
using (
  auth.uid() = id
  or public.check_view_permission()
);

create policy "Admins can update profiles"
on public.profiles for update
using (
  auth.uid() = id
  or public.is_admin()
)
with check (
  auth.uid() = id
  or public.is_admin()
);

create policy "Admins can delete profiles"
on public.profiles for delete
using (public.is_admin());

-- Public Holidays Policies
create policy "Everyone can view holidays"
on public.public_holidays for select
using (true);

create policy "Admins can manage holidays"
on public.public_holidays for all
using (public.is_admin())
with check (public.is_admin());

-- Leave Grants Policies
create policy "Users can view their own grants"
on public.leave_grants for select
using (auth.uid() = user_id);

create policy "Admins can view all grants"
on public.leave_grants for select
using (public.is_admin());

create policy "Admins can insert grants"
on public.leave_grants for insert
with check (public.is_admin());

create policy "Admins can update grants"
on public.leave_grants for update
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete grants"
on public.leave_grants for delete
using (public.is_admin());

-- Leave Requests Policies
create policy "View requests based on permission"
on public.leave_requests for select
using (
  auth.uid() = user_id
  or (status = 'approved' and public.check_view_permission())
  or public.is_admin_or_manager()
);

create policy "Users can insert their own requests"
on public.leave_requests for insert
with check (auth.uid() = user_id);

create policy "Users can update their own draft/submitted requests"
on public.leave_requests for update
using (
  auth.uid() = user_id
  and status in ('draft', 'submitted')
)
with check (
  auth.uid() = user_id
  and status in ('draft', 'submitted', 'cancelled')
);

create policy "Managers and Admins can update requests"
on public.leave_requests for update
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager());

create policy "Managers and Admins can delete requests"
on public.leave_requests for delete
using (public.is_admin_or_manager());

-- Lunch Records Policies
create policy "View lunch records based on role"
on public.lunch_records for select
using (
  auth.uid() = user_id
  or public.is_admin_or_manager()
);

create policy "Users can insert their own lunch records"
on public.lunch_records for insert
with check (auth.uid() = user_id);

create policy "Users can update their own lunch records"
on public.lunch_records for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own lunch records"
on public.lunch_records for delete
using (auth.uid() = user_id);

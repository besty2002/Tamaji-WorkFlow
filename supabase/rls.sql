-- Enable RLS
alter table public.profiles enable row level security;
alter table public.leave_grants enable row level security;
alter table public.leave_requests enable row level security;
alter table public.public_holidays enable row level security;

-- Helper functions to avoid recursion
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

-- Profiles Policies
create policy "View profiles based on permission"
on public.profiles for select
using (
  auth.uid() = id 
  or public.check_view_permission()
);

create policy "Update profiles based on role"
on public.profiles for update
using (
  auth.uid() = id 
  or public.is_admin_or_manager()
)
with check (
  auth.uid() = id 
  or public.is_admin_or_manager()
);

create policy "Admins can delete profiles"
on public.profiles for delete
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Public Holidays Policies
create policy "Everyone can view holidays"
on public.public_holidays for select
using (true);

create policy "Admins can manage holidays"
on public.public_holidays for all
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Leave Grants Policies
create policy "Users can view their own grants"
on public.leave_grants for select
using (auth.uid() = user_id);

create policy "Admins can view all grants"
on public.leave_grants for select
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can insert grants"
on public.leave_grants for insert
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

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

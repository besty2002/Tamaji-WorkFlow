-- Enable pgcrypto for gen_random_uuid
create extension if not exists pgcrypto;

-- Profiles table (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text check (role in ('employee', 'manager', 'admin')) default 'employee',
  created_at timestamptz default now()
);

-- Public Holidays table
create table if not exists public.public_holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  name text not null,
  created_at timestamptz default now()
);

-- Leave Grants table
create table if not exists public.leave_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  days numeric(4,1) not null,
  reason text,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at date default current_date,
  created_at timestamptz default now()
);

-- Leave Requests table
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text check (type in ('paid_leave', 'sick', 'special', 'unpaid')) not null,
  start_date date not null,
  end_date date not null,
  is_half_day boolean default false,
  half_day_type text check (half_day_type in ('AM', 'PM')),
  num_days numeric(4,1) not null default 0, -- Explicit business days
  reason text,
  status text check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled')) default 'draft',
  manager_comment text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-update updated_at trigger for leave_requests
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leave_requests_updated_at
before update on public.leave_requests
for each row execute function public.handle_updated_at();

-- View to calculate leave balance (Updated to use num_days column)
create or replace view public.leave_balance_view as
select 
  p.id as user_id,
  coalesce(sum(g.days), 0) as granted_sum,
  coalesce((
    select sum(num_days)
    from public.leave_requests r
    where r.user_id = p.id and r.status = 'approved' and r.type = 'paid_leave'
  ), 0) as used_sum,
  coalesce(sum(g.days), 0) - coalesce((
    select sum(num_days)
    from public.leave_requests r
    where r.user_id = p.id and r.status = 'approved' and r.type = 'paid_leave'
  ), 0) as balance
from public.profiles p
left join public.leave_grants g on p.id = g.user_id
group by p.id;

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 
    'employee'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

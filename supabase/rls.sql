-- Enable RLS
alter table public.profiles enable row level security;
alter table public.leave_grants enable row level security;
alter table public.leave_requests enable row level security;
alter table public.public_holidays enable row level security;

-- Profiles Policies
create policy "Users can view their own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Admins can view all profiles"
on public.profiles for select
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update all profiles"
on public.profiles for update
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
create policy "Users can view their own requests"
on public.leave_requests for select
using (auth.uid() = user_id);

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

create policy "Managers and Admins can view all requests"
on public.leave_requests for select
using (exists (select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin')));

create policy "Managers and Admins can update requests"
on public.leave_requests for update
using (exists (select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin')))
with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin')));

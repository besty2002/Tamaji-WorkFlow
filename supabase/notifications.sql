
-- Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('leave_submitted', 'leave_approved', 'leave_rejected', 'comment_added', 'system')),
  title text not null,
  body text not null,
  url text, -- optional link to navigate to
  read_at timestamptz,
  is_email_sent boolean default false,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Index for performance
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

-- RLS for notifications
alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
on public.notifications for select
using (auth.uid() = user_id);

create policy "Users can update their own notifications (mark as read)"
on public.notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Trigger to notify admins when leave_request is submitted
create or replace function public.notify_on_leave_request()
returns trigger as $$
declare
  requester_name text;
  admin_id uuid;
begin
  -- Get requester name
  select display_name into requester_name from public.profiles where id = new.user_id;

  -- 1. When a request is submitted
  if (TG_OP = 'INSERT' and new.status = 'submitted') or (TG_OP = 'UPDATE' and old.status = 'draft' and new.status = 'submitted') then
    -- Notify all admins/managers
    for admin_id in select id from public.profiles where role in ('admin', 'manager') loop
      insert into public.notifications (user_id, type, title, body, url)
      values (
        admin_id,
        'leave_submitted',
        'New Leave Request',
        requester_name || ' submitted a ' || new.type || ' request (' || new.start_date || ' to ' || new.end_date || ')',
        '/manage' -- Path for managers to view requests
      );
    end loop;
  end if;

  -- 2. When a request is approved or rejected
  if (TG_OP = 'UPDATE' and old.status = 'submitted' and new.status in ('approved', 'rejected')) then
    insert into public.notifications (user_id, type, title, body, url)
    values (
      new.user_id,
      case when new.status = 'approved' then 'leave_approved' else 'leave_rejected' end,
      'Leave Request ' || initcap(new.status),
      'Your ' || new.type || ' request (' || new.start_date || ' to ' || new.end_date || ') has been ' || new.status || '.',
      '/requests/' || new.id
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_leave_request_change on public.leave_requests;
create trigger on_leave_request_change
after insert or update on public.leave_requests
for each row execute function public.notify_on_leave_request();

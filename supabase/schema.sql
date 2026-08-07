-- HR CRM Global Creatives (Supabase-first, role-aware admin + employee setup)
-- Run this in Supabase SQL Editor for project: uldhztmiguapppbcjyxa

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'employee' check (role in ('admin', 'employee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id text primary key,
  user_id uuid,
  name text not null,
  email text not null unique,
  role text not null,
  department text not null,
  location text not null,
  join_date date not null,
  manager text not null,
  status text not null check (status in ('active', 'on_leave', 'inactive')),
  performance_score integer not null check (performance_score >= 0 and performance_score <= 100),
  shift_code text default 'shift_1' check (shift_code in ('shift_1', 'shift_2', 'shift_3')),
  shift_approval_status text not null default 'pending' check (shift_approval_status in ('pending', 'approved')),
  avg_time_on_system_minutes integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.employees add column if not exists user_id uuid;
alter table public.employees add column if not exists avg_time_on_system_minutes integer not null default 0;
alter table public.employees add column if not exists shift_code text default 'shift_1';
alter table public.employees add column if not exists shift_approval_status text not null default 'pending';

create table if not exists public.employee_private_details (
  employee_id text primary key references public.employees(id) on delete cascade,
  mobile text,
  address text,
  pan text,
  bank_name text,
  bank_account_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id text primary key,
  employee_id text not null references public.employees(id) on delete cascade,
  employee_name text not null,
  date date not null,
  check_in text not null,
  check_out text not null,
  status text not null check (status in ('present', 'late', 'remote', 'absent')),
  check_in_at timestamptz,
  check_out_at timestamptz,
  break_minutes integer not null default 0,
  time_on_system_minutes integer not null default 0,
  break_summary jsonb,
  created_at timestamptz not null default now()
);

alter table public.attendance_records add column if not exists check_in_at timestamptz;
alter table public.attendance_records add column if not exists check_out_at timestamptz;
alter table public.attendance_records add column if not exists break_minutes integer not null default 0;
alter table public.attendance_records add column if not exists time_on_system_minutes integer not null default 0;
alter table public.attendance_records add column if not exists break_summary jsonb;

create table if not exists public.leave_requests (
  id text primary key,
  employee_id text not null references public.employees(id) on delete cascade,
  employee_name text not null,
  leave_type text not null check (leave_type in ('annual', 'sick', 'casual', 'unpaid')),
  start_date date not null,
  end_date date not null,
  days integer not null check (days > 0),
  reason text not null,
  status text not null check (status in ('approved', 'pending', 'rejected')),
  compensated boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.leave_requests add column if not exists compensated boolean not null default false;

create table if not exists public.candidates (
  id text primary key,
  name text not null,
  email text not null,
  role text not null,
  source text not null,
  stage text not null check (stage in ('sourced', 'interview', 'offer', 'hired', 'rejected')),
  interview_date date not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  offer_letter_sent_at timestamptz,
  offer_letter_file_name text,
  created_at timestamptz not null default now()
);

alter table public.candidates add column if not exists email text;
alter table public.candidates add column if not exists offer_letter_sent_at timestamptz;
alter table public.candidates add column if not exists offer_letter_file_name text;

create table if not exists public.payroll_records (
  id text primary key,
  employee_id text,
  month text not null,
  employee_name text not null,
  department text not null,
  base_salary numeric(12,2) not null check (base_salary >= 0),
  bonus numeric(12,2) not null check (bonus >= 0),
  deductions numeric(12,2) not null check (deductions >= 0),
  net_pay numeric(12,2) not null check (net_pay >= 0),
  status text not null check (status in ('processed', 'scheduled')),
  payslip_sent_at timestamptz,
  payslip_file_name text,
  created_at timestamptz not null default now()
);

alter table public.payroll_records add column if not exists employee_id text;
alter table public.payroll_records add column if not exists payslip_sent_at timestamptz;
alter table public.payroll_records add column if not exists payslip_file_name text;

create table if not exists public.tasks (
  id text primary key,
  title text not null,
  description text,
  status text not null check (status in ('todo', 'in_progress', 'blocked', 'done')),
  priority text not null check (priority in ('low', 'medium', 'high', 'critical')),
  due_date date,
  assignee_id text references public.employees(id) on delete set null,
  assignee_name text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  title text not null,
  description text,
  status text not null check (status in ('todo', 'in_progress', 'blocked', 'done')),
  priority text not null check (priority in ('low', 'medium', 'high', 'critical')),
  due_date date,
  assignee_id text references public.employees(id) on delete set null,
  assignee_name text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_settings (
  id bigint generated by default as identity primary key,
  company_name text not null,
  timezone text not null,
  payroll_cycle text not null,
  working_days text[] not null,
  work_hours text not null,
  leave_policy jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key,
  role text not null check (role in ('admin', 'employee')),
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id text primary key,
  audience text not null check (audience in ('admin', 'employee', 'all')),
  title text not null,
  message text not null,
  tone text not null check (tone in ('info', 'success', 'warning', 'critical')),
  graphic_url text,
  graphic_alt text,
  cta_label text,
  cta_path text,
  created_at timestamptz not null default now()
);

alter table public.announcements add column if not exists graphic_url text;
alter table public.announcements add column if not exists graphic_alt text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employees_user_id_fkey'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payroll_records_employee_id_fkey'
      and conrelid = 'public.payroll_records'::regclass
  ) then
    alter table public.payroll_records
      add constraint payroll_records_employee_id_fkey
      foreign key (employee_id) references public.employees(id) on delete cascade;
  end if;
end $$;

create unique index if not exists employees_user_id_unique on public.employees(user_id) where user_id is not null;
create index if not exists employees_email_lower_idx on public.employees(lower(email));
create index if not exists employee_private_details_employee_idx on public.employee_private_details(employee_id);
create index if not exists attendance_employee_idx on public.attendance_records(employee_id);
create unique index if not exists attendance_employee_date_unique on public.attendance_records(employee_id, date);
create index if not exists leave_employee_idx on public.leave_requests(employee_id);
create index if not exists candidates_email_lower_idx on public.candidates(lower(email));
create index if not exists payroll_employee_idx on public.payroll_records(employee_id);
create index if not exists profiles_email_lower_idx on public.profiles(lower(email));
create index if not exists tasks_created_by_idx on public.tasks(created_by);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists notifications_role_idx on public.notifications(role);
create index if not exists announcements_audience_idx on public.announcements(audience);

create or replace function public.sync_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.sync_profile_updated_at();

create or replace function public.sync_task_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row
execute function public.sync_task_updated_at();

drop trigger if exists trg_employee_private_details_updated_at on public.employee_private_details;
create trigger trg_employee_private_details_updated_at
before update on public.employee_private_details
for each row
execute function public.sync_profile_updated_at();

create or replace function public.sync_attendance_durations()
returns trigger
language plpgsql
as $$
begin
  if new.check_in_at is not null and new.check_out_at is not null then
    new.time_on_system_minutes := greatest(
      0,
      floor(extract(epoch from (new.check_out_at - new.check_in_at)) / 60) - coalesce(new.break_minutes, 0)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_attendance_durations on public.attendance_records;
create trigger trg_attendance_durations
before insert or update on public.attendance_records
for each row
execute function public.sync_attendance_durations();

create or replace function public.recalculate_employee_performance(p_employee_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer := 0;
  v_present integer := 0;
  v_late integer := 0;
  v_absent integer := 0;
  v_avg_time numeric := 0;
  v_expected_minutes integer := 540;
  v_attendance_score numeric := 0;
  v_time_score numeric := 0;
  v_performance integer := 0;
begin
  select
    count(*) filter (where status in ('present', 'remote')) as present_count,
    count(*) filter (where status = 'late') as late_count,
    count(*) filter (where status = 'absent') as absent_count,
    count(*) as total_count,
    avg(coalesce(time_on_system_minutes, 0)) as avg_time
  into v_present, v_late, v_absent, v_total, v_avg_time
  from public.attendance_records
  where employee_id = p_employee_id
    and date >= current_date - interval '30 days';

  if v_total > 0 then
    v_attendance_score := ((v_present + (0.6 * v_late)) / v_total) * 100;
  else
    v_attendance_score := 0;
  end if;

  select
    greatest(
      1,
      floor(
        extract(
          epoch
          from (
            (btrim(split_part(work_hours, '-', 2))::time - btrim(split_part(work_hours, '-', 1))::time)
          )
        ) / 60
      )
    )
  into v_expected_minutes
  from public.crm_settings
  limit 1;

  v_time_score := least(100, greatest(0, (coalesce(v_avg_time, 0) / v_expected_minutes) * 100));
  v_performance := round((0.6 * v_attendance_score) + (0.4 * v_time_score));

  update public.employees
  set
    performance_score = v_performance,
    avg_time_on_system_minutes = coalesce(round(v_avg_time), 0)
  where id = p_employee_id;
end;
$$;

create or replace function public.trg_attendance_recalc_employee()
returns trigger
language plpgsql
as $$
begin
  perform public.recalculate_employee_performance(new.employee_id);
  return new;
end;
$$;

create or replace function public.trg_attendance_recalc_employee_delete()
returns trigger
language plpgsql
as $$
begin
  perform public.recalculate_employee_performance(old.employee_id);
  return old;
end;
$$;

drop trigger if exists trg_attendance_recalc on public.attendance_records;
create trigger trg_attendance_recalc
after insert or update on public.attendance_records
for each row
execute function public.trg_attendance_recalc_employee();

drop trigger if exists trg_attendance_recalc_delete on public.attendance_records;
create trigger trg_attendance_recalc_delete
after delete on public.attendance_records
for each row
execute function public.trg_attendance_recalc_employee_delete();

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'employee');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin';
$$;

create or replace function public.admin_emails()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select array['test@crm.co.in', 'raonelucifer527@gmail.com'];
$$;

create or replace function public.task_admin_emails()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select array['test@crm.co.in'];
$$;

create or replace function public.is_task_assigner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.email) = any(public.task_admin_emails())
    )
    or exists (
      select 1
      from public.employees e
      where e.user_id = auth.uid()
        and e.department = 'Client Success'
    );
$$;

create or replace function public.get_my_employee_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees e
  where e.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_full_name text;
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'No authenticated user found.';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id;

  if found then
    return v_profile;
  end if;

  select
    u.email,
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
      split_part(u.email, '@', 1)
    )
  into v_email, v_full_name
  from auth.users u
  where u.id = v_user_id;

  insert into public.profiles (id, email, full_name, role)
  values (
    v_user_id,
    v_email,
    v_full_name,
    case
      when lower(v_email) = any(public.admin_emails()) then 'admin'
      else 'employee'
    end
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name)
  returning * into v_profile;

  update public.employees
  set user_id = v_user_id
  where lower(email) = lower(v_email)
    and user_id is null;

  return v_profile;
end;
$$;

create or replace function public.handle_new_auth_user_compat()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(coalesce(new.email, ''));
  v_full_name text := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'User'
  );
  v_role text := case
    when lower(coalesce(new.raw_user_meta_data ->> 'role', 'employee')) = 'admin' then 'admin'
    when v_email = any(public.admin_emails()) then 'admin'
    else 'employee'
  end;
begin
  begin
    insert into public.profiles (id, email, full_name, role)
    values (
      new.id,
      new.email,
      v_full_name,
      v_role
    )
    on conflict (id) do update
      set email = excluded.email,
          full_name = coalesce(excluded.full_name, public.profiles.full_name),
          role = excluded.role;
  exception
    when unique_violation then
      null;
  end;

  update public.employees
  set user_id = new.id
  where lower(email) = v_email
    and user_id is null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user_compat();

grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_emails() to authenticated;
grant execute on function public.task_admin_emails() to authenticated;
grant execute on function public.is_task_assigner() to authenticated;
grant execute on function public.get_my_employee_id() to authenticated;
grant execute on function public.ensure_profile() to authenticated;

insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
  case
    when lower(u.email) = any(public.admin_emails()) then 'admin'
    else 'employee'
  end
from auth.users u
on conflict (id) do update
set
  email = excluded.email,
  full_name = coalesce(excluded.full_name, public.profiles.full_name),
  role = case
    when lower(excluded.email) = any(public.admin_emails()) then 'admin'
    else 'employee'
  end;

update public.profiles
set role = case
  when lower(email) = any(public.admin_emails()) then 'admin'
  else 'employee'
end;

update public.employees e
set user_id = p.id
from public.profiles p
where lower(e.email) = lower(p.email)
  and e.user_id is null;

update public.payroll_records pr
set employee_id = e.id
from public.employees e
where pr.employee_id is null
  and pr.employee_name = e.name;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_admin_email_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_admin_email_check
      check (role <> 'admin' or lower(email) = any(public.admin_emails()));
  end if;
end $$;

drop index if exists profiles_single_admin_role;


insert into public.crm_settings (company_name, timezone, payroll_cycle, working_days, work_hours, leave_policy)
select
  'Global Creative Services',
  'Asia/Kolkata',
  'Monthly',
  array['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  '09:00 - 18:00',
  '{"annual":18,"sick":10,"casual":8}'::jsonb
where not exists (select 1 from public.crm_settings);

insert into public.announcements (id, audience, title, message, tone, cta_label, cta_path, created_at)
values
  ('ANN-ALL-1', 'all', 'Workspace refresh is live', 'The HR CRM now includes a faster command bar, richer dashboards, and better operational visibility.', 'info', 'Open dashboard', '/', '2026-03-22T06:00:00Z'),
  ('ANN-ADMIN-1', 'admin', 'Operations review window', 'Audit pending leave, blocked tasks, and scheduled payroll before closing this week''s runbook.', 'warning', 'Review operations', '/admin', '2026-03-22T06:30:00Z'),
  ('ANN-EMP-1', 'employee', 'Self-service workspace expanded', 'Use the upgraded dashboard to track attendance, leave requests, payroll, and active work from one view.', 'success', 'Open my workspace', '/employee', '2026-03-22T06:45:00Z')
on conflict (id) do update
set
  audience = excluded.audience,
  title = excluded.title,
  message = excluded.message,
  tone = excluded.tone,
  cta_label = excluded.cta_label,
  cta_path = excluded.cta_path,
  created_at = excluded.created_at;

update public.candidates
set email = lower(replace(name, ' ', '.')) || '@gcs.app'
where email is null or btrim(email) = '';

alter table public.candidates alter column email set not null;

alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.employee_private_details enable row level security;
alter table public.attendance_records enable row level security;
alter table public.leave_requests enable row level security;
alter table public.candidates enable row level security;
alter table public.payroll_records enable row level security;
alter table public.tasks enable row level security;
alter table public.crm_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;

drop policy if exists employees_auth_all on public.employees;
drop policy if exists attendance_auth_all on public.attendance_records;
drop policy if exists leave_auth_all on public.leave_requests;
drop policy if exists candidates_auth_all on public.candidates;
drop policy if exists payroll_auth_all on public.payroll_records;
drop policy if exists tasks_auth_all on public.tasks;
drop policy if exists settings_auth_all on public.crm_settings;

drop policy if exists profiles_select_policy on public.profiles;
drop policy if exists employees_select_policy on public.employees;
drop policy if exists employees_insert_policy on public.employees;
drop policy if exists employees_update_policy on public.employees;
drop policy if exists employees_delete_policy on public.employees;
drop policy if exists employee_private_details_select_policy on public.employee_private_details;
drop policy if exists employee_private_details_insert_policy on public.employee_private_details;
drop policy if exists employee_private_details_update_policy on public.employee_private_details;
drop policy if exists employee_private_details_delete_policy on public.employee_private_details;
drop policy if exists attendance_select_policy on public.attendance_records;
drop policy if exists attendance_insert_policy on public.attendance_records;
drop policy if exists attendance_update_policy on public.attendance_records;
drop policy if exists attendance_delete_policy on public.attendance_records;
drop policy if exists leave_select_policy on public.leave_requests;
drop policy if exists leave_insert_policy on public.leave_requests;
drop policy if exists leave_update_policy on public.leave_requests;
drop policy if exists leave_delete_policy on public.leave_requests;
drop policy if exists candidates_select_policy on public.candidates;
drop policy if exists candidates_write_policy on public.candidates;
drop policy if exists payroll_select_policy on public.payroll_records;
drop policy if exists payroll_write_policy on public.payroll_records;
drop policy if exists tasks_select_policy on public.tasks;
drop policy if exists tasks_insert_policy on public.tasks;
drop policy if exists tasks_update_policy on public.tasks;
drop policy if exists tasks_delete_policy on public.tasks;
drop policy if exists settings_select_policy on public.crm_settings;
drop policy if exists settings_write_policy on public.crm_settings;
drop policy if exists notifications_select_policy on public.notifications;
drop policy if exists notifications_update_policy on public.notifications;
drop policy if exists announcements_select_policy on public.announcements;
drop policy if exists announcements_write_policy on public.announcements;

create policy profiles_select_policy on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy employees_select_policy on public.employees
  for select to authenticated
  using (public.is_admin() or public.is_task_assigner() or user_id = auth.uid());

create policy employees_insert_policy on public.employees
  for insert to authenticated
  with check (public.is_admin());

create policy employees_update_policy on public.employees
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy employees_delete_policy on public.employees
  for delete to authenticated
  using (public.is_admin());

create policy employee_private_details_select_policy on public.employee_private_details
  for select to authenticated
  using (public.is_admin() or employee_id = public.get_my_employee_id());

create policy employee_private_details_insert_policy on public.employee_private_details
  for insert to authenticated
  with check (public.is_admin() or employee_id = public.get_my_employee_id());

create policy employee_private_details_update_policy on public.employee_private_details
  for update to authenticated
  using (public.is_admin() or employee_id = public.get_my_employee_id())
  with check (public.is_admin() or employee_id = public.get_my_employee_id());

create policy employee_private_details_delete_policy on public.employee_private_details
  for delete to authenticated
  using (public.is_admin());

create policy attendance_select_policy on public.attendance_records
  for select to authenticated
  using (public.is_admin() or employee_id = public.get_my_employee_id());

create policy attendance_insert_policy on public.attendance_records
  for insert to authenticated
  with check (public.is_admin() or employee_id = public.get_my_employee_id());

create policy attendance_update_policy on public.attendance_records
  for update to authenticated
  using (public.is_admin() or employee_id = public.get_my_employee_id())
  with check (public.is_admin() or employee_id = public.get_my_employee_id());

create policy attendance_delete_policy on public.attendance_records
  for delete to authenticated
  using (public.is_admin());

create policy leave_select_policy on public.leave_requests
  for select to authenticated
  using (public.is_admin() or employee_id = public.get_my_employee_id());

create policy leave_insert_policy on public.leave_requests
  for insert to authenticated
  with check (public.is_admin() or employee_id = public.get_my_employee_id());

create policy leave_update_policy on public.leave_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy leave_delete_policy on public.leave_requests
  for delete to authenticated
  using (public.is_admin());

create policy candidates_select_policy on public.candidates
  for select to authenticated
  using (public.is_admin());

create policy candidates_write_policy on public.candidates
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy payroll_select_policy on public.payroll_records
  for select to authenticated
  using (public.is_admin() or employee_id = public.get_my_employee_id());

create policy payroll_write_policy on public.payroll_records
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy tasks_select_policy on public.tasks
  for select to authenticated
  using (
    public.is_admin()
    or created_by = auth.uid()
    or assignee_id = public.get_my_employee_id()
  );

create policy tasks_insert_policy on public.tasks
  for insert to authenticated
  with check (
    public.is_task_assigner()
    or (created_by = auth.uid() and assignee_id = public.get_my_employee_id())
  );

create policy tasks_update_policy on public.tasks
  for update to authenticated
  using (public.is_task_assigner() or assignee_id = public.get_my_employee_id())
  with check (public.is_task_assigner() or assignee_id = public.get_my_employee_id());
 
create policy tasks_delete_policy on public.tasks
  for delete to authenticated
  using (public.is_admin() or public.is_task_assigner());

create policy settings_select_policy on public.crm_settings
  for select to authenticated 
  using (true);

create policy settings_write_policy on public.crm_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy notifications_select_policy on public.notifications
  for select to authenticated
  using (role = public.current_role());

create policy notifications_update_policy on public.notifications
  for update to authenticated
  using (role = public.current_role())
  with check (role = public.current_role());

create policy announcements_select_policy on public.announcements
  for select to authenticated
  using (public.is_admin() or audience = 'all' or audience = public.current_role());

create policy announcements_write_policy on public.announcements
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Use the script `supabase/bootstrap-admin.mjs` to create/update the admin auth account:
--   email: test@crm.co.in
--   password: @12131415@

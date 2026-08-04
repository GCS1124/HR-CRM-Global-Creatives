-- One-shot auth signup repair for project: uldhztmiguapppbcjyxa
-- Use this if new-user signup is blocked by an auth trigger or stale provisioning function.
-- Safe to rerun. It intentionally removes the old trigger/function and recreates the current version.

create extension if not exists pgcrypto;

do $$
begin
  if exists (
    select 1
    from information_schema.triggers
    where trigger_schema = 'auth'
      and event_object_table = 'users'
      and trigger_name = 'on_auth_user_created'
  ) then
    execute 'drop trigger if exists on_auth_user_created on auth.users';
  end if;
end
$$;

drop function if exists public.handle_new_auth_user_compat();
drop function if exists public.admin_emails();

create or replace function public.admin_emails()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select array['test@crm.co.in', 'raonelucifer527@gmail.com'];
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
  v_existing_profile_id uuid;
  v_has_profiles_name boolean;
  v_has_employees_user_id boolean;
  v_has_employees_email boolean;
begin
  select p.id
  into v_existing_profile_id
  from public.profiles p
  where lower(p.email) = v_email
  limit 1;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'name'
  )
  into v_has_profiles_name;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employees'
      and column_name = 'user_id'
  )
  into v_has_employees_user_id;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employees'
      and column_name = 'email'
  )
  into v_has_employees_email;

  begin
    if v_existing_profile_id is not null and v_existing_profile_id <> new.id then
      update public.profiles
      set id = new.id,
          email = new.email,
          full_name = coalesce(full_name, v_full_name),
          role = v_role
      where id = v_existing_profile_id;
    elsif v_has_profiles_name then
      execute $sql$
        insert into public.profiles (id, email, full_name, name, role)
        values ($1, $2, $3, $3, $4)
        on conflict (id) do update
        set email = excluded.email,
            full_name = coalesce(excluded.full_name, public.profiles.full_name),
            name = coalesce(excluded.name, public.profiles.name),
            role = excluded.role
      $sql$
      using new.id, new.email, v_full_name, v_role;
    else
      execute $sql$
        insert into public.profiles (id, email, full_name, role)
        values ($1, $2, $3, $4)
        on conflict (id) do update
        set email = excluded.email,
            full_name = coalesce(excluded.full_name, public.profiles.full_name),
            role = excluded.role
      $sql$
      using new.id, new.email, v_full_name, v_role;
    end if;
  exception
    when unique_violation then
      null;
    when undefined_table or undefined_column then
      null;
  end;

  if v_has_employees_user_id and v_has_employees_email then
    begin
      update public.employees
      set user_id = new.id
      where lower(email) = v_email
        and (user_id is null or user_id = new.id);
    exception
      when undefined_table or undefined_column then
        null;
    end;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user_compat();

grant execute on function public.admin_emails() to authenticated;

-- Reset any older role constraint before the backfill runs.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    alter table public.profiles drop constraint if exists profiles_role_check;
  end if;
end
$$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
    insert into public.profiles (id, email, full_name, role)
    select
      u.id,
      u.email,
      coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(u.email, '@', 1), ''), 'User'),
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
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('admin', 'employee'));
  end if;
end
$$;

update public.employees e
set user_id = p.id
from public.profiles p
where lower(e.email) = lower(p.email)
  and e.user_id is null;

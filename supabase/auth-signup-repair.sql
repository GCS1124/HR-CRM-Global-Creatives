-- Repair auth signup/profile provisioning for project: uldhztmiguapppbcjyxa
-- Safe to run against the shared Supabase project used by multiple frontends.

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
    when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'admin_emails'
        and p.pronargs = 0
    ) and v_email = any(public.admin_emails()) then 'admin'
    else 'employee'
  end;
  v_has_profiles_name boolean;
  v_has_employees_user_id boolean;
  v_has_employees_email boolean;
begin
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
    if v_has_profiles_name then
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
      -- Do not block auth signup if a profile row already exists for the same email.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user_compat();

grant execute on function public.admin_emails() to authenticated;

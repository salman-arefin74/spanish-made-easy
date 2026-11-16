-- Profiles for username accounts.
-- Apply this once in the Supabase SQL editor, or with the Supabase CLI.
-- Turn off Authentication → Providers → Email → Confirm email before sign-up.
-- Do not put the service-role key in the frontend.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  proficiency_level text,
  daily_learning_target integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_unique unique (username),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$'),
  constraint profiles_proficiency_level check (
    proficiency_level is null
    or proficiency_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')
  ),
  constraint profiles_daily_target check (
    daily_learning_target is null
    or daily_learning_target between 5 and 50
  )
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select, update on table public.profiles to authenticated;

create policy "Read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert policy and no delete policy. Learners cannot create or remove
-- profile rows. The sign-up trigger inserts the row. An operator removes a
-- user from the Supabase dashboard, and the profile cascades with auth.users.

create or replace function public.prevent_profile_identity_change()
returns trigger
language plpgsql
as $$
begin
  if new.id is distinct from old.id or new.username is distinct from old.username then
    raise exception 'Username cannot be changed.';
  end if;
  return new;
end;
$$;

create trigger profiles_lock_identity
  before update on public.profiles
  for each row execute function public.prevent_profile_identity_change();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_username text;
begin
  chosen_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  if chosen_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Username must be 3 to 24 letters, numbers, or underscores.';
  end if;

  insert into public.profiles (id, username)
  values (new.id, chosen_username);

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts created before this migration have no profile row. The trigger
-- only runs for later sign-ups, so copy the usernames that already exist.
insert into public.profiles (id, username)
select
  users.id,
  lower(trim(users.raw_user_meta_data ->> 'username'))
from auth.users as users
where lower(trim(coalesce(users.raw_user_meta_data ->> 'username', ''))) ~ '^[a-z0-9_]{3,24}$'
on conflict (id) do nothing;

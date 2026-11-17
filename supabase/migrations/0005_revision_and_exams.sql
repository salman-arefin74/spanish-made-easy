-- Review grades, study days for the streak, and one row per exam attempt.
-- Apply this after 0002_vocabulary.sql. Then the app can store Again, Hard, Good, and Easy.
-- Attempts are inserted, not updated. A retake adds a row.
-- Do not put the service-role key in the frontend.

alter table public.user_word_progress drop constraint if exists user_word_progress_response;

alter table public.user_word_progress
  add constraint user_word_progress_response
  check (last_response in ('know', 'still_learning', 'again', 'hard', 'good', 'easy'));

create table public.user_study_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  studied_on date not null,
  primary key (user_id, studied_on)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_set text not null,
  correct_count integer not null,
  total_count integer not null,
  answers jsonb not null,
  created_at timestamptz not null default now(),
  constraint quiz_attempts_set check (exam_set in ('A1', 'A2', 'mixed')),
  constraint quiz_attempts_total check (total_count = 15),
  constraint quiz_attempts_counts check (
    correct_count >= 0
    and correct_count <= total_count
  )
);

create index quiz_attempts_user_idx on public.quiz_attempts (user_id, created_at desc);

alter table public.user_study_days enable row level security;
alter table public.quiz_attempts enable row level security;

revoke all on table public.user_study_days from anon, authenticated;
revoke all on table public.quiz_attempts from anon, authenticated;

-- Insert only. A repeated day is ignored, so authenticated does not get update.
grant select, insert on table public.user_study_days to authenticated;
grant select, insert on table public.quiz_attempts to authenticated;

create policy "Read own study days"
  on public.user_study_days for select to authenticated
  using (auth.uid() = user_id);

create policy "Insert own study days"
  on public.user_study_days for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Read own exam attempts"
  on public.quiz_attempts for select to authenticated
  using (auth.uid() = user_id);

create policy "Insert own exam attempts"
  on public.quiz_attempts for insert to authenticated
  with check (auth.uid() = user_id);

-- Twelve real-life situations and one score per learner per situation.
-- Apply this after 0003_grammar.sql and 0002_vocabulary.sql. Then run `npm run seed`.
-- A retry replaces the stored score. There is no history of earlier attempts.
-- Do not put the service-role key in the frontend.

create table public.situations (
  id text primary key,
  title text not null,
  aim text not null,
  spain_note text,
  sort_order integer not null,
  constraint situations_id_slug check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint situations_sort_unique unique (sort_order),
  constraint situations_sort_positive check (sort_order >= 1)
);

create table public.situation_phrases (
  id text primary key,
  situation_id text not null references public.situations (id),
  word_id text not null references public.words (id),
  spanish text not null,
  english text not null,
  sort_order integer not null,
  constraint situation_phrases_order_unique unique (situation_id, sort_order),
  constraint situation_phrases_order_positive check (sort_order >= 0)
);

create table public.situation_turns (
  id text primary key,
  situation_id text not null references public.situations (id),
  speaker text not null,
  spanish text not null,
  english text not null,
  sort_order integer not null,
  constraint situation_turns_order_unique unique (situation_id, sort_order),
  constraint situation_turns_order_positive check (sort_order >= 0)
);

create table public.situation_exercises (
  id text primary key,
  situation_id text not null references public.situations (id),
  kind text not null,
  prompt text not null,
  choices jsonb,
  tokens jsonb,
  accepted_answers jsonb not null,
  translation text not null,
  explanation text not null,
  sort_order integer not null,
  constraint situation_exercises_id_slug check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint situation_exercises_kind check (kind in ('comprehension', 'construct')),
  constraint situation_exercises_order_unique unique (situation_id, sort_order),
  constraint situation_exercises_order_positive check (sort_order >= 0)
);

create table public.user_situation_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  situation_id text not null references public.situations (id),
  correct_count integer not null,
  total_count integer not null,
  finished boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, situation_id),
  constraint user_situation_progress_counts check (
    total_count >= 1
    and correct_count >= 0
    and correct_count <= total_count
  )
);

create index situation_phrases_situation_idx on public.situation_phrases (situation_id, sort_order);
create index situation_turns_situation_idx on public.situation_turns (situation_id, sort_order);
create index situation_exercises_situation_idx on public.situation_exercises (situation_id, sort_order);
create index user_situation_progress_user_idx on public.user_situation_progress (user_id);

alter table public.situations enable row level security;
alter table public.situation_phrases enable row level security;
alter table public.situation_turns enable row level security;
alter table public.situation_exercises enable row level security;
alter table public.user_situation_progress enable row level security;

revoke all on table public.situations from anon, authenticated;
revoke all on table public.situation_phrases from anon, authenticated;
revoke all on table public.situation_turns from anon, authenticated;
revoke all on table public.situation_exercises from anon, authenticated;
revoke all on table public.user_situation_progress from anon, authenticated;

grant select on table public.situations to authenticated;
grant select on table public.situation_phrases to authenticated;
grant select on table public.situation_turns to authenticated;
grant select on table public.situation_exercises to authenticated;
grant select, insert, update on table public.user_situation_progress to authenticated;

create policy "Read situations"
  on public.situations for select to authenticated using (true);

create policy "Read situation phrases"
  on public.situation_phrases for select to authenticated using (true);

create policy "Read situation turns"
  on public.situation_turns for select to authenticated using (true);

create policy "Read situation exercises"
  on public.situation_exercises for select to authenticated using (true);

create policy "Read own situation progress"
  on public.user_situation_progress for select to authenticated using (auth.uid() = user_id);

create policy "Insert own situation progress"
  on public.user_situation_progress for insert to authenticated with check (auth.uid() = user_id);

create policy "Update own situation progress"
  on public.user_situation_progress for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

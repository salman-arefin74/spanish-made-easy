-- Vocabulary bank and one row per learner per word.
-- Apply this once in the Supabase SQL editor, after 0001_profiles.sql.
-- Then run `npm run seed` with the service-role key in .env.
-- Learners can read the bank. They cannot change it.
-- Do not put the service-role key in the frontend.

create table public.categories (
  id text primary key,
  label text not null,
  description text not null,
  sort_order integer not null,
  recommended_level text not null,
  constraint categories_id_slug check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint categories_sort_order_unique unique (sort_order),
  constraint categories_sort_order_positive check (sort_order >= 1),
  constraint categories_recommended_level check (recommended_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'))
);

create table public.words (
  id text primary key,
  category_id text not null references public.categories (id),
  spanish text not null,
  english text not null,
  part_of_speech text not null,
  level text not null,
  example_spanish text not null,
  example_english text not null,
  article text,
  plural text,
  spain_note text,
  sort_order integer not null,
  constraint words_id_slug check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint words_category_order_unique unique (category_id, sort_order),
  constraint words_sort_order_positive check (sort_order >= 0),
  constraint words_part_of_speech check (
    part_of_speech in (
      'noun',
      'verb',
      'adjective',
      'adverb',
      'phrase',
      'pronoun',
      'preposition',
      'number',
      'interjection'
    )
  ),
  constraint words_level check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  constraint words_article check (article is null or article in ('el', 'la', 'los', 'las')),
  constraint words_noun_article check (
    (part_of_speech = 'noun' and article is not null)
    or (part_of_speech <> 'noun' and article is null)
  )
);

create index words_category_idx on public.words (category_id, sort_order);
create index words_level_idx on public.words (level);

create table public.user_word_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  word_id text not null references public.words (id),
  introduced_on date not null,
  last_response text not null,
  last_reviewed_on date not null,
  next_review_on date not null,
  interval_days integer not null default 1,
  ease numeric(3, 2) not null default 2.5,
  repetitions integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, word_id),
  constraint user_word_progress_response check (last_response in ('know', 'still_learning')),
  constraint user_word_progress_interval check (interval_days >= 1),
  constraint user_word_progress_ease check (ease >= 1.3),
  constraint user_word_progress_repetitions check (repetitions >= 0)
);

create index user_word_progress_user_idx on public.user_word_progress (user_id, introduced_on);
create index user_word_progress_due_idx on public.user_word_progress (user_id, next_review_on);

alter table public.categories enable row level security;
alter table public.words enable row level security;
alter table public.user_word_progress enable row level security;

revoke all on table public.categories from anon, authenticated;
revoke all on table public.words from anon, authenticated;
revoke all on table public.user_word_progress from anon, authenticated;

grant select on table public.categories to authenticated;
grant select on table public.words to authenticated;
grant select, insert, update on table public.user_word_progress to authenticated;

create policy "Read categories"
  on public.categories
  for select
  to authenticated
  using (true);

create policy "Read words"
  on public.words
  for select
  to authenticated
  using (true);

create policy "Read own word progress"
  on public.user_word_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Insert own word progress"
  on public.user_word_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Update own word progress"
  on public.user_word_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

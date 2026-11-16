-- Grammar topics, sentence patterns, exercises, and one score per learner per topic.
-- Apply this once in the Supabase SQL editor, after 0002_vocabulary.sql.
-- Then run `npm run seed` again. The same command updates the word bank and the lessons.
-- A retry replaces the stored score. There is no history of earlier attempts.
-- Do not put the service-role key in the frontend.

create table public.grammar_topics (
  id text primary key,
  title text not null,
  explanation text not null,
  common_mistake text not null,
  prerequisite_id text references public.grammar_topics (id),
  sort_order integer not null,
  constraint grammar_topics_id_slug check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint grammar_topics_sort_unique unique (sort_order),
  constraint grammar_topics_sort_positive check (sort_order >= 1)
);

create table public.grammar_examples (
  id text primary key,
  topic_id text not null references public.grammar_topics (id),
  spanish text not null,
  english text not null,
  sort_order integer not null,
  constraint grammar_examples_order_unique unique (topic_id, sort_order),
  constraint grammar_examples_order_positive check (sort_order >= 0)
);

create table public.sentence_patterns (
  id text primary key,
  topic_id text not null references public.grammar_topics (id),
  title text not null,
  frame text not null,
  slots jsonb not null,
  sort_order integer not null,
  constraint sentence_patterns_id_slug check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint sentence_patterns_order_positive check (sort_order >= 0)
);

create table public.exercises (
  id text primary key,
  topic_id text not null references public.grammar_topics (id),
  kind text not null,
  prompt text not null,
  choices jsonb,
  tokens jsonb,
  accepted_answers jsonb not null,
  translation text,
  explanation text not null,
  sort_order integer not null,
  constraint exercises_id_slug check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint exercises_kind check (kind in ('understand', 'construct', 'apply')),
  constraint exercises_order_unique unique (topic_id, sort_order),
  constraint exercises_order_positive check (sort_order >= 0)
);

create table public.user_grammar_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id text not null references public.grammar_topics (id),
  correct_count integer not null,
  total_count integer not null,
  finished boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id),
  constraint user_grammar_progress_counts check (
    total_count >= 1
    and correct_count >= 0
    and correct_count <= total_count
  )
);

create index user_grammar_progress_user_idx on public.user_grammar_progress (user_id);

alter table public.grammar_topics enable row level security;
alter table public.grammar_examples enable row level security;
alter table public.sentence_patterns enable row level security;
alter table public.exercises enable row level security;
alter table public.user_grammar_progress enable row level security;

revoke all on table public.grammar_topics from anon, authenticated;
revoke all on table public.grammar_examples from anon, authenticated;
revoke all on table public.sentence_patterns from anon, authenticated;
revoke all on table public.exercises from anon, authenticated;
revoke all on table public.user_grammar_progress from anon, authenticated;

grant select on table public.grammar_topics to authenticated;
grant select on table public.grammar_examples to authenticated;
grant select on table public.sentence_patterns to authenticated;
grant select on table public.exercises to authenticated;
grant select, insert, update on table public.user_grammar_progress to authenticated;

create policy "Read grammar topics"
  on public.grammar_topics for select to authenticated using (true);

create policy "Read grammar examples"
  on public.grammar_examples for select to authenticated using (true);

create policy "Read sentence patterns"
  on public.sentence_patterns for select to authenticated using (true);

create policy "Read exercises"
  on public.exercises for select to authenticated using (true);

create policy "Read own grammar progress"
  on public.user_grammar_progress for select to authenticated using (auth.uid() = user_id);

create policy "Insert own grammar progress"
  on public.user_grammar_progress for insert to authenticated with check (auth.uid() = user_id);

create policy "Update own grammar progress"
  on public.user_grammar_progress for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

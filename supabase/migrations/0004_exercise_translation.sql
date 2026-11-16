-- English gloss for each exercise, shown after Check.
-- Run this if 0003_grammar.sql was applied before the translation column existed.
-- Then run `npm run seed` again.

alter table public.exercises add column if not exists translation text;

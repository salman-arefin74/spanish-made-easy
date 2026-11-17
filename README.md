# Spanish Made Easy

A web app for learning everyday Spanish from Spain. Accounts use a username and password. The word bank, flashcards, sentence practice, revision, exams, and real-life situations are not built yet. After sign-in, those pages still say so.

## How to run

Use Node.js 22. The version is pinned in `.nvmrc`.

From `spanish-made-easy/`:

```bash
npm install
npm run dev
```

Open the URL Vite prints, usually http://127.0.0.1:5173/.

Without a Supabase project, Sign in explains that the URL and key are missing. Follow [Create the Supabase project](#create-the-supabase-project) and [Create the Cloudflare Turnstile widget](#create-the-cloudflare-turnstile-widget), then restart the dev server. The study sections stay behind sign-in.

```bash
npm test
npm run build
```

`npm test` checks username rules, the sign-in gate, and the six sections for a signed-in learner. `npm run build` typechecks and writes the static site to `dist/`.

## Create the Supabase project

The app needs one free Supabase project. Stay on the Free plan. If a screen asks for a card, a paid plan, or an add-on with a price, stop and leave that option off. A free organization can have two active projects. A free project pauses after a week with no database activity, and you restore it from the dashboard.

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) and create an account. GitHub or email is enough.
2. Create an organization and choose the **Free** plan. Pro, Team, and Enterprise are paid.
3. Choose **New project**.
   - Name it `spanish-made-easy`, or any name you will recognize.
   - Set a database password and store it somewhere private, outside this repository. That password is for the Postgres database. It is not the password learners type into the app.
   - Pick a region near you. A European region is a reasonable default from Germany.
   - Leave the instance size on the smallest free option. Skip paid extras such as a dedicated IPv4 address, point-in-time recovery, and a custom domain.
4. Wait until the project is active. The first start can take a few minutes.
5. Open the project’s **Connect** dialog. It shows the project URL and the publishable key.
   - If Connect is not on the page, open **Project Settings → API Keys**. There is no separate Settings → API page on current projects.
   - Copy the project URL, shaped like `https://xxxxxxxx.supabase.co`, into `VITE_SUPABASE_URL`.
   - Copy the **publishable** key, which starts with `sb_publishable_`, into `VITE_SUPABASE_ANON_KEY`.
   - Older projects may only show a legacy **anon** key, a long value starting with `eyJ`. That legacy key also belongs in `VITE_SUPABASE_ANON_KEY`.
   - Never copy a **secret** key (`sb_secret_...`) or a **service_role** key. Both bypass Row Level Security. They do not belong in `.env`, in source, or in the built site.
6. Open **Authentication**, then the **Email** provider. The label may be Providers, or Sign In / Up.
   - Turn **Confirm email** off. The app signs people up with a hidden address that cannot receive mail. If confirmation stays on, the account is created and then stuck.
   - Leave **Allow new users to sign up** on.
7. Open the **SQL Editor**, create a new query, paste the whole file [supabase/migrations/0001_profiles.sql](supabase/migrations/0001_profiles.sql), and run it. You should see a success result. The script also copies usernames created before the table existed. Running it twice will fail on “already exists”; that means the first run worked. If you already ran an older copy of this file, paste and run only the final `insert into public.profiles` statement.

## Create the Cloudflare Turnstile widget

Turnstile is Cloudflare’s free bot check. You do not move a domain to Cloudflare, and you do not buy a plan. Once the secret is saved in Supabase, both Create account and Sign in must complete the check. Supabase applies it to both, so the sign-in form shows it too.

1. Open [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) and create a free account. Skip any offer to add a site or a paid plan. Turnstile does not need a domain on Cloudflare.
2. In the dashboard sidebar, open **Turnstile**. The direct path looks like `https://dash.cloudflare.com/?to=/:account/turnstile`.
3. Select **Add widget**.
   - Widget name: `Spanish Made Easy`.
   - Hostnames: add `localhost` and `127.0.0.1`. The dev server in this README uses `127.0.0.1`, and the hostname does not include the port. Add a real hostname later only when the site is deployed.
   - Widget mode: **Managed**.
4. Select **Create**. Cloudflare shows two values on that screen. Copy both before you leave it. The site key stays visible in the widget settings afterwards. The secret is not shown again; if you lose it, rotate the secret from the same widget page.
   - **Site key** goes in `.env` as `VITE_TURNSTILE_SITE_KEY`. This value is public and is safe in the browser.
   - **Secret key** goes in Supabase, not in `.env`. In the Supabase project open **Authentication → Bot and Abuse Protection**, turn on **Enable CAPTCHA protection**, choose **Cloudflare Turnstile**, paste the secret, and save.

## Connect the keys

From `spanish-made-easy/`, copy the example file and fill the three values:

```bash
cp .env.example .env
```

```text
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_TURNSTILE_SITE_KEY=0x...
```

`.env` is gitignored. Restart `npm run dev` after saving it. Vite reads these values only at startup.

Create an account, read the password warning, and choose a starting point. Sign-in asks for the username and password. It does not ask for an email, and there is no password reset.

The profile trigger stores the username in lowercase. `Ana` and `ana` are the same account. A learner can read and update only their own profile. They cannot insert or delete profile rows, and they cannot change the username.

Two-account check, once the project exists: create two usernames in two browsers. Each Settings page shows only that username. This is not run by `npm test`, because it needs your Supabase project.

## Load the word bank

The flashcards read words from Supabase. The browser cannot create those tables.

1. In the Supabase SQL editor, run [supabase/migrations/0002_vocabulary.sql](supabase/migrations/0002_vocabulary.sql) after the profiles migration.
2. In `.env`, set `SUPABASE_SERVICE_ROLE_KEY` to the secret key from Project Settings → API Keys. Do not prefix it with `VITE_`. That key bypasses Row Level Security and is only for the seed command.
3. From `spanish-made-easy/`, run `npm run seed`. It checks the JSON, then upserts categories and words. Running it again updates the same ids.

A learner can read the bank and can write only their own progress. Open Vocabulary, choose Today's words or a category, and study. "Still learning" shows that card once more in the session. "I know this" schedules it for the next local day. Neither answer marks the word known yet.

These headwords are the Spain-specific ones to check first: vale, ordenador, móvil, coger, conducir, zumo, patata, tortilla, bocadillo, camarero, piso, coche, gafas, jersey, billete, gasolinera, aparcamiento, quedar, apetecer, echar de menos, and vosotros. The card note says what the rest of the Spanish-speaking world often uses instead.

## Load the grammar

Sentence Builder reads lessons from the same project.

1. In the SQL editor, run [supabase/migrations/0003_grammar.sql](supabase/migrations/0003_grammar.sql) after the vocabulary migration.
2. From `spanish-made-easy/`, run `npm run seed` again. The same command updates the word bank and the lessons.

If the grammar tables are already loaded, run [supabase/migrations/0004_exercise_translation.sql](supabase/migrations/0004_exercise_translation.sql) as well, then `npm run seed` again. Check then shows the English of the listed sentence.

A topic finishes at 80 percent, rounded up. Twelve exercises need 10 correct. Try again replaces the stored score. A later topic names the earlier one to study first, and the lesson still opens. Grammar does not use the daily vocabulary target. The checker accepts the answers listed for that exercise, including a listed Latin American variant, and it keeps accents. It does not claim to judge every possible Spanish sentence.

## Hosting

The site is a static Vite app. `public/_redirects` sends unknown paths to `index.html` so client-side routes work on Cloudflare Pages. Deployment is not part of this milestone.

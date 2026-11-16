# Architecture

Spanish Made Easy is a static Vite single-page app. The browser will talk to Supabase with the public anon key and the signed-in user's JWT. There is no application server, no AI API, and no paid service.

Accounts are implemented. The study pages are still empty on purpose.

## Accounts

Supabase Auth has no username provider. Sign-up asks only for a username and a password. The app stores a hidden address the learner never sees:

`{username}@users.spanishmadeeasy.invalid`

`.invalid` is a reserved domain, so the address cannot receive mail. Usernames are stored lowercase, 3–24 characters, using letters, numbers, and underscores. `Ana` and `ana` are the same username.

Email confirmation must be turned off in the Supabase dashboard. With that setting, sign-up returns a session. With it left on, the account cannot be confirmed, because the message has nowhere to go.

A duplicate username comes back from Auth as "User already registered" and is shown as "That username is already taken. Choose a different one." `profiles.username` has a unique constraint, and a trigger blocks renaming.

There is no password recovery, because there is no mailbox. Sign-up says that a forgotten password cannot be reset and that the username stays taken. A signed-in learner can change their password. There is no delete button in the app. An operator can remove a user from the Supabase dashboard. The privacy page says that the username and study progress stay for as long as the project exists.

Sign-up sends a Cloudflare Turnstile token to Supabase Auth. Supabase checks it. The Turnstile secret stays in the Supabase dashboard.

## Database size

The course target is about 2,000 vocabulary entries, the grammar topics, about 50 sentence patterns, and twelve situation dialogues. With indexes, that is on the order of a few tens of megabytes. Pronunciation uses the browser `speechSynthesis` API, so the database does not store audio.

Progress rows are the part that grows. One studied word is a few hundred bytes. About 1,000 learners with broad progress fit in the free 500 MB database, with room left. The ceiling shows up around a few thousand heavy users, or sooner if quiz rows copy lesson text. Quiz rows will store ids and chosen answers.

The free plan has no backups. The content JSON in this repository is the backup of the curriculum. There are no backups of learner progress until a later export exists.

A free Supabase project pauses after 7 days without API or database activity. Two cases matter:

- A week with nobody opening the app during development. The next local session fails until the project is restored in the dashboard.
- A week with no learner on the public site. Cloudflare still serves the pages. Sign-in and anything that reads the database fail until the project is restored.

Studying a lot, adding vocabulary, or deploying the site does not cause that pause. One person using the app during the week is enough activity. Filling 500 MB is a storage quota, separate from the pause.

## Hosting

The site will be deployed to Cloudflare Pages on the free `pages.dev` subdomain. Pages Free allows 500 builds a month and does not meter static traffic through a credit pool. It does not pause the site for inactivity. If the build quota runs out, the last deployment keeps serving.

`public/_redirects` contains `/* /index.html 200` so the client router handles paths such as `/vocabulary`. Do not enable Cloudflare Workers for this app unless a later milestone has a job the static site cannot do.

Netlify's free credit pool is a poor fit because production deploys and bandwidth share it. Vercel Hobby is limited to non-commercial personal use.

## What the shell is

The six routes are Progress, Vocabulary, Sentence Builder, Revision, Exams, and Real-Life Spanish. On a narrow screen the navigation is a bottom bar. From the `md` breakpoint it is a side bar with the labels visible. The reading column has a maximum width.

Each page says that module is not built yet. The progress page does not show zeroes or sample scores.

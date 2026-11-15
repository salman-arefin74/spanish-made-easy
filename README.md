# Spanish Made Easy

A web app for learning everyday Spanish from Spain. This repository currently contains the application shell: navigation, the dark layout, and empty pages. Accounts, vocabulary, and study features are not built yet.

The course itself is not built. There is no sign-up, word bank, flashcards, sentence practice, revision, exams, or real-life situations yet.

## How to run

Use Node.js 22. The version is pinned in `.nvmrc`.

From `spanish-made-easy/`:

```bash
npm install
npm run dev
```

Open the URL Vite prints, usually http://127.0.0.1:5173/. You should see the dark shell with six sections. Each page says that module is not built yet.

```bash
npm test
npm run build
```

`npm test` renders the shell and checks the six sections. `npm run build` typechecks and writes the static site to `dist/`.

## Environment

Copy `.env.example` to `.env` when a Supabase project exists. Leave both values blank until then.

`VITE_SUPABASE_ANON_KEY` is the public anon key. The service-role key bypasses Row Level Security and must never be placed in a `VITE_` variable, in frontend source, or in the built JavaScript.

## Hosting

The site is a static Vite app. `public/_redirects` sends unknown paths to `index.html` so client-side routes work on Cloudflare Pages. Deployment is not part of this shell.

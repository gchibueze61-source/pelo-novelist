# Pelo — Setup Guide (Netlify + Supabase + Dify)

Private, single-user workspace. No payments, no tiers, no tokens. Two services to connect.

## 1. Supabase (auth + database)

1. supabase.com → New project.
2. **SQL Editor → New query** → paste everything in `supabase-schema.sql` → Run.
   This creates `profiles`, `chats`, `chat_messages`, `projects`, `chapters`, `project_context` — all with row-level security so only you can ever read your own rows.
3. **Project Settings → API** → copy **Project URL** and **anon public key** into `.env`.
4. **Authentication → Providers** → leave Email enabled. Since this is single-user, consider turning off "Enable email confirmations" in Auth settings so you can sign in immediately without a verification email loop — up to you.

## 2. Dify (your writing engine)

1. Open your Dify app → **API Access** in the left menu.
2. Copy the **API Key** and the **API base URL** (usually `https://api.dify.ai/v1`) into `.env`.

## Running it locally

```
cp .env.example .env
# fill in the real values
npm install
npm run dev
```

## Deploying to Netlify

1. Push this whole folder to a GitHub repo.
2. Netlify → **Add new site → Import an existing project** → pick the repo.
3. Build command: `npm run build`. Publish directory: `dist`. (Already set in `netlify.toml`, Netlify should auto-detect it.)
4. **Site settings → Environment variables** → add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DIFY_API_URL`, `VITE_DIFY_API_KEY` — exactly as they are in your `.env`.
5. Deploy. `netlify.toml` already handles the SPA redirect so refreshing `/` or any route won't 404.

## How the workspace works

- **Chats** (left sidebar, top): continuous threads, no persistent style — quick brainstorming, no project attached.
- **Projects**: each one holds three tabs —
  - **Chapters**: create/edit/delete chapters, write directly or generate with Dify. Autosaves 600ms after you stop typing.
  - **Style Profile**: free-text instructions (POV, tone, platform formatting rules) injected into every generation in that project.
  - **Reference Files**: upload `.txt`/`.md` files, their full text gets bundled into every prompt alongside the style profile. PDF/DOCX aren't parsed yet — for now paste key excerpts straight into the style profile.
- Every generate call in a Project sends: style instructions + all attached doc text + your prompt, bundled into one message to Dify (`difyService.ts` → `buildBundledPrompt`). This is what makes the project "remember" its voice — Dify itself doesn't persist style, so it's re-injected every time.
- Light/dark mode toggle in the sidebar footer, persisted in the browser.

## What's real and tested

- Supabase Auth (sign up/in/out) — real sessions, RLS locks every table to your own `user_id`.
- Chats: create, list, send, receive streamed Dify responses, auto-titles from the first message.
- Projects: create, list, delete.
- Chapters: create, edit, autosave, delete, generate via Dify with full project context.
- Style Profile: saved per-project, injected into every generation.
- Reference Files: `.txt`/`.md` upload, stored as text in `project_context.attached_documents`, injected into every generation.
- Dark mode: full app, toggle persists across reloads.
- Production build verified clean — zero TypeScript errors, zero bundler warnings.

## What's not built yet (be aware)

- PDF/DOCX text extraction — only `.txt`/`.md` are read. Adding `pdfjs-dist` and `mammoth` for real parsing is a follow-up if you need it.
- No file size limit enforced on uploads yet — keep reference docs reasonably sized (they get sent to Dify on every request, so huge files slow every generation).
- No "delete chat" button in the UI yet, though `deleteChat()` exists in `lib/supabase.ts` if you want it wired to a button quickly.

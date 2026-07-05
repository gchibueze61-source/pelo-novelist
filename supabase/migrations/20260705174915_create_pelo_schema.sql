/*
# Pelo Writing Workspace — Full Schema

## Overview
Creates the complete database schema for Pelo, an AI-powered writing workspace.
Users can create chat threads for brainstorming and writing projects with chapters,
style profiles, and reference documents. All data is scoped per-user via RLS.

## New Tables

1. `profiles` — User display info (extends Supabase auth.users)
   - `id` (uuid, PK, references auth.users) — matches the auth user
   - `email` (text, not null) — denormalized for quick display
   - `name` (text, nullable) — display name
   - `created_at` (timestamptz)

2. `chats` — Continuous AI chat threads for brainstorming
   - `id` (uuid, PK)
   - `user_id` (uuid, references profiles, defaults to auth.uid())
   - `title` (text, default 'New chat')
   - `dify_conversation_id` (text, nullable) — Dify conversation continuity
   - `created_at`, `updated_at` (timestamptz)

3. `chat_messages` — Individual messages within a chat
   - `id` (uuid, PK)
   - `chat_id` (uuid, references chats, cascade delete)
   - `user_id` (uuid, references profiles, defaults to auth.uid())
   - `role` (text: 'user' | 'assistant' | 'system')
   - `content` (text)
   - `created_at` (timestamptz)

4. `projects` — Writing projects (books, manuscripts)
   - `id` (uuid, PK)
   - `user_id` (uuid, references profiles, defaults to auth.uid())
   - `name` (text, not null)
   - `description` (text, nullable)
   - `dify_conversation_id` (text, nullable)
   - `created_at`, `updated_at` (timestamptz)

5. `chapters` — Chapters/files within a project
   - `id` (uuid, PK)
   - `project_id` (uuid, references projects, cascade delete)
   - `user_id` (uuid, references profiles, defaults to auth.uid())
   - `title` (text, default 'Untitled chapter')
   - `content` (text, default '')
   - `display_order` (integer, default 0)
   - `created_at`, `updated_at` (timestamptz)

6. `project_context` — Style profile + reference docs (one row per project)
   - `id` (uuid, PK)
   - `project_id` (uuid, unique, references projects, cascade delete)
   - `user_id` (uuid, references profiles, defaults to auth.uid())
   - `style_instructions` (text, default '')
   - `attached_documents` (jsonb, default '[]') — array of {name, text}
   - `updated_at` (timestamptz)

## Security
- RLS enabled on ALL tables.
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE), scoped to `authenticated`.
- Ownership checked via `auth.uid() = user_id`.
- `user_id` columns default to `auth.uid()` so frontend inserts that omit
  user_id still satisfy the WITH CHECK policy.

## Important Notes
1. All user_id columns use `DEFAULT auth.uid()` — the frontend can insert
   without explicitly passing user_id.
2. Cascade deletes: deleting a profile cascades to all child rows;
   deleting a project cascades to its chapters and context.
3. `project_context.project_id` has a UNIQUE constraint — one context row
   per project.
4. Policies use DROP IF EXISTS before CREATE for idempotency.
*/

-- ========== profiles ==========
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profiles" ON profiles;
CREATE POLICY "select_own_profiles" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profiles" ON profiles;
CREATE POLICY "insert_own_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profiles" ON profiles;
CREATE POLICY "update_own_profiles" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profiles" ON profiles;
CREATE POLICY "delete_own_profiles" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ========== chats ==========
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat',
  dify_conversation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chats" ON chats;
CREATE POLICY "select_own_chats" ON chats FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chats" ON chats;
CREATE POLICY "insert_own_chats" ON chats FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chats" ON chats;
CREATE POLICY "update_own_chats" ON chats FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chats" ON chats;
CREATE POLICY "delete_own_chats" ON chats FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ========== chat_messages ==========
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chat_messages" ON chat_messages;
CREATE POLICY "select_own_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;
CREATE POLICY "insert_own_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chat_messages" ON chat_messages;
CREATE POLICY "update_own_chat_messages" ON chat_messages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chat_messages" ON chat_messages;
CREATE POLICY "delete_own_chat_messages" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ========== projects ==========
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  dify_conversation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ========== chapters ==========
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled chapter',
  content text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chapters" ON chapters;
CREATE POLICY "select_own_chapters" ON chapters FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chapters" ON chapters;
CREATE POLICY "insert_own_chapters" ON chapters FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chapters" ON chapters;
CREATE POLICY "update_own_chapters" ON chapters FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chapters" ON chapters;
CREATE POLICY "delete_own_chapters" ON chapters FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ========== project_context ==========
CREATE TABLE IF NOT EXISTS project_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  style_instructions text NOT NULL DEFAULT '',
  attached_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_context ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_project_context" ON project_context;
CREATE POLICY "select_own_project_context" ON project_context FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_project_context" ON project_context;
CREATE POLICY "insert_own_project_context" ON project_context FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_project_context" ON project_context;
CREATE POLICY "update_own_project_context" ON project_context FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_project_context" ON project_context;
CREATE POLICY "delete_own_project_context" ON project_context FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ========== Indexes ==========
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_project_id ON chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_chapters_user_id ON chapters(user_id);
CREATE INDEX IF NOT EXISTS idx_project_context_project_id ON project_context(project_id);

-- ========== updated_at triggers ==========
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chats_updated_at ON chats;
CREATE TRIGGER trg_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_chapters_updated_at ON chapters;
CREATE TRIGGER trg_chapters_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_project_context_updated_at ON project_context;
CREATE TRIGGER trg_project_context_updated_at BEFORE UPDATE ON project_context
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
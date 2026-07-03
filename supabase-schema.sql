-- PELO — single-user workspace schema
-- Run once in Supabase Dashboard > SQL Editor > New query
-- Safe to run on a fresh project. If re-running, drop old tables first:
-- drop table if exists chapters, project_context, projects, chat_messages, chats, profiles cascade;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id);
create policy "insert own profile" on profiles for insert with check (auth.uid() = id);

-- Continuous chat threads (left sidebar "Chats")
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null default 'New chat',
  dify_conversation_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table chats enable row level security;

create policy "read own chats" on chats for select using (auth.uid() = user_id);
create policy "insert own chats" on chats for insert with check (auth.uid() = user_id);
create policy "update own chats" on chats for update using (auth.uid() = user_id);
create policy "delete own chats" on chats for delete using (auth.uid() = user_id);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table chat_messages enable row level security;

create policy "read own messages" on chat_messages for select using (auth.uid() = user_id);
create policy "insert own messages" on chat_messages for insert with check (auth.uid() = user_id);
create policy "delete own messages" on chat_messages for delete using (auth.uid() = user_id);

-- Projects (books/manuscripts directory)
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  dify_conversation_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projects enable row level security;

create policy "read own projects" on projects for select using (auth.uid() = user_id);
create policy "insert own projects" on projects for insert with check (auth.uid() = user_id);
create policy "update own projects" on projects for update using (auth.uid() = user_id);
create policy "delete own projects" on projects for delete using (auth.uid() = user_id);

-- Chapters/files nested inside a project
create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null default 'Untitled chapter',
  content text not null default '',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table chapters enable row level security;

create policy "read own chapters" on chapters for select using (auth.uid() = user_id);
create policy "insert own chapters" on chapters for insert with check (auth.uid() = user_id);
create policy "update own chapters" on chapters for update using (auth.uid() = user_id);
create policy "delete own chapters" on chapters for delete using (auth.uid() = user_id);

-- Style/tone profile + attached reference documents, one row per project
create table if not exists project_context (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  style_instructions text not null default '',
  attached_documents jsonb not null default '[]'::jsonb, -- [{name, text}]
  updated_at timestamptz not null default now()
);

alter table project_context enable row level security;

create policy "read own context" on project_context for select using (auth.uid() = user_id);
create policy "insert own context" on project_context for insert with check (auth.uid() = user_id);
create policy "update own context" on project_context for update using (auth.uid() = user_id);
create policy "delete own context" on project_context for delete using (auth.uid() = user_id);

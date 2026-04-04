-- ============================================================
-- FeedbackPin — Initial Schema
-- Run via: supabase db push  OR  paste into Supabase SQL editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- PROJECTS
-- ============================================================
create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  type          text not null check (type in ('url', 'image', 'pdf')),
  source_url    text,          -- original URL or Storage path of uploaded file
  screenshot_url text,         -- Supabase Storage path of captured screenshot
  created_at    timestamptz not null default now()
);

-- ============================================================
-- COMMENTS
-- ============================================================
create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  x_percent   float not null check (x_percent >= 0 and x_percent <= 100),
  y_percent   float not null check (y_percent >= 0 and y_percent <= 100),
  body        text not null,
  author_name text not null,
  resolved    boolean not null default false,
  parent_id   uuid references comments (id) on delete cascade,  -- null = top-level pin
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SHARE TOKENS
-- ============================================================
create table if not exists share_tokens (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  token       text not null unique default gen_random_uuid()::text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table projects     enable row level security;
alter table comments     enable row level security;
alter table share_tokens enable row level security;

-- ---- PROJECTS ----
-- Owners can read their own projects
create policy "owner_select_projects"
  on projects for select
  using (auth.uid() = owner_id);

-- Owners can insert their own projects
create policy "owner_insert_projects"
  on projects for insert
  with check (auth.uid() = owner_id);

-- Owners can update their own projects
create policy "owner_update_projects"
  on projects for update
  using (auth.uid() = owner_id);

-- Owners can delete their own projects
create policy "owner_delete_projects"
  on projects for delete
  using (auth.uid() = owner_id);

-- Public can read a project if they supply a valid share token
-- (enforced in application layer via service role; RLS keeps data safe at DB level)
-- This policy allows the service role (used by the review API route) to bypass RLS.
-- Reviewer access is validated in the API route before any data is returned.


-- ---- COMMENTS ----
-- Owners can manage all comments on their projects
create policy "owner_select_comments"
  on comments for select
  using (
    exists (
      select 1 from projects
      where projects.id = comments.project_id
        and projects.owner_id = auth.uid()
    )
  );

create policy "owner_insert_comments"
  on comments for insert
  with check (
    exists (
      select 1 from projects
      where projects.id = comments.project_id
        and projects.owner_id = auth.uid()
    )
  );

create policy "owner_update_comments"
  on comments for update
  using (
    exists (
      select 1 from projects
      where projects.id = comments.project_id
        and projects.owner_id = auth.uid()
    )
  );

create policy "owner_delete_comments"
  on comments for delete
  using (
    exists (
      select 1 from projects
      where projects.id = comments.project_id
        and projects.owner_id = auth.uid()
    )
  );

-- Reviewers (unauthenticated) insert comments via the API route using the service role.
-- The API route validates the share token before allowing inserts.
-- No direct anon policy is granted here — all reviewer writes go through the service role.


-- ---- SHARE TOKENS ----
-- Owners can manage share tokens for their projects
create policy "owner_select_share_tokens"
  on share_tokens for select
  using (
    exists (
      select 1 from projects
      where projects.id = share_tokens.project_id
        and projects.owner_id = auth.uid()
    )
  );

create policy "owner_insert_share_tokens"
  on share_tokens for insert
  with check (
    exists (
      select 1 from projects
      where projects.id = share_tokens.project_id
        and projects.owner_id = auth.uid()
    )
  );

create policy "owner_delete_share_tokens"
  on share_tokens for delete
  using (
    exists (
      select 1 from projects
      where projects.id = share_tokens.project_id
        and projects.owner_id = auth.uid()
    )
  );

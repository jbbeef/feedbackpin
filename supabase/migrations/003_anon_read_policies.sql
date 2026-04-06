-- ============================================================
-- FeedbackPin — Anonymous read policies for shared projects
-- Run via: supabase db push  OR  paste into Supabase SQL editor
-- ============================================================
-- These policies allow anonymous (unauthenticated) users to SELECT
-- comments and projects that have been explicitly shared via a share token.
-- This is required for:
--   1. Supabase Realtime subscriptions on the reviewer canvas (F014)
--   2. Direct anon queries if needed in future
--
-- Security model: project UUIDs are 128-bit random values, making
-- enumeration attacks infeasible. Publishing a share link is an
-- explicit owner action that enables these policies.
-- ============================================================

-- Allow anon to read comments if the project has been shared
create policy "anon_select_comments"
  on comments for select
  to anon
  using (
    exists (
      select 1 from share_tokens
      where share_tokens.project_id = comments.project_id
    )
  );

-- Allow anon to read projects that have been shared
create policy "anon_select_projects"
  on projects for select
  to anon
  using (
    exists (
      select 1 from share_tokens
      where share_tokens.project_id = projects.id
    )
  );

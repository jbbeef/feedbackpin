-- ============================================================
-- FeedbackPin — Storage Bucket for Project Uploads
-- Run via: supabase db push  OR  paste into Supabase SQL editor
-- ============================================================

-- Create the project-uploads bucket (public read)
insert into storage.buckets (id, name, public)
values ('project-uploads', 'project-uploads', true)
on conflict (id) do nothing;

-- Authenticated users can upload files only into their own folder
-- (first path component must equal their user ID)
create policy "auth_users_can_upload_to_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read access to all files in project-uploads
create policy "public_can_read_project_uploads"
  on storage.objects for select
  using (bucket_id = 'project-uploads');

-- Authenticated users can delete their own uploads
create policy "auth_users_can_delete_own_uploads"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

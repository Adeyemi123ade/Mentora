insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tutor-documents',
  'tutor-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Verification documents are accessed only by the server's service role.
-- No anon or authenticated storage.objects policies are intentionally added.

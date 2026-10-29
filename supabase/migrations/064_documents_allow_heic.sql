-- 064_documents_allow_heic.sql
--
-- Sign-up silently lost the commercial register when it was an iPhone photo:
-- the documents bucket (031) only accepts jpeg/png/webp/pdf, so a HEIC file
-- was refused with "mime type image/heic is not supported" — the account was
-- created without the document, and checkout later demands it.
--
-- The website now converts HEIC to JPEG before uploading where the browser
-- can (Safari); accept HEIC/HEIF too for the cases it can't and for the apps.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'
]
WHERE id = 'documents';

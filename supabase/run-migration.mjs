/**
 * Run migration 031 against the remote Supabase instance.
 * Usage:
 *   node supabase/run-migration.mjs <SERVICE_ROLE_KEY>
 */
const [,, serviceRoleKey] = process.argv;

if (!serviceRoleKey) {
  console.error('Usage: node supabase/run-migration.mjs <SERVICE_ROLE_KEY>');
  process.exit(1);
}

const SUPABASE_URL = 'https://supabasemobile.ardalsharq.com';

const sql = `
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS commercial_register_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', FALSE, 5242880,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
) ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users upload own documents' AND tablename = 'objects'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Users upload own documents"
        ON storage.objects FOR INSERT
        WITH CHECK (
          bucket_id = 'documents' AND
          auth.uid()::text = (storage.foldername(name))[1]
        )
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users read own documents' AND tablename = 'objects'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Users read own documents"
        ON storage.objects FOR SELECT
        USING (
          bucket_id = 'documents' AND
          auth.uid()::text = (storage.foldername(name))[1]
        )
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins read all documents' AND tablename = 'objects'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Admins read all documents"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'documents' AND is_admin())
    $p$;
  END IF;
END
$$;
`;

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
  },
});

// Supabase doesn't expose a raw SQL endpoint via REST with anon/service key directly.
// Use the pg-based approach via the Supabase JS client's admin API.
// Instead, hit the /pg endpoint that some self-hosted setups expose, or use supabase-meta.

// Try via supabase-meta (postgres-meta) which IS exposed in self-hosted setups
const metaRes = await fetch(`${SUPABASE_URL}/pg/query`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
  },
  body: JSON.stringify({ query: sql }),
});

if (metaRes.ok) {
  const data = await metaRes.json();
  console.log('✓ Migration applied successfully!', data);
} else {
  const text = await metaRes.text();
  console.error('✗ Failed:', metaRes.status, text);
  
  // Try alternative endpoint
  console.log('\nTrying alternative endpoint...');
  const alt = await fetch(`${SUPABASE_URL}:8000/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  const altText = await alt.text();
  console.log('Status:', alt.status, altText);
}

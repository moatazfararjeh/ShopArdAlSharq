import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://supabasemobile.ardalsharq.com';
const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzI2OTI4MCwiZXhwIjo0OTI4OTQyODgwLCJyb2xlIjoiYW5vbiJ9.veK9gm5UJT-0cLAIyzY_-AEhclyOwMzQXrWkNDbWUxA';
const OUTPUT_DIR = path.join(process.cwd(), 'downloaded-product-images');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function downloadImage(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(filePath, buffer);
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const { data, error } = await supabase
    .from('product_images')
    .select('id, url, product_id, storage_path');

  if (error) { console.error('Error fetching images:', error.message); process.exit(1); }
  if (!data || data.length === 0) { console.log('No images found.'); return; }

  console.log(`Found ${data.length} images. Downloading...`);

  let success = 0, failed = 0;
  for (const img of data) {
    const ext = img.url?.split('.').pop()?.split('?')[0] ?? 'jpg';
    const fileName = `${img.product_id}_${img.id}.${ext}`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    try {
      await downloadImage(img.url, filePath);
      console.log(`✓ ${fileName}`);
      success++;
    } catch (e) {
      console.error(`✗ ${fileName}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} downloaded, ${failed} failed.`);
  console.log(`Saved to: ${OUTPUT_DIR}`);
}

main();

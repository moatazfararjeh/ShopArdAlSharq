import { supabase } from '@/lib/supabase';
import { parseSupabaseError } from '@/lib/errors';
import { MAX_IMAGE_SIZE_BYTES } from '@/lib/constants';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export async function uploadImage(
  bucket: string,
  filePath: string,
  fileBlob: Blob,
): Promise<UploadResult> {
  if (fileBlob.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('حجم الصورة يتجاوز الحد المسموح به (2 ميجابايت)');
  }

  const { data, error } = await supabase.storage.from(bucket).upload(filePath, fileBlob, {
    upsert: true,
    contentType: fileBlob.type,
  });

  if (error) throw parseSupabaseError(error);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { path: data.path, publicUrl: urlData.publicUrl };
}

export async function deleteImage(bucket: string, filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error) throw parseSupabaseError(error);
}

export function getPublicUrl(bucket: string, filePath: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

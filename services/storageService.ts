import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as decodeBase64 } from 'base64-arraybuffer';
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

const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Upload a document (PDF or image) to the private `documents` bucket. */
export async function uploadDocument(
  userId: string,
  fileUri: string,
  fileName: string,
  mimeType: string,
): Promise<string> {
  // fetch(uri).blob() is unreliable on Android for local file URIs (silently
  // truncated/empty blobs, or the upload failing deep inside supabase-js's
  // XHR body handling). expo-file-system's base64 read + manual ArrayBuffer
  // decode is the combination that reliably handles both file:// and
  // content:// URIs on Android (the picker can return either depending on
  // Android version/picker UI). Web keeps fetch/blob since its URI is a
  // browser-native blob: URL, not a local path.
  const body: Blob | ArrayBuffer =
    Platform.OS === 'web'
      ? await (await fetch(fileUri)).blob()
      : decodeBase64(await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' }));
  const size = body instanceof ArrayBuffer ? body.byteLength : body.size;

  if (size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error('حجم الملف يتجاوز الحد المسموح به (5 ميجابايت)');
  }

  const ext = fileName.split('.').pop() ?? 'jpg';
  const path = `${userId}/commercial_register_${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage.from('documents').upload(path, body, {
    upsert: true,
    contentType: mimeType,
  });

  if (error) throw parseSupabaseError(error);

  // Return the storage path (not a public URL) — the bucket is private.
  // Use getSignedDocumentUrl() to generate a temporary URL for viewing.
  return data.path;
}

/** Generate a signed URL valid for 60 seconds for a private document path.
 * Accepts either a bare storage path ("userId/file.jpg") or a legacy full public URL. */
export async function getSignedDocumentUrl(storagePath: string): Promise<string> {
  // Handle legacy records that stored the full public URL instead of just the path.
  // Extract everything after "/documents/" as the actual storage path.
  const marker = '/documents/';
  const normalizedPath = storagePath.includes(marker)
    ? storagePath.split(marker).slice(1).join(marker)
    : storagePath;

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(normalizedPath, 300);
  if (error) throw parseSupabaseError(error);
  return data.signedUrl;
}

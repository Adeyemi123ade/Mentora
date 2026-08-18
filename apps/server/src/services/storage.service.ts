import { env } from '../env.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../lib/AppError.js';

const PUBLIC_BUCKET = 'profile-photos';
const PRIVATE_DOCUMENT_BUCKET = 'tutor-documents';

export function isStorageConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function uploadPhoto(path: string, buffer: Buffer, contentType: string): Promise<string> {
  if (!supabaseAdmin) {
    throw new AppError(503, 'Photo uploads are not configured on this server yet', 'STORAGE_NOT_CONFIGURED');
  }

  const { error } = await supabaseAdmin.storage.from(PUBLIC_BUCKET).upload(path, buffer, { contentType, upsert: true });
  if (error) {
    throw new AppError(502, `Failed to upload photo: ${error.message}`, 'STORAGE_UPLOAD_FAILED');
  }

  const { data } = supabaseAdmin.storage.from(PUBLIC_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPrivateDocument(path: string, buffer: Buffer, contentType: string): Promise<string> {
  if (!supabaseAdmin) {
    throw new AppError(503, 'Document uploads are not configured on this server yet', 'STORAGE_NOT_CONFIGURED');
  }
  const { error } = await supabaseAdmin.storage.from(PRIVATE_DOCUMENT_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new AppError(502, `Failed to upload document: ${error.message}`, 'STORAGE_UPLOAD_FAILED');
  }
  return path;
}

export async function createDocumentSignedUrl(path: string, expiresInSeconds = 300): Promise<string> {
  if (!supabaseAdmin) {
    throw new AppError(503, 'Document storage is not configured on this server yet', 'STORAGE_NOT_CONFIGURED');
  }
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabaseAdmin.storage
    .from(PRIVATE_DOCUMENT_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) {
    throw new AppError(502, `Failed to open document: ${error.message}`, 'STORAGE_SIGN_FAILED');
  }
  return data.signedUrl;
}

export async function deletePhotoByUrl(url: string | null): Promise<void> {
  if (!supabaseAdmin || !url) return;
  const marker = `/object/public/${PUBLIC_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;
  const path = url.slice(index + marker.length);
  await supabaseAdmin.storage.from(PUBLIC_BUCKET).remove([path]);
}

export async function deletePrivateDocument(path: string | null): Promise<void> {
  if (!supabaseAdmin || !path) return;
  if (/^https?:\/\//i.test(path)) {
    await deletePhotoByUrl(path);
    return;
  }
  await supabaseAdmin.storage.from(PRIVATE_DOCUMENT_BUCKET).remove([path]);
}

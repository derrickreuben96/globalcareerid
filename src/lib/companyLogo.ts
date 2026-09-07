import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads a company logo to the `company-logos` bucket and returns its public URL.
 *
 * Storage RLS allows an INSERT of a new object and an UPDATE of an existing one,
 * but a single `upsert: true` request on a *non-existent* object is evaluated
 * against the UPDATE policy and is rejected. So we insert first and only fall
 * back to overwriting when the object already exists.
 */
export async function uploadCompanyLogo(
  path: string,
  file: Blob | File
): Promise<string | null> {
  const contentType = file.type || 'image/png';
  const bucket = supabase.storage.from('company-logos');

  let { error } = await bucket.upload(path, file, { upsert: false, contentType });

  if (error) {
    // Object already there — overwrite it (UPDATE policy applies).
    const retry = await bucket.upload(path, file, { upsert: true, contentType });
    error = retry.error;
  }

  if (error) {
    console.warn('Company logo upload failed:', error.message);
    return null;
  }

  return bucket.getPublicUrl(path).data.publicUrl;
}

import { supabase } from '@/integrations/supabase/client';

const KEY = 'pending_signup_v1';

export type PendingJobSeeker = {
  kind: 'career_individual';
  country?: string;
  citizenship?: string;
  nationalId?: string;
  passportNumber?: string;
  gender?: string;
  dateOfBirth?: string;
  email?: string;
  firstName?: string;
};

export type PendingEmployer = {
  kind: 'organization';
  companyName: string;
  registrationNumber?: string;
  country?: string;
  industry?: string;
  phone?: string;
  website?: string;
  email?: string;
  logoDataUrl?: string;
  logoFileName?: string;
};

export type PendingSignup = PendingJobSeeker | PendingEmployer;

export function savePendingSignup(payload: PendingSignup) {
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to persist pending signup data:', e);
  }
}

export function clearPendingSignup() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export function readPendingSignup(): PendingSignup | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingSignup;
  } catch {
    return null;
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Flush pending signup form data collected before email verification.
 * Safe to call multiple times — clears storage after a successful flush.
 */
export async function flushPendingSignup(userId: string): Promise<void> {
  const pending = readPendingSignup();
  if (!pending) return;

  try {
    if (pending.kind === 'career_individual') {
      const updates: Record<string, unknown> = {};
      if (pending.country) updates.country = pending.country;
      if (pending.citizenship) updates.citizenship = pending.citizenship;
      if (pending.nationalId?.trim()) {
        updates.national_id = pending.nationalId.trim();
        updates.profile_complete = true;
      }
      if (pending.passportNumber?.trim()) updates.passport_number = pending.passportNumber.trim();
      if (pending.gender) updates.gender = pending.gender;
      if (pending.dateOfBirth) updates.date_of_birth = pending.dateOfBirth;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('profiles').update(updates).eq('user_id', userId);
        if (error) throw error;
      }
    } else if (pending.kind === 'organization') {
      // Wait for the DB trigger to have created the profile row
      for (let i = 0; i < 10; i++) {
        const { data: p } = await supabase.from('profiles').select('id').eq('user_id', userId).maybeSingle();
        if (p) break;
        await new Promise((r) => setTimeout(r, 300));
      }

      let logoUrl: string | null = null;
      if (pending.logoDataUrl && pending.logoFileName) {
        try {
          const blob = dataUrlToBlob(pending.logoDataUrl);
          const ext = pending.logoFileName.split('.').pop() || 'png';
          const path = `${userId}/logo.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('company-logos')
            .upload(path, blob, { upsert: true, contentType: blob.type });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(path);
            logoUrl = urlData.publicUrl;
          }
        } catch (e) {
          console.warn('Deferred logo upload failed:', e);
        }
      }

      await supabase
        .from('organization_profiles')
        .update({
          registration_number: pending.registrationNumber,
          country: pending.country,
          industry: pending.industry,
          phone: pending.phone,
          website: pending.website,
          ...(logoUrl && { logo_url: logoUrl }),
        })
        .eq('user_id', userId);

      // Only insert an employers row if one doesn't already exist
      const { data: existing } = await supabase
        .from('employers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        await supabase.from('employers').insert({
          user_id: userId,
          company_name: pending.companyName,
          registration_number: pending.registrationNumber,
          country: pending.country,
          industry: pending.industry,
          phone: pending.phone,
          website: pending.website,
          ...(logoUrl && { logo_url: logoUrl }),
        });
      }
    }

    clearPendingSignup();
  } catch (e) {
    console.warn('Failed to flush pending signup — will retry on next sign-in:', e);
  }
}

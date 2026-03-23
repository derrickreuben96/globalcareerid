import { jwtVerify, importSPKI } from 'jose';
import { supabase } from '@/integrations/supabase/client';

let cachedPublicKey: CryptoKey | null = null;

async function getPublicKey(): Promise<CryptoKey> {
  if (cachedPublicKey) return cachedPublicKey;

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/get-public-key`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch public key');
  }

  const { publicKey: pem } = await response.json();
  cachedPublicKey = await importSPKI(pem, 'ES256');
  return cachedPublicKey;
}

export async function verifyCredential(
  jwt: string
): Promise<{ valid: boolean; payload?: Record<string, unknown>; reason?: string }> {
  try {
    const publicKey = await getPublicKey();

    const { payload } = await jwtVerify(jwt, publicKey, {
      issuer: 'globalcareerid',
      algorithms: ['ES256'],
    });

    // Check revocation status in the credentials table
    const { data, error } = await supabase
      .from('credentials' as any)
      .select('revoked_at')
      .eq('signed_jwt', jwt)
      .maybeSingle();

    if (error) {
      return { valid: false, reason: 'Unable to verify revocation status' };
    }

    if (data && (data as any).revoked_at) {
      return { valid: false, reason: 'revoked' };
    }

    return { valid: true, payload: payload as Record<string, unknown> };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message.includes('expired')) {
      return { valid: false, reason: 'expired' };
    }
    if (message.includes('signature')) {
      return { valid: false, reason: 'invalid_signature' };
    }

    return { valid: false, reason: message };
  }
}

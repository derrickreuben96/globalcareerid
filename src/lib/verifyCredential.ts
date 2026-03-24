import { jwtVerify, importSPKI } from 'jose';

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

    // Check revocation via edge function (no direct DB access needed)
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/check-revocation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwt }),
      }
    );

    if (!response.ok) {
      return { valid: false, reason: 'Unable to verify revocation status' };
    }

    const { revoked } = await response.json();

    if (revoked) {
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

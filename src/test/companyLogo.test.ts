import { describe, it, expect, vi, beforeEach } from 'vitest';

const uploadMock = vi.fn();
const getPublicUrlMock = vi.fn(() => ({ data: { publicUrl: 'https://cdn.test/logo.png' } }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({ upload: uploadMock, getPublicUrl: getPublicUrlMock }),
    },
  },
}));

import { uploadCompanyLogo } from '@/lib/companyLogo';

const file = new Blob(['x'], { type: 'image/png' });

describe('uploadCompanyLogo', () => {
  beforeEach(() => {
    uploadMock.mockReset();
    getPublicUrlMock.mockClear();
  });

  it('inserts without upsert first and returns the public URL', async () => {
    uploadMock.mockResolvedValueOnce({ error: null });
    const url = await uploadCompanyLogo('user-1/logo.png', file);
    expect(url).toBe('https://cdn.test/logo.png');
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(uploadMock.mock.calls[0][2]).toMatchObject({ upsert: false });
  });

  it('retries with upsert when the object already exists', async () => {
    uploadMock
      .mockResolvedValueOnce({ error: { message: 'The resource already exists' } })
      .mockResolvedValueOnce({ error: null });
    const url = await uploadCompanyLogo('user-1/logo.png', file);
    expect(url).toBe('https://cdn.test/logo.png');
    expect(uploadMock).toHaveBeenCalledTimes(2);
    expect(uploadMock.mock.calls[1][2]).toMatchObject({ upsert: true });
  });

  it('returns null when both attempts fail', async () => {
    uploadMock.mockResolvedValue({ error: { message: 'denied' } });
    expect(await uploadCompanyLogo('user-1/logo.png', file)).toBeNull();
  });
});
